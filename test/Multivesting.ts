import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network, upgrades } from "hardhat";

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

    const tokenAmount = 1000;
    const totalMonth = 12;
    const startedAt = Math.floor(Date.now() / 1000);

    // Approve Multivesting contract to spend tokens on behalf of the owner
    await infffinity.connect(owner).approve(await multivesting.getAddress(), tokenAmount);

    // Transfer tokens to Multivesting contract
    await infffinity.transfer(await multivesting.getAddress(), tokenAmount);

    // Add vesting
    await multivesting.connect(owner).addVesting(beneficiary.address, tokenAmount, totalMonth, startedAt);

    const vestingDetails = await multivesting.VestingMap(beneficiary.address, 0);

    expect(vestingDetails.startedAt).to.equal(startedAt);
    expect(vestingDetails.lastVestTimestamp).to.equal(0);
    expect(vestingDetails.totalMonth).to.equal(totalMonth);
  });

  it("Should claim vested tokens", async function () {
    const { multivesting, infffinity, owner, beneficiary } = await loadFixture(fixture);

    const tokenAmount = 10000;
    const totalMonth = 12;
    const startedAt = Math.floor(Date.now() / 1000);

    // Transfer tokens to Multivesting contract
    await infffinity.transfer(owner.address, tokenAmount);

    // Approve Multivesting contract to spend tokens on behalf of the beneficiary
    await infffinity.connect(beneficiary).approve(await multivesting.getAddress(), tokenAmount);
    await infffinity.connect(owner).approve(await multivesting.getAddress(), tokenAmount);

    // Add vesting
    await multivesting.connect(owner).addVesting(beneficiary.address, tokenAmount, totalMonth, startedAt);

    // Advance time to simulate vesting period completion
    await network.provider.send("evm_increaseTime", [totalMonth * 30 * 24 * 3600]);
    await network.provider.send("evm_mine");

    // Claim vested tokens
    await multivesting.connect(beneficiary).claim();

    // Check beneficiary's balance
    const beneficiaryBalance = await infffinity.balanceOf(beneficiary.address);
    expect(beneficiaryBalance).to.equal(tokenAmount);
  });
})