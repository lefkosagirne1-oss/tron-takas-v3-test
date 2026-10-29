// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TakasV5FixedFee
 * @notice Nile-only prototype; NOT audited, deployed, or approved for real funds.
 * @dev The manager does not enter token amounts or participant wallet addresses.
 *      Participants request slots and the manager confirms both wallets BEFORE
 *      offers or deposits. A link / query parameter is NOT authentication.
 *      Fees are disclosed before deposits, and only charged on completion.
 */
contract TakasV5FixedFee {
    uint256 public constant OFFER_WINDOW = 1 days;
    uint256 public constant DEPOSIT_WINDOW = 15 minutes;
    uint256 public constant SETTLEMENT_WINDOW = 5 minutes;

    address public immutable manager;
    uint256 public nextId = 1;
    uint256 private unlocked = 1;

    struct Swap {
        address partyA;
        address partyB;
        address tokenA; // address(0) = native TRX
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        uint64 offerDeadline;
        uint64 depositDeadline;
        uint64 settlementDeadline;
        uint256 feeAmount; // Raw smallest units of payer asset
        uint8 feePayer; // 0 = none, 1 = A, 2 = B
        address feeAsset; // asset that payer MUST offer; zero address = TRX
        bool walletsConfirmed;
        bool proposedA;
        bool proposedB;
        bool acceptedA;
        bool acceptedB;
        bool depositedA;
        bool depositedB;
        bool refundedA;
        bool refundedB;
        bool completed;
        bool cancelled;
    }
    mapping(uint256 => Swap) private swaps;

    event InviteCreated(uint256 indexed id, uint256 feeAmount, uint8 feePayer);
    event ParticipantRequested(uint256 indexed id, uint8 role, address wallet);
    event ParticipantsConfirmed(uint256 indexed id, address partyA, address partyB);
    event OfferUpdated(uint256 indexed id, uint8 role, address token, uint256 amount);
    event TermsAccepted(uint256 indexed id, uint8 role);
    event DepositReceived(uint256 indexed id, uint8 role);
    event SwapCompleted(uint256 indexed id, uint256 fee, address feeAsset);
    event DepositRefunded(uint256 indexed id, uint8 role);
    event InviteCancelled(uint256 indexed id);

    modifier onlyManager() { require(msg.sender == manager, "Manager only"); _; }
    modifier locked() {
        require(unlocked == 1, "Reentrant call");
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor() { manager = msg.sender; }

    function createInvite(uint256 feeAmount, uint8 feePayer, address feeAsset)
        external onlyManager returns (uint256 id)
    {
        require(feePayer <= 2, "Invalid fee payer");
        require((feeAmount == 0) == (feePayer == 0), "Invalid zero-fee rule");
        require(feePayer != 0 || feeAsset == address(0), "No fee asset expected");
        require(feePayer == 0 || feeAsset == address(0) || feeAsset.code.length > 0, "Invalid fee asset");
        id = nextId++;
        Swap storage s = swaps[id];
        s.feeAmount = feeAmount;
        s.feePayer = feePayer;
        s.feeAsset = feeAsset;
        emit InviteCreated(id, feeAmount, feePayer);
    }

    /// @dev Slot request is NOT acceptance. Manager must verify wallet identities
    ///      separately and call confirmParticipants before any deposit is possible.
    function requestRole(uint256 id, uint8 role) external {
        Swap storage s = _swap(id);
        require(!s.cancelled && !s.walletsConfirmed, "Registration closed");
        require(msg.sender != manager, "Manager cannot join");
        require(role == 1 || role == 2, "Unknown role");
        if (role == 1) {
            require(s.partyA == address(0), "A slot requested");
            require(msg.sender != s.partyB, "Same wallet");
            s.partyA = msg.sender;
        } else {
            require(s.partyB == address(0), "B slot requested");
            require(msg.sender != s.partyA, "Same wallet");
            s.partyB = msg.sender;
        }
        emit ParticipantRequested(id, role, msg.sender);
    }

    /// @dev Manager can reject bad requests before either wallet is confirmed.
    function rejectRequests(uint256 id) external onlyManager {
        Swap storage s = _swap(id);
        require(!s.walletsConfirmed && !s.cancelled, "Registration locked");
        s.partyA = address(0);
        s.partyB = address(0);
    }

    function confirmParticipants(uint256 id) external onlyManager {
        Swap storage s = _swap(id);
        require(!s.cancelled && !s.walletsConfirmed, "Already confirmed");
        require(s.partyA != address(0) && s.partyB != address(0) && s.partyA != s.partyB, "Two wallets required");
        s.walletsConfirmed = true;
        s.offerDeadline = uint64(block.timestamp + OFFER_WINDOW);
        emit ParticipantsConfirmed(id, s.partyA, s.partyB);
    }

    function propose(uint256 id, address token, uint256 amount) external {
        Swap storage s = _swap(id);
        require(s.walletsConfirmed && !s.cancelled, "Not ready");
        require(block.timestamp < s.offerDeadline && s.depositDeadline == 0, "Offers closed");
        require(amount > 0, "Zero amount");
        require(token == address(0) || token.code.length > 0, "Invalid token");
        if (msg.sender == s.partyA) {
            s.tokenA = token;
            s.amountA = amount;
            s.proposedA = true;
        } else if (msg.sender == s.partyB) {
            s.tokenB = token;
            s.amountB = amount;
            s.proposedB = true;
        } else revert("Not a participant");
        // Any amended offer requires BOTH sides to accept the updated terms.
        s.acceptedA = false;
        s.acceptedB = false;
        emit OfferUpdated(id, msg.sender == s.partyA ? 1 : 2, token, amount);
    }

    function acceptTerms(uint256 id) external {
        Swap storage s = _swap(id);
        require(s.walletsConfirmed && !s.cancelled && s.depositDeadline == 0, "Offers not open");
        require(block.timestamp < s.offerDeadline, "Offer expired");
        require(s.proposedA && s.proposedB, "Both proposals required");
        require(s.tokenA != s.tokenB, "Different assets required");
        require(s.feePayer == 0 || (s.feePayer == 1 ? s.tokenA : s.tokenB) == s.feeAsset, "Fee asset mismatch");
        // Reject impossible fixed fees before deposits become possible.
        require(s.feePayer != 1 || s.feeAmount < s.amountA, "Fee exceeds A deposit");
        require(s.feePayer != 2 || s.feeAmount < s.amountB, "Fee exceeds B deposit");
        uint8 role;
        if (msg.sender == s.partyA) { s.acceptedA = true; role = 1; }
        else if (msg.sender == s.partyB) { s.acceptedB = true; role = 2; }
        else revert("Not a participant");
        emit TermsAccepted(id, role);
        if (s.acceptedA && s.acceptedB) {
            s.depositDeadline = uint64(block.timestamp + DEPOSIT_WINDOW);
        }
    }

    function deposit(uint256 id) external payable locked {
        Swap storage s = _swap(id);
        require(s.depositDeadline != 0 && !s.cancelled && !s.completed, "Not active");
        require(block.timestamp < s.depositDeadline && s.settlementDeadline == 0, "Deposit window closed");
        if (msg.sender == s.partyA) {
            require(!s.depositedA, "Already deposited");
            s.depositedA = true;
            _receiveAsset(s.tokenA, s.amountA);
            emit DepositReceived(id, 1);
        } else if (msg.sender == s.partyB) {
            require(!s.depositedB, "Already deposited");
            s.depositedB = true;
            _receiveAsset(s.tokenB, s.amountB);
            emit DepositReceived(id, 2);
        } else revert("Not a participant");
        if (s.depositedA && s.depositedB) {
            s.settlementDeadline = uint64(block.timestamp + SETTLEMENT_WINDOW);
        }
    }

    function finalize(uint256 id) external onlyManager locked {
        Swap storage s = _swap(id);
        require(!s.cancelled && !s.completed, "Closed");
        require(s.depositedA && s.depositedB && s.acceptedA && s.acceptedB, "Not fully funded");
        require(s.settlementDeadline != 0 && block.timestamp < s.settlementDeadline, "Settlement expired");
        uint256 fee = s.feePayer == 0 ? 0 : s.feeAmount;
        require(s.feePayer != 1 || fee < s.amountA, "Fee exceeds A deposit");
        require(s.feePayer != 2 || fee < s.amountB, "Fee exceeds B deposit");
        s.completed = true; // State before external transfers; revert is atomic.
        if (s.feePayer == 1) {
            _sendAsset(s.tokenA, s.partyB, s.amountA - fee);
            _sendAsset(s.tokenA, manager, fee);
            _sendAsset(s.tokenB, s.partyA, s.amountB);
        } else if (s.feePayer == 2) {
            _sendAsset(s.tokenA, s.partyB, s.amountA);
            _sendAsset(s.tokenB, s.partyA, s.amountB - fee);
            _sendAsset(s.tokenB, manager, fee);
        } else {
            _sendAsset(s.tokenA, s.partyB, s.amountA);
            _sendAsset(s.tokenB, s.partyA, s.amountB);
        }
        emit SwapCompleted(id, fee, s.feePayer == 1 ? s.tokenA : s.tokenB);
    }

    function refund(uint256 id) external locked {
        Swap storage s = _swap(id);
        require(!s.completed, "Already settled");
        require(
            (s.depositDeadline != 0 && s.settlementDeadline == 0 && block.timestamp >= s.depositDeadline) ||
            (s.settlementDeadline != 0 && block.timestamp >= s.settlementDeadline),
            "Refund not unlocked"
        );
        if (msg.sender == s.partyA) {
            require(s.depositedA && !s.refundedA, "No refundable A deposit");
            s.refundedA = true;
            _sendAsset(s.tokenA, msg.sender, s.amountA);
            emit DepositRefunded(id, 1);
        } else if (msg.sender == s.partyB) {
            require(s.depositedB && !s.refundedB, "No refundable B deposit");
            s.refundedB = true;
            _sendAsset(s.tokenB, msg.sender, s.amountB);
            emit DepositRefunded(id, 2);
        } else revert("Not a participant");
    }

    /// @notice Cancel only if NO deposits have been received.
    function cancelUnused(uint256 id) external onlyManager {
        Swap storage s = _swap(id);
        require(!s.depositedA && !s.depositedB && !s.completed && !s.cancelled, "Deposits or closed");
        s.cancelled = true;
        emit InviteCancelled(id);
    }

    function getSwap(uint256 id) external view returns (Swap memory) {
        return _swap(id);
    }

    function preview(uint256 id) external view returns (
        uint256 fee, uint256 netForA, uint256 netForB
    ) {
        Swap storage s = _swap(id);
        require(s.proposedA && s.proposedB, "Offers missing");
        fee = s.feePayer == 0 ? 0 : s.feeAmount;
        require(s.feePayer != 1 || fee < s.amountA, "Fee exceeds A deposit");
        require(s.feePayer != 2 || fee < s.amountB, "Fee exceeds B deposit");
        netForA = s.amountB - (s.feePayer == 2 ? fee : 0);
        netForB = s.amountA - (s.feePayer == 1 ? fee : 0);
    }

    function _swap(uint256 id) internal view returns (Swap storage s) {
        require(id > 0 && id < nextId, "Unknown invite");
        s = swaps[id];
    }

    function _receiveAsset(address token, uint256 amount) private {
        if (token == address(0)) {
            require(msg.value == amount, "Incorrect TRX");
        } else {
            require(msg.value == 0, "TRX not expected");
            uint256 beforeBal = _balanceOf(token, address(this));
            _safeCall(token, abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), amount));
            require(_balanceOf(token, address(this)) - beforeBal == amount, "Transfer amount mismatch");
        }
    }

    function _sendAsset(address token, address recipient, uint256 amount) private {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool ok,) = payable(recipient).call{value: amount}("");
            require(ok, "TRX transfer failed");
        } else {
            // Reject fee-on-transfer / deflationary outgoing tokens. A successful
            // TRC20 call is NOT proof that the recipient received the full amount.
            uint256 beforeBal = _balanceOf(token, recipient);
            _safeCall(token, abi.encodeWithSelector(0xa9059cbb, recipient, amount));
            uint256 afterBal = _balanceOf(token, recipient);
            require(afterBal >= beforeBal && afterBal - beforeBal == amount, "Recipient amount mismatch");
        }
    }

    function _balanceOf(address token, address account) private view returns (uint256 bal) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(0x70a08231, account));
        require(ok && data.length >= 32, "Token balance failed");
        bal = abi.decode(data, (uint256));
    }

    function _safeCall(address token, bytes memory callData) private {
        (bool ok, bytes memory data) = token.call(callData);
        require(ok && (data.length == 0 || (data.length >= 32 && abi.decode(data, (bool)))), "Token call failed");
    }
}
