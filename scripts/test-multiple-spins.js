const { ethers } = require("hardhat");

async function main() {
  // Get contract info
  const contractAddress = "0x3C4883E9eE3FAa7A014e6c656138e7dDc049E754";
  const [signer] = await ethers.getSigners();
  console.log(`Testing with account: ${signer.address}`);
  
  // Contract constants from MinibetSlotMachine.sol
  const JACKPOT_THRESHOLD = 1;     // 0.1% chance (1/1000)
  const BIG_WIN_THRESHOLD = 21;    // 2% chance (20/1000)
  const SMALL_WIN_THRESHOLD = 121; // 10% chance (100/1000)
  
  // Attach to contract
  const MinibetSlotMachine = await ethers.getContractFactory("MinibetSlotMachine");
  const contract = await MinibetSlotMachine.attach(contractAddress);
  
  // Initial balance check
  const initialBalance = await ethers.provider.getBalance(signer.address);
  console.log(`Initial balance: ${ethers.utils.formatEther(initialBalance)} ETH`);
  
  // Statistics
  const NUM_SPINS = 20;
  let results = [];
  let tiers = {
    1: 0, // Jackpot
    2: 0, // Big Win
    3: 0, // Small Win
    4: 0  // No Win
  };
  let totalGasUsed = ethers.BigNumber.from(0);
  
  console.log("\n=== Starting Test Spins ===");
  console.log("Spin ID | Result | Tier | Payout (ETH) | Gas (ETH)");
  console.log("----------------------------------------------------");
  
  // Run multiple spins
  for (let i = 0; i < NUM_SPINS; i++) {
    try {
      // Submit spin transaction
      const tx = await contract.spin({ value: ethers.utils.parseEther("0.001") });
      
      // Wait for transaction to be mined and get receipt
      const receipt = await tx.wait();
      
      // Gas used for this transaction
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      totalGasUsed = totalGasUsed.add(gasUsed);
      
      // Find the SpinResult event
      const event = receipt.events.find(e => e.event === "SpinResult");
      
      if (event) {
        const [spinId, , result, payout, tier] = event.args;
        
        // Store result
        results.push({
          spinId: spinId.toString(),
          result: result.toNumber(),
          tier: tier,
          payout: ethers.utils.formatEther(payout)
        });
        
        // Update tier counts
        tiers[tier]++;
        
        // Log individual result
        console.log(
          `${spinId.toString().padStart(3, ' ')}   | ` +
          `${result.toString().padStart(3, ' ')}   | ` +
          `${tier}    | ` +
          `${ethers.utils.formatEther(payout).padStart(10, ' ')}  | ` +
          `${ethers.utils.formatEther(gasUsed).padStart(10, ' ')}`
        );
      } else {
        console.log(`Spin ${i+1}: No SpinResult event found`);
      }
      
      // Short delay between spins to avoid nonce issues
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Error on spin ${i+1}:`, error.message);
    }
  }
  
  // Final balance check
  const finalBalance = await ethers.provider.getBalance(signer.address);
  console.log("\n=== Results Summary ===");
  console.log("Initial balance:  ", ethers.utils.formatEther(initialBalance), "ETH");
  console.log("Final balance:    ", ethers.utils.formatEther(finalBalance), "ETH");
  console.log("Total change:     ", ethers.utils.formatEther(finalBalance.sub(initialBalance)), "ETH");
  console.log("Total gas used:   ", ethers.utils.formatEther(totalGasUsed), "ETH");
  
  // Calculate statistics
  console.log("\n=== Distribution Analysis ===");
  console.log("Tier | Description | Expected % | Actual # | Actual %");
  console.log("---------------------------------------------");
  console.log(`1    | Jackpot     | 0.1%       | ${tiers[1]}         | ${(tiers[1]/NUM_SPINS*100).toFixed(1)}%`);
  console.log(`2    | Big Win     | 2.0%       | ${tiers[2]}         | ${(tiers[2]/NUM_SPINS*100).toFixed(1)}%`);
  console.log(`3    | Small Win   | 10.0%      | ${tiers[3]}         | ${(tiers[3]/NUM_SPINS*100).toFixed(1)}%`);
  console.log(`4    | No Win      | 87.9%      | ${tiers[4]}         | ${(tiers[4]/NUM_SPINS*100).toFixed(1)}%`);
  
  // Analyze results distribution
  console.log("\n=== Raw Results ===");
  let resultDistribution = {};
  for (let i = 0; i < 1000; i += 50) {
    const rangeResults = results.filter(r => r.result >= i && r.result < i + 50);
    if (rangeResults.length > 0) {
      resultDistribution[`${i}-${i+49}`] = rangeResults.length;
    }
  }
  
  console.log("Range | Count");
  console.log("------------");
  for (const range in resultDistribution) {
    console.log(`${range.padEnd(10)} | ${resultDistribution[range]}`);
  }
  
  // Print event information for debugging frontend issues
  console.log("\n=== Event Signature Information ===");
  try {
    const factory = await ethers.getContractFactory("MinibetSlotMachine");
    const interface = factory.interface;
    
    // Get the SpinResult event fragment
    const eventFragment = interface.getEvent("SpinResult");
    console.log("Event Fragment:", eventFragment.format());
    
    // Calculate the event signature hash
    const eventSignatureHash = ethers.utils.id("SpinResult(uint256,address,uint256,uint256,uint8)");
    console.log("Event Signature Hash:", eventSignatureHash);
    
    // Also log the raw topics from a real transaction
    console.log("\nExtracting real event topic from a transaction:");
    try {
      // Do a single spin to get a real transaction receipt
      const singleTx = await contract.spin({ value: ethers.utils.parseEther("0.001") });
      const singleReceipt = await singleTx.wait();
      
      // Find the first log from our contract
      const contractLog = singleReceipt.logs.find(
        log => log.address.toLowerCase() === contractAddress.toLowerCase()
      );
      
      if (contractLog) {
        console.log("Real transaction log topics:", contractLog.topics);
        console.log("First topic (event signature):", contractLog.topics[0]);
      } else {
        console.log("No log found from the contract address");
      }
    } catch (err) {
      console.error("Error getting real transaction log:", err.message);
    }
  } catch (error) {
    console.error("Error generating event signature information:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 