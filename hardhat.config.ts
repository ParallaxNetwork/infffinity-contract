import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades"
import "@nomiclabs/hardhat-truffle4";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
};

export default config;
