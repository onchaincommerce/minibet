const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("MinibetSlotMachine", function () {
  let minibetSlotMachine;
  let owner;
  let player1;
  let player2;

  beforeEach(async function () {
    const [ownerAcc, player1Acc, player2Acc] = await ethers.getSigners();
    owner = ownerAcc;
    player1 = player1Acc;
    player2 = player2Acc;

    const MinibetSlotMachine = await ethers.getContractFactory("MinibetSlotMachine");
    minibetSlotMachine = await MinibetSlotMachine.deploy();
    await minibetSlotMachine.waitForDeployment();
    
    // Pre-fund the contract with 1 ETH to handle potential payouts
    await owner.sendTransaction({
      to: await minibetSlotMachine.getAddress(),
      value: ethers.parseEther("1")
    });
  });

  describe("Basic Functionality", function () {
    it("Should allow spins with the exact spin price", async function () {
      const spinPrice = await minibetSlotMachine.SPIN_PRICE();
      
      // Player1 spins
      await expect(
        minibetSlotMachine.connect(player1).spin({ value: spinPrice })
      ).to.not.be.reverted;
    });

    it("Should reject spins with incorrect ETH amount", async function () {
      const wrongAmount = ethers.parseEther("0.002");
      
      // Should reject with too much ETH
      await expect(
        minibetSlotMachine.connect(player1).spin({ value: wrongAmount })
      ).to.be.revertedWith("Exactly 0.001 ETH required");

      // Should reject with too little ETH
      await expect(
        minibetSlotMachine.connect(player1).spin({ value: ethers.parseEther("0.0005") })
      ).to.be.revertedWith("Exactly 0.001 ETH required");
    });

    it("Should emit SpinResult event after spin", async function () {
      const spinPrice = await minibetSlotMachine.SPIN_PRICE();
      
      await expect(
        minibetSlotMachine.connect(player1).spin({ value: spinPrice })
      ).to.emit(minibetSlotMachine, "SpinResult");
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to withdraw funds", async function () {
      const spinPrice = await minibetSlotMachine.SPIN_PRICE();
      
      // Make a few spins to accumulate funds
      await minibetSlotMachine.connect(player1).spin({ value: spinPrice });
      await minibetSlotMachine.connect(player2).spin({ value: spinPrice });
      
      const contractBalance = await ethers.provider.getBalance(await minibetSlotMachine.getAddress());
      const withdrawAmount = contractBalance;
      
      // Owner withdraws all funds
      await expect(
        minibetSlotMachine.connect(owner).withdraw(withdrawAmount)
      ).to.not.be.reverted;
      
      // Check balance is only the remainder after withdrawal
      const newBalance = await ethers.provider.getBalance(await minibetSlotMachine.getAddress());
      expect(newBalance).to.equal(0);
    });

    it("Should not allow non-owner to withdraw funds", async function () {
      await expect(
        minibetSlotMachine.connect(player1).withdraw(0)
      ).to.be.reverted;
    });

    it("Should allow owner to pause and unpause the contract", async function () {
      const spinPrice = await minibetSlotMachine.SPIN_PRICE();
      
      // Owner pauses the contract
      await minibetSlotMachine.connect(owner).pause();
      
      // Spins should be rejected when paused
      await expect(
        minibetSlotMachine.connect(player1).spin({ value: spinPrice })
      ).to.be.reverted;
      
      // Owner unpauses the contract
      await minibetSlotMachine.connect(owner).unpause();
      
      // Spins should work after unpausing
      await expect(
        minibetSlotMachine.connect(player1).spin({ value: spinPrice })
      ).to.not.be.reverted;
    });
  });

  describe("Randomness and Payouts", function () {
    it("Should generate different results for different spins", async function () {
      const spinPrice = await minibetSlotMachine.SPIN_PRICE();
      
      // Make multiple spins
      const results = [];
      
      for (let i = 0; i < 5; i++) {
        const tx = await minibetSlotMachine.connect(player1).spin({ value: spinPrice });
        const receipt = await tx.wait();
        const event = receipt?.logs.find((log) => 
          log.topics[0] === ethers.id("SpinResult(uint256,address,uint256,uint256,uint8)"));
          
        if (event) {
          const decoded = minibetSlotMachine.interface.parseLog({
            topics: event.topics,
            data: event.data,
          });
          
          if (decoded) {
            results.push(decoded.args[2]); // result value
          }
        }
      }
      
      // Check that we have at least some different results
      const uniqueResults = new Set(results.map(r => r.toString()));
      expect(uniqueResults.size).to.be.greaterThan(1);
    });
  });
}); 