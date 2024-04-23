// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "hardhat/console.sol";

contract Multivesting is Ownable {
    using SafeERC20 for IERC20;

    // @notice Struct for Vesting
    // @param startedAt - Timestamp when vesting started
    // @param lastVestTimestamp - Timestamp when last vesting was done
    // @param totalMonth - Total months of vesting
    // @param tokenAmount - Amount of INF vested to the account
    struct Vesting {
        uint256 startedAt;
        uint256 lastVestTimestamp;
        uint256 totalMonth;
        uint256 tokenAmount;
        uint256 releasedTokenAmount;
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
    // @param _startedAt - Timestamp when first vesting started
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
            totalMonth: _totalMonth,
            tokenAmount: _tokenAmount,
            releasedTokenAmount: 0
        });

        token.safeTransferFrom(msg.sender, address(this), _tokenAmount);
        VestingMap[_beneficiary].push(v);
    }

    // @notice Claim
    // @notice Only beneficiary can claim
    // @notice beneficiary must have vesting
    function claim() external {
        address beneficiary = msg.sender;
        uint256 totalAvailableAmount = 0;
        uint256 totalVesting = VestingMap[beneficiary].length;

        require(
            totalVesting > 0,
            "No vesting schedule found for the beneficiary"
        );

        for (uint256 i = 0; i < totalVesting; i++) {
            Vesting storage vesting = VestingMap[beneficiary][i];

            // Calculate the amount of vested tokens based on the vesting schedule
            uint256 availableAmount = calculateVestedAmount(vesting);

            // Ensure that there are vested tokens to claim
            require(availableAmount > 0, "No vested tokens available for claim");

            // Update the last vesting timestamp
            vesting.lastVestTimestamp = block.timestamp;

            // Update the total released amount
            vesting.releasedTokenAmount += availableAmount;

            // Add available amount
            totalAvailableAmount += availableAmount;
        }

        // console.log(totalAvailableAmount / 1 ether);

        // Transfer the available amount to the beneficiary
        token.safeTransfer(beneficiary, totalAvailableAmount);
    }

    // @notice Calculate the amount of vested tokens based on the vesting schedule
    // @param vesting - Vesting schedule
    // @return uint256 - Amount of vested tokens
    function calculateVestedAmount(
        Vesting storage vesting
    ) internal view returns (uint256) {
        // Check if the vesting has started
        if (block.timestamp < vesting.startedAt) {
            return 0;
        }

        // Initiate calculation variable
        uint256 elapsedMonth = (block.timestamp - vesting.startedAt) /
            30 days;
        uint256 initialAmount = ((vesting.tokenAmount * 27) / 100);
        uint256 vestingAmount = initialAmount;
        uint256 tokenAmount_ = vesting.tokenAmount;

        // Return initial amount if elapsed month is no more than one
        if (elapsedMonth == 0) {
            return initialAmount;
        }

        // Add the rest of vesting calculation based on elapsed month
        for (uint i = 0 ; i < elapsedMonth ; i++) {
            vestingAmount += (tokenAmount_ - initialAmount) / vesting.totalMonth;
        }

        // Return amount after reduced by released amount
        return (vestingAmount - vesting.releasedTokenAmount);
    }
}
