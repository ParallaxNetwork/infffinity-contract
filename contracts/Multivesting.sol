// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Multivesting is Ownable {
    using SafeERC20 for IERC20;

    // @notice Struct for Vesting
    // @param startedAt - Timestamp when vesting started
    // @param lastVestTimestamp - Timestamp when last vesting was done
    // @param totalMonth - Total months of vesting
    struct Vesting {
        uint256 startedAt;
        uint256 lastVestTimestamp;
        uint256 totalMonth;
    }

    // @notice INF Token address
    IERC20 public token;

    // @notice Mapping of address for Vesting
    mapping(address => Vesting[]) public VestingMap;

    // @notice Constructor
    // @param _token - Token address
    constructor(address initialOwner, IERC20 _token) Ownable(initialOwner) {
        token = _token;
    }

    // @notice Add vesting
    // @param _beneficiary - Beneficiary address
    // @param _tokenAmount - Amount of INF
    // @param _totalMonth - Total months of vesting
    // @param _startedAt - Timestamp when vesting started
    // @notice Only owner can add vesting
    // @notice Token amount must be greater than 0
    // @notice Total month must be greater than 0
    function addVesting(
        address _beneficiary,
        uint256 _tokenAmount,
        uint256 _totalMonth,
        uint256 _startedAt
    ) public onlyOwner {
        require(_tokenAmount > 0, "Token amount must be greater than 0");
        require(_totalMonth > 0, "Total month must be greater than 0");

        uint256 available = token.balanceOf(msg.sender);
        require(available >= _tokenAmount, "DON_T_HAVE_ENOUGH_INF");

        Vesting memory v = Vesting({
            startedAt: _startedAt,
            lastVestTimestamp: 0,
            totalMonth: _totalMonth
        });

        token.safeTransferFrom(msg.sender, address(this), _tokenAmount);
        VestingMap[_beneficiary].push(v);
    }

    // @notice Claim
    // @notice Only beneficiary can claim
    // @notice beneficiary must have vesting
    function claim() external {
        address beneficiary = msg.sender;
        uint256 totalVesting = VestingMap[beneficiary].length;

        require(
            totalVesting > 0,
            "No vesting schedule found for the beneficiary"
        );

        for (uint256 i = 0; i < totalVesting; i++) {
            Vesting storage vesting = VestingMap[beneficiary][i];

            // Calculate the amount of vested tokens based on the vesting schedule
            uint256 vestedAmount = calculateVestedAmount(vesting);

            // Ensure that there are vested tokens to claim
            require(vestedAmount > 0, "No vested tokens available for claim");

            // Update the last vesting timestamp
            vesting.lastVestTimestamp = block.timestamp;

            // Transfer the vested tokens to the beneficiary
            token.safeTransfer(beneficiary, vestedAmount);
        }
    }

    // @notice Calculate the amount of vested tokens based on the vesting schedule
    // @param vesting - Vesting schedule
    // @return uint256 - Amount of vested tokens
    function calculateVestedAmount(
        Vesting storage vesting
    ) internal view returns (uint256) {
        uint256 elapsedTime = block.timestamp - vesting.startedAt;
        uint256 vestingDuration = vesting.totalMonth * 30 days;

        // Calculate the vested percentage based on elapsed time and total vesting duration
        uint256 vestedPercentage = (elapsedTime * 100) / vestingDuration;

        // Ensure vested percentage does not exceed 100%
        if (vestedPercentage > 100) {
            vestedPercentage = 100;
        }

        // Calculate the vested amount
        uint256 vestedAmount = (vestedPercentage *
            token.balanceOf(address(this))) / 100;

        // Exclude already claimed amount
        if (vesting.lastVestTimestamp > 0) {
            uint256 lastVestElapsedTime = block.timestamp -
                vesting.lastVestTimestamp;
            uint256 lastVestPercentage = (lastVestElapsedTime * 100) /
                vestingDuration;
            uint256 lastVestAmount = (lastVestPercentage *
                token.balanceOf(address(this))) / 100;

            vestedAmount -= lastVestAmount;
        }

        return vestedAmount;
    }
}
