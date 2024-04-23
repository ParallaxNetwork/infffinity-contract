import { ethers } from "hardhat";
import logdown from "logdown";

async function main() {
  const deployer = "0xf7F7a9A695A1eb550396ED46E13253187c30013e";
  const tokenAddress = "0xbD5DD765E6c2f59A7666dFf2F3039F6B582C684b";
  const Multivesting = await ethers.getContractFactory("Multivesting");
  const multivesting = await Multivesting.deploy(deployer, tokenAddress);

  await multivesting.waitForDeployment();

  let logger = logdown('Deploy Vesting Contract');;
  logger.state.isEnabled = true;
  logger.log(`Contract address: ${await multivesting.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});