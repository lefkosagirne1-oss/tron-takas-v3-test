// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Nile prototype. Not audited. No real assets.
contract TakasV6Simple {
    address public immutable manager;
    uint256 public nextId = 1;
    uint256 private unlocked = 1;
    uint256 public constant DEPOSIT_WINDOW = 15 minutes;
    uint256 public constant FINAL_WINDOW = 5 minutes;
    struct Deal {
        address partyA; address partyB;
        address tokenA; address tokenB;
        uint256 amountA; uint256 amountB;
        uint256 feeBps; uint8 feePayer;
        uint64 depositDeadline; uint64 finalDeadline;
        bool depositedA; bool depositedB;
        bool refundedA; bool refundedB;
        bool completed; bool cancelled;
    }
    mapping(uint256 => Deal) private deals;
    event Created(uint256 indexed id, uint8 feePayer, uint256 feeBps);
    event Deposited(uint256 indexed id, uint8 role, address wallet, address token, uint256 amount);
    event Completed(uint256 indexed id);
    event Refunded(uint256 indexed id, uint8 role);
    modifier owner() { require(msg.sender == manager, "Manager only"); _; }
    modifier guard() { require(unlocked == 1, "Reentrancy"); unlocked = 2; _; unlocked = 1; }
    constructor() { manager = msg.sender; }

    function create(address walletA, address walletB, uint8 payer, uint256 bps) external owner returns (uint256 id) {
        require(walletA != address(0) && walletB != address(0) && walletA != walletB, "Invalid wallets");
        require(walletA != manager && walletB != manager, "Manager cannot deposit");
        require(payer <= 2 && bps <= 1000, "Invalid fee");
        require(payer != 0 || bps == 0, "Fee payer required");
        id = nextId++;
        Deal storage d = deals[id];
        d.partyA = walletA; d.partyB = walletB;
        d.feePayer = payer; d.feeBps = bps;
        emit Created(id, payer, bps);
    }

    /// @dev Wallets are bound at creation: a forwarded invite URL cannot steal a slot.
    ///      First deposit starts the 15-minute funding window.
    function deposit(uint256 id, uint8 role, address token, uint256 amount) external payable guard {
        require(id > 0 && id < nextId, "Unknown deal");
        Deal storage d = deals[id];
        require(!d.cancelled && !d.completed, "Closed");
        require((role == 1 && msg.sender == d.partyA) || (role == 2 && msg.sender == d.partyB), "Wallet not authorized");
        require(amount > 0 && (token == address(0) || token.code.length > 0), "Invalid asset");
        require(d.depositDeadline == 0 || block.timestamp < d.depositDeadline, "Deposit expired");
        require(d.finalDeadline == 0, "Both deposited");
        if (role == 1) {
            require(!d.depositedA && msg.sender != d.partyB, "A unavailable");
            if (d.depositedB) require(token != d.tokenB, "Assets must differ");
        } else {
            require(!d.depositedB && msg.sender != d.partyA, "B unavailable");
            if (d.depositedA) require(token != d.tokenA, "Assets must differ");
        }
        if (d.feePayer == role) require(amount * d.feeBps / 10000 < amount, "Fee exceeds amount");
        _receive(token, amount);
        if (role == 1) {
            d.tokenA = token; d.amountA = amount; d.depositedA = true;
        } else {
            d.tokenB = token; d.amountB = amount; d.depositedB = true;
        }
        if (d.depositDeadline == 0) d.depositDeadline = uint64(block.timestamp + DEPOSIT_WINDOW);
        if (d.depositedA && d.depositedB) d.finalDeadline = uint64(block.timestamp + FINAL_WINDOW);
        emit Deposited(id, role, msg.sender, token, amount);
    }

    function finalize(uint256 id) external owner guard {
        Deal storage d = _deal(id);
        require(!d.cancelled && !d.completed && d.depositedA && d.depositedB, "Not ready");
        require(d.finalDeadline != 0 && block.timestamp < d.finalDeadline, "Final window expired");
        uint256 feeA = d.feePayer == 1 ? d.amountA * d.feeBps / 10000 : 0;
        uint256 feeB = d.feePayer == 2 ? d.amountB * d.feeBps / 10000 : 0;
        d.completed = true;
        _send(d.tokenA, d.partyB, d.amountA - feeA);
        _send(d.tokenB, d.partyA, d.amountB - feeB);
        if (feeA > 0) _send(d.tokenA, manager, feeA);
        if (feeB > 0) _send(d.tokenB, manager, feeB);
        emit Completed(id);
    }

    function refund(uint256 id) external guard {
        Deal storage d = _deal(id);
        require(!d.completed && d.depositDeadline != 0, "Not refundable");
        require(block.timestamp >= (d.finalDeadline != 0 ? d.finalDeadline : d.depositDeadline), "Not expired");
        if (msg.sender == d.partyA) {
            require(d.depositedA && !d.refundedA, "No A refund");
            d.refundedA = true; _send(d.tokenA, msg.sender, d.amountA); emit Refunded(id, 1);
        } else if (msg.sender == d.partyB) {
            require(d.depositedB && !d.refundedB, "No B refund");
            d.refundedB = true; _send(d.tokenB, msg.sender, d.amountB); emit Refunded(id, 2);
        } else revert("Not a depositor");
    }

    function cancelUnused(uint256 id) external owner {
        Deal storage d = _deal(id);
        require(!d.depositedA && !d.depositedB && !d.completed, "Already used");
        d.cancelled = true;
    }
    function getDeal(uint256 id) external view returns (Deal memory) { return _deal(id); }
    function _deal(uint256 id) private view returns (Deal storage d) {
        require(id > 0 && id < nextId, "Unknown deal"); d = deals[id];
    }
    function _receive(address token, uint256 amount) private {
        if (token == address(0)) require(msg.value == amount, "Wrong TRX amount");
        else {
            require(msg.value == 0, "Unexpected TRX");
            uint256 beforeBal = _balance(token, address(this));
            _call(token, abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), amount));
            require(_balance(token, address(this)) - beforeBal == amount, "Received amount mismatch");
        }
    }
    function _send(address token, address to, uint256 amount) private {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool ok,) = payable(to).call{value:amount}("");
            require(ok, "TRX send failed");
        } else {
            uint256 beforeBal = _balance(token, to);
            _call(token, abi.encodeWithSelector(0xa9059cbb, to, amount));
            require(_balance(token, to) - beforeBal == amount, "Recipient amount mismatch");
        }
    }
    function _balance(address token, address who) private view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(0x70a08231, who));
        require(ok && data.length >= 32, "Balance read failed");
        return abi.decode(data, (uint256));
    }
    function _call(address token, bytes memory data) private {
        (bool ok, bytes memory result) = token.call(data);
        require(ok && (result.length == 0 || (result.length >= 32 && abi.decode(result, (bool)))), "Token transfer failed");
    }
}
