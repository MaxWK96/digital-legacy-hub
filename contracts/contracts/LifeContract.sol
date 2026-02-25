// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LifeContract
 * @notice Digital Executor — autonomous crypto estate management
 * @dev Owner sends heartbeat pings. If inactive beyond threshold, heirs can
 *      call executeEstate() to transfer assets automatically.
 *      Chainlink CRE monitors inactivity and writes on-chain verdicts.
 *      World ID nullifier hashes verify heir identity (Sybil-resistant).
 */
contract LifeContract {
    // =========================================================================
    // Types
    // =========================================================================

    struct Heir {
        address payable wallet;
        uint256 allocationBps;  // basis points: 10000 = 100%
        uint256 nullifierHash;  // World ID nullifier (0 = unverified)
        bool    isVerified;     // World ID verified flag
    }

    // =========================================================================
    // State
    // =========================================================================

    address public owner;
    uint256 public lastPing;     // unix timestamp of most recent heartbeat
    uint256 public threshold;    // inactivity period in seconds
    bool    public executed;     // true after estate has been distributed

    Heir[]  private _heirs;
    mapping(address => bool) public isHeir;
    mapping(uint256 => bool) private _usedNullifiers; // prevent double-registration

    // =========================================================================
    // Events
    // =========================================================================

    event HeartbeatReceived(uint256 indexed timestamp, address indexed caller);
    event EstateExecuted(uint256 indexed timestamp, uint256 totalValue, uint256 heirCount);
    event HeirAdded(address indexed heir, uint256 allocationBps);
    event HeirRegistered(address indexed heir, uint256 nullifierHash);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // =========================================================================
    // Modifiers
    // =========================================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "LifeContract: not owner");
        _;
    }

    modifier notExecuted() {
        require(!executed, "LifeContract: estate already executed");
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================

    /**
     * @param thresholdDays  Number of days of inactivity before estate can be executed
     */
    constructor(uint256 thresholdDays) {
        require(thresholdDays > 0, "LifeContract: threshold must be > 0");
        owner     = msg.sender;
        threshold = thresholdDays * 1 days;
        lastPing  = block.timestamp;
    }

    // =========================================================================
    // Owner Functions
    // =========================================================================

    /**
     * @notice Owner proves they are alive by calling ping().
     *         Resets the inactivity timer.
     */
    function ping() external onlyOwner notExecuted {
        lastPing = block.timestamp;
        emit HeartbeatReceived(block.timestamp, msg.sender);
    }

    /**
     * @notice Add a new heir with an allocation.
     * @param heir_          Heir wallet address
     * @param allocationBps_ Share in basis points (100 = 1%)
     */
    function addHeir(address payable heir_, uint256 allocationBps_) external onlyOwner notExecuted {
        require(heir_ != address(0),  "LifeContract: zero address");
        require(!isHeir[heir_],       "LifeContract: already an heir");
        require(allocationBps_ > 0 && allocationBps_ <= 10000, "LifeContract: invalid allocation");

        uint256 totalBps = 0;
        for (uint256 i = 0; i < _heirs.length; i++) {
            totalBps += _heirs[i].allocationBps;
        }
        require(totalBps + allocationBps_ <= 10000, "LifeContract: total allocation > 100%");

        _heirs.push(Heir({
            wallet:       heir_,
            allocationBps: allocationBps_,
            nullifierHash: 0,
            isVerified:   false
        }));
        isHeir[heir_] = true;

        emit HeirAdded(heir_, allocationBps_);
    }

    /**
     * @notice Update the inactivity threshold.
     */
    function setThreshold(uint256 thresholdDays) external onlyOwner notExecuted {
        require(thresholdDays > 0, "LifeContract: threshold must be > 0");
        uint256 old = threshold;
        threshold = thresholdDays * 1 days;
        emit ThresholdUpdated(old, threshold);
    }

    // =========================================================================
    // Heir Registration (World ID)
    // =========================================================================

    /**
     * @notice Register an heir with their World ID nullifier hash.
     *         Callable by the heir themselves or the owner.
     * @param heir_          Heir wallet address
     * @param nullifierHash_ World ID nullifier hash (prevents Sybil)
     */
    function registerHeir(address heir_, uint256 nullifierHash_) external notExecuted {
        require(isHeir[heir_],                          "LifeContract: not an heir");
        require(msg.sender == heir_ || msg.sender == owner, "LifeContract: not authorized");
        require(nullifierHash_ != 0,                    "LifeContract: invalid nullifier");
        require(!_usedNullifiers[nullifierHash_],        "LifeContract: nullifier already used");

        _usedNullifiers[nullifierHash_] = true;

        for (uint256 i = 0; i < _heirs.length; i++) {
            if (_heirs[i].wallet == payable(heir_)) {
                _heirs[i].nullifierHash = nullifierHash_;
                _heirs[i].isVerified   = true;
                emit HeirRegistered(heir_, nullifierHash_);
                break;
            }
        }
    }

    // =========================================================================
    // Estate Execution
    // =========================================================================

    /**
     * @notice Execute the estate when owner has been inactive beyond threshold.
     *         Anyone can call this — trustless automation.
     *         Chainlink CRE also triggers this indirectly via on-chain verdict.
     */
    function executeEstate() external notExecuted {
        require(
            block.timestamp > lastPing + threshold,
            "LifeContract: owner is still active"
        );
        require(_heirs.length > 0, "LifeContract: no heirs registered");

        executed = true;
        uint256 totalValue = address(this).balance;

        for (uint256 i = 0; i < _heirs.length; i++) {
            if (_heirs[i].allocationBps > 0 && totalValue > 0) {
                uint256 amount = (totalValue * _heirs[i].allocationBps) / 10000;
                if (amount > 0) {
                    (bool ok,) = _heirs[i].wallet.call{value: amount}("");
                    require(ok, "LifeContract: transfer failed");
                }
            }
        }

        emit EstateExecuted(block.timestamp, totalValue, _heirs.length);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    function getDaysElapsed() external view returns (uint256) {
        return (block.timestamp - lastPing) / 1 days;
    }

    function getThresholdDays() external view returns (uint256) {
        return threshold / 1 days;
    }

    function isInactive() external view returns (bool) {
        return block.timestamp > lastPing + threshold;
    }

    function getHeirsCount() external view returns (uint256) {
        return _heirs.length;
    }

    function getHeir(uint256 index) external view returns (
        address wallet,
        uint256 allocationBps,
        uint256 nullifierHash,
        bool    isVerified
    ) {
        require(index < _heirs.length, "LifeContract: index out of bounds");
        Heir memory h = _heirs[index];
        return (h.wallet, h.allocationBps, h.nullifierHash, h.isVerified);
    }

    function getStatus() external view returns (
        uint256 lastPing_,
        uint256 threshold_,
        uint256 daysElapsed,
        uint256 thresholdDays,
        bool    inactive
    ) {
        return (
            lastPing,
            threshold,
            (block.timestamp - lastPing) / 1 days,
            threshold / 1 days,
            block.timestamp > lastPing + threshold
        );
    }

    // =========================================================================
    // Receive ETH
    // =========================================================================

    receive() external payable {}
    fallback() external payable {}
}
