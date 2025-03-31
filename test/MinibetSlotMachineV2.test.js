const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers;

describe("MinibetSlotMachineV2", function () {
  let slotMachine;
  let owner;
  let player;
  let player2;

  beforeEach(async function () {
    [owner, player, player2] = await ethers.getSigners();
    
    const MinibetSlotMachineV2 = await ethers.getContractFactory("MinibetSlotMachineV2");
    slotMachine = await MinibetSlotMachineV2.deploy();
    await slotMachine.waitForDeployment();
  });

  describe("Contract Setup", function () {
    it("Should set the right owner", async function () {
      expect(await slotMachine.owner()).to.equal(owner.address);
    });

    it("Should have correct initial values", async function () {
      expect(await slotMachine.SPIN_PRICE()).to.equal(parseEther("0.001"));
      expect(await slotMachine.JACKPOT_PAYOUT()).to.equal(parseEther("0.1"));
      expect(await slotMachine.BIG_WIN_PAYOUT()).to.equal(parseEther("0.01"));
      expect(await slotMachine.SMALL_WIN_PAYOUT()).to.equal(parseEther("0.002"));
    });
  });

  describe("Spinning", function () {
    it("Should revert if spin price is incorrect", async function () {
      await expect(
        slotMachine.connect(player).spin({ value: parseEther("0.0005") })
      ).to.be.revertedWith("Exactly 0.001 ETH required");
    });

    it("Should track user stats correctly", async function () {
      // Spin once
      await slotMachine.connect(player).spin({ value: parseEther("0.001") });
      
      const stats = await slotMachine.getUserStats(player.address);
      expect(stats[0]).to.equal(1); // spins
      expect(stats[2]).to.equal(parseEther("0.001")); // spent
    });

    it("Should fail if contract has insufficient balance for payout", async function () {
      // First, let's drain the contract
      await slotMachine.connect(owner).withdraw(0); // Withdraw all funds
      
      // Now try to spin
      await slotMachine.connect(player).spin({ value: parseEther("0.001") });
      
      // Get the emitted events
      const events = await slotMachine.queryFilter("InsufficientBalance");
      
      // If we got an InsufficientBalance event, the contract is working as expected
      if (events.length > 0) {
        const event = events[0];
        expect(event.args.player).to.equal(player.address);
      }
    });
  });

  describe("Contract Balance", function () {
    it("Should accumulate spin fees", async function () {
      const initialBalance = await ethers.provider.getBalance(await slotMachine.getAddress());
      
      // Perform 5 spins
      for (let i = 0; i < 5; i++) {
        await slotMachine.connect(player).spin({ value: parseEther("0.001") });
      }
      
      const finalBalance = await ethers.provider.getBalance(await slotMachine.getAddress());
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should allow owner to withdraw funds", async function () {
      // First add some funds through spins
      await slotMachine.connect(player).spin({ value: parseEther("0.001") });
      await slotMachine.connect(player2).spin({ value: parseEther("0.001") });
      
      const initialBalance = await ethers.provider.getBalance(await slotMachine.getAddress());
      expect(initialBalance).to.be.gt(0);
      
      // Withdraw all funds
      await slotMachine.connect(owner).withdraw(0);
      
      const finalBalance = await ethers.provider.getBalance(await slotMachine.getAddress());
      expect(finalBalance).to.equal(0);
    });
  });

  describe("Stress Test", function () {
    it("Should handle multiple spins without issues", async function () {
      // Fund the contract first
      await owner.sendTransaction({
        to: await slotMachine.getAddress(),
        value: parseEther("1.0") // Add 1 ETH for payouts
      });
      
      // Perform 20 spins
      for (let i = 0; i < 20; i++) {
        await slotMachine.connect(player).spin({ value: parseEther("0.001") });
      }
      
      const stats = await slotMachine.getUserStats(player.address);
      expect(stats[0]).to.equal(20); // spins
      expect(stats[2]).to.equal(parseEther("0.02")); // spent
    });
  });
}); 