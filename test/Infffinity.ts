import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"

describe('Infffinity', function () {
  async function contractFixture() {
    const [wallet, minter1, anon1] = await ethers.getSigners()
    const infffinityContract = await ethers.getContractFactory('Infffinity')
    const infffinity = await upgrades.deployProxy(infffinityContract, [wallet.address, minter1.address, wallet.address], { initializer: 'initialize', kind: 'uups' })
    await infffinity.waitForDeployment()
    return { infffinity, minter1, anon1 }
  }

  describe('Contract', async function () {
    it('should deploy contract', async function () {
      const { infffinity } = await loadFixture(contractFixture)
      expect(await infffinity.name()).to.equal('Infffinity')
    })

    it('should mint erc20', async function () {
      const { infffinity, minter1, anon1 } = await loadFixture(contractFixture)
      await infffinity.connect(minter1).mint(anon1, 1000*10)
      expect((await infffinity.balanceOf(anon1)).toString()).to.equal('10000')
    })
  })
})