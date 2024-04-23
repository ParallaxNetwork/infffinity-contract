import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network, upgrades } from "hardhat";
import logdown from "logdown";

describe("Multivesting", function () {
  async function fixture() {
    const [owner, beneficiary] = await ethers.getSigners();

    const infffinityContract = await ethers.getContractFactory('Infffinity')
    const infffinity = await upgrades.deployProxy(infffinityContract, [owner.address, owner.address, owner.address], { initializer: 'initialize', kind: 'uups' })
    await infffinity.waitForDeployment()
    const infAddress = await infffinity.getAddress()

    const Multivesting = await ethers.getContractFactory("Multivesting");
    const multivesting = await Multivesting.deploy(owner.address, infAddress);

    return { multivesting, infffinity, owner, beneficiary };
  }

  it("Should add vesting", async function () {
    const { multivesting, infffinity, owner, beneficiary } = await loadFixture(fixture);

    // @dev check address
    let logger = logdown("Address");
    logger.state.isEnabled = true;
    logger.info(`Owner \`${owner.address}\``);
    logger.info(`Beneficiary \`${beneficiary.address}\``);
    logger.info(`Multivesting \`${await multivesting.getAddress()}\``);
    logger.info(`Infffinity \`${await infffinity.getAddress()}\``);

    const tokenAmount = ethers.parseEther("10000");
    const totalMonth = 12;
    const startedAt = Math.floor(Date.now() / 1000);

    // @dev check variables
    logger = logdown("Variables");
    logger.state.isEnabled = true;
    logger.info(`Token Amount: \`${tokenAmount.toString()}\``);
    logger.info(`Total Month: \`${totalMonth}\``);
    logger.info(`Started At: \`${startedAt}\``);

    // Approve Multivesting contract to spend tokens on behalf of the owner
    await infffinity.connect(owner).approve(await multivesting.getAddress(), tokenAmount);

    // Add vesting
    await multivesting.connect(owner).addVesting(beneficiary.address, tokenAmount, totalMonth, startedAt);

    const vestingDetails = await multivesting.VestingMap(beneficiary.address, 0);
    const contractBalance = await infffinity.balanceOf(await multivesting.getAddress());

    // @dev check vesting details
    logger = logdown("Contract");
    logger.state.isEnabled = true;
    logger.log(`Contract Balance: \`${contractBalance.toString()}\``);

    expect(contractBalance).to.equal(tokenAmount);
    expect(vestingDetails.tokenAmount).to.equal(tokenAmount);
    expect(vestingDetails.startedAt).to.equal(startedAt);
    expect(vestingDetails.lastVestTimestamp).to.equal(0);
    expect(vestingDetails.totalMonth).to.equal(totalMonth);
  });

  it("Should claim vested tokens for every month", async function () {
    const { multivesting, infffinity, owner, beneficiary } = await loadFixture(fixture);

    let logger = logdown("Address");
    logger.state.isEnabled = true;
    logger.info(`Owner \`${owner.address}\``);
    logger.info(`Beneficiary \`${beneficiary.address}\``);
    logger.info(`Multivesting \`${await multivesting.getAddress()}\``);
    logger.info(`Infffinity \`${await infffinity.getAddress()}\``);

    const tokenAmount = ethers.parseEther("50000000");
    const totalMonth = 38;
    const cliffMonth = 2;
    const startedAt = Math.floor(Date.now() / 1000) + (cliffMonth * (30 * 24 * 3600));

    logger = logdown("Variables");
    logger.state.isEnabled = true;
    logger.info(`tokenAmount: \`${tokenAmount}\``);
    logger.info(`totalMonth: \`${totalMonth}\``);
    logger.info(`cliffMonth: \`${cliffMonth}\``);
    logger.info(`startedAt: \`${startedAt}\``);

    // Approve Multivesting contract to spend tokens on behalf of the beneficiary
    await infffinity.connect(owner).approve(await multivesting.getAddress(), tokenAmount);

    // Add vesting
    await multivesting.connect(owner).addVesting(beneficiary.address, tokenAmount, totalMonth, startedAt);

    // Advance time to simulate vesting period completion
    const initialAmount = (tokenAmount * BigInt(27)) / BigInt(100);
    const increaseAmount = (tokenAmount - initialAmount) / BigInt(totalMonth);
    let vestedAmount = initialAmount;

    logger = logdown("Vesting Details");
    logger.state.isEnabled = true;
    // Increase time by 1 month
    for (var i = 0 ; i < totalMonth + cliffMonth ; i++) {
      await network.provider.send("evm_increaseTime", [1 * 30 * 24 * 3600]);
      await network.provider.send("evm_mine");

      if (i < cliffMonth) {
        logger.log(`Cliff Month: \`${i+1}\``);
        continue;
      }
      logger.log(`Vesting Month: \`${i+1}\``);

      // Claim vested tokens
      await multivesting.connect(beneficiary).claim();

      // Check beneficiary's balance
      const beneficiaryBalance = await infffinity.balanceOf(beneficiary.address);
      logger.log(`Beneficiary Balance: \`${beneficiaryBalance.toString()}\``);

      // Check expected vested amount after each month's claim
      if (i === 1) {
        expect(beneficiaryBalance).to.equal(initialAmount);
      } else {
        vestedAmount += increaseAmount;
        expect(beneficiaryBalance).to.equal(vestedAmount);
      }
    }
  });
})