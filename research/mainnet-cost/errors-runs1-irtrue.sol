// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Nile prototype with role-bound invitation secrets. Not audited. No real assets.
contract TakasV8Invite {
error NotDepositor();
error E1();
error E2();
error E3();
error E4();
error E5();
error E6();
error E7();
error E8();
error E9();
error E10();
error E11();
error E12();
error E13();
error E14();
error E15();
error E16();
error E17();
error E18();
error E19();
error E20();
error E21();
error E22();
error E23();
error E24();
error E25();
error E26();
error E27();
error E28();
error E29();
error E30();
error E31();
    address public immutable manager;
    uint256 public nextId = 1;
    uint256 private unlocked = 1;
    uint256 public constant DEPOSIT_WINDOW = 15 minutes;
    uint256 public constant FINAL_WINDOW = 5 minutes;
    struct Deal {
        address partyA; address partyB;
        address tokenA; address tokenB;
        uint256 amountA; uint256 amountB;
        uint256 feeAmount; uint8 feePayer;
        uint64 depositDeadline; uint64 finalDeadline;
        bool depositedA; bool depositedB;
        bool refundedA; bool refundedB;
        bool completed; bool cancelled;
        bytes32 inviteHashA; bytes32 inviteHashB;
    }
    mapping(uint256 => Deal) private deals;
    event Created(uint256 indexed id, uint8 feePayer, uint256 feeAmount);
    event Deposited(uint256 indexed id, uint8 role, address wallet, address token, uint256 amount);
    event Completed(uint256 indexed id);
    event Refunded(uint256 indexed id, uint8 role);
    modifier owner() { require(msg.sender == manager, E1()); _; }
    modifier guard() { require(unlocked == 1, E2()); unlocked = 2; _; unlocked = 1; }
    constructor() { manager = msg.sender; }
    function inviteVersion() external pure returns (uint8) { return 8; }

    function create(uint8 payer, uint256 amount, bytes32 inviteHashA, bytes32 inviteHashB) external owner returns (uint256 id) {
        require(inviteHashA != bytes32(0) && inviteHashB != bytes32(0) && inviteHashA != inviteHashB, E3());
        require(payer <= 2, E4());
        require(payer != 0 || amount == 0, E5());
        id = nextId++;
        Deal storage d = deals[id];
        d.feePayer = payer; d.feeAmount = amount;
        d.inviteHashA = inviteHashA; d.inviteHashB = inviteHashB;
        emit Created(id, payer, amount);
    }

    /// @dev Each participant must present the unguessable secret sent in their own invitation.
    ///      First deposit binds that wallet and starts the 15-minute funding window.
    function deposit(uint256 id, uint8 role, address token, uint256 amount, bytes32 inviteSecret) external payable guard {
        require(id > 0 && id < nextId, E6());
        Deal storage d = deals[id];
        require(!d.cancelled && !d.completed, E7());
        require(msg.sender != manager && (role == 1 || role == 2), E8());
        require(sha256(abi.encodePacked(inviteSecret)) == (role == 1 ? d.inviteHashA : d.inviteHashB), E9());
        require(amount > 0 && (token == address(0) || token.code.length > 0), E10());
        require(d.depositDeadline == 0 || block.timestamp < d.depositDeadline, E11());
        require(d.finalDeadline == 0, E12());
        if (role == 1) {
            require(!d.depositedA && msg.sender != d.partyB, E13());
        } else {
            require(!d.depositedB && msg.sender != d.partyA, E14());
        }
        if (d.feePayer == role) { require(d.feeAmount < amount, E15()); if (d.feeAmount > 0) require(token == address(0), E16()); }
        _receive(token, amount);
        if (role == 1) {
            d.partyA = msg.sender; d.tokenA = token; d.amountA = amount; d.depositedA = true;
        } else {
            d.partyB = msg.sender; d.tokenB = token; d.amountB = amount; d.depositedB = true;
        }
        if (d.depositDeadline == 0) d.depositDeadline = uint64(block.timestamp + DEPOSIT_WINDOW);
        if (d.depositedA && d.depositedB) d.finalDeadline = uint64(block.timestamp + FINAL_WINDOW);
        emit Deposited(id, role, msg.sender, token, amount);
    }

    function finalize(uint256 id) external owner guard {
        Deal storage d = _deal(id);
        require(!d.cancelled && !d.completed && d.depositedA && d.depositedB, E17());
        require(d.finalDeadline != 0 && block.timestamp < d.finalDeadline, E18());
        uint256 feeA = d.feePayer == 1 ? d.feeAmount : 0;
        uint256 feeB = d.feePayer == 2 ? d.feeAmount : 0;
        d.completed = true;
        _send(d.tokenA, d.partyB, d.amountA - feeA);
        _send(d.tokenB, d.partyA, d.amountB - feeB);
        if (feeA > 0) _send(d.tokenA, manager, feeA);
        if (feeB > 0) _send(d.tokenB, manager, feeB);
        emit Completed(id);
    }

    function refund(uint256 id) external guard {
        Deal storage d = _deal(id);
        require(!d.completed && d.depositDeadline != 0, E19());
        require(block.timestamp >= (d.finalDeadline != 0 ? d.finalDeadline : d.depositDeadline), E20());
        if (msg.sender == d.partyA) {
            require(d.depositedA && !d.refundedA, E21());
            d.refundedA = true; _send(d.tokenA, msg.sender, d.amountA); emit Refunded(id, 1);
        } else if (msg.sender == d.partyB) {
            require(d.depositedB && !d.refundedB, E22());
            d.refundedB = true; _send(d.tokenB, msg.sender, d.amountB); emit Refunded(id, 2);
        } else revert NotDepositor();
    }

    function cancelUnused(uint256 id) external owner {
        Deal storage d = _deal(id);
        require(!d.depositedA && !d.depositedB && !d.completed, E23());
        d.cancelled = true;
    }
    function getDeal(uint256 id) external view returns (Deal memory) { return _deal(id); }
    function _deal(uint256 id) private view returns (Deal storage d) {
        require(id > 0 && id < nextId, E24()); d = deals[id];
    }
    function _receive(address token, uint256 amount) private {
        if (token == address(0)) require(msg.value == amount, E25());
        else {
            require(msg.value == 0, E26());
            uint256 beforeBal = _balance(token, address(this));
            _call(token, abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), amount));
            require(_balance(token, address(this)) - beforeBal == amount, E27());
        }
    }
    function _send(address token, address to, uint256 amount) private {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool ok,) = payable(to).call{value:amount}("");
            require(ok, E28());
        } else {
            uint256 beforeBal = _balance(token, to);
            _call(token, abi.encodeWithSelector(0xa9059cbb, to, amount));
            require(_balance(token, to) - beforeBal == amount, E29());
        }
    }
    function _balance(address token, address who) private view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(0x70a08231, who));
        require(ok && data.length >= 32, E30());
        return abi.decode(data, (uint256));
    }
    function _call(address token, bytes memory data) private {
        (bool ok, bytes memory result) = token.call(data);
        require(ok && (result.length == 0 || (result.length >= 32 && abi.decode(result, (bool)))), E31());
    }
}
