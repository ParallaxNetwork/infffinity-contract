import { ethers, upgrades } from "hardhat";
import logdown from 'logdown';

async function main() {
  const deployer = "0xf7F7a9A695A1eb550396ED46E13253187c30013e";
  const infffinity = await ethers.getContractFactory("Infffinity");
  const deployInf = await upgrades.deployProxy(infffinity, [deployer, deployer, deployer], { initializer: 'initialize', kind: 'uups' });
  await deployInf.waitForDeployment();

  let logger = logdown('Deploy Token');
  logger.state.isEnabled = true;
  logger.log(`Token address: ${await deployInf.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});