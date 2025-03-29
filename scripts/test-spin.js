const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Testing MinibetSlotMachine spin functionality...");
    
    // Get the contract
    const contractAddress = "0x3C4883E9eE3FAa7A014e6c656138e7dDc049E754";
    const MinibetSlotMachine = await ethers.getContractFactory("MinibetSlotMachine");
    const contract = MinibetSlotMachine.attach(contractAddress);
    
    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log(`Testing with account: ${signer.address}`);
    
    // Check initial balance
    const initialBalance = await ethers.provider.getBalance(signer.address);
    console.log(`Initial balance: ${ethers.formatEther(initialBalance)} ETH`);
    
    // Listen for the SpinResult event
    contract.on("SpinResult", async (spinId, player, result, payout, tier) => {
      console.log(`\nSpin Result Event:`);
      console.log(`Spin ID: ${spinId.toString()}`);
      console.log(`Player: ${player}`);
      console.log(`Result: ${result.toString()}`);
      console.log(`Payout: ${ethers.formatEther(payout)} ETH`);
      console.log(`Tier: ${tier}`);
      
      // Check final balance
      const finalBalance = await ethers.provider.getBalance(signer.address);
      console.log(`\nFinal balance: ${ethers.formatEther(finalBalance)} ETH`);
      
      const gasCost = initialBalance - finalBalance - ethers.parseEther("0.001") + payout;
      console.log(`Gas cost: ~${ethers.formatEther(gasCost)} ETH`);
      
      if (payout > 0) {
        console.log(`\n🎉 Won ${ethers.formatEther(payout)} ETH! 🎉`);
      } else {
        console.log(`\n😔 No win this time.`);
      }
      
      console.log("\nTest completed successfully!");
      process.exit(0);
    });
    
    console.log("\nSpinning the slot machine...");
    
    // Spin the slot machine with 0.001 ETH
    const spinTx = await contract.spin({ value: ethers.parseEther("0.001") });
    console.log(`Transaction hash: ${spinTx.hash}`);
    console.log("Waiting for transaction confirmation...");
    
    // Wait for the transaction to be mined
    const receipt = await spinTx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Give it a few seconds to detect the event
    setTimeout(() => {
      console.log("\nNo event received after timeout. Checking transaction logs manually...");
      
      // Get the event from the transaction receipt
      const event = receipt.logs.find(log => 
        log.topics[0] === ethers.id("SpinResult(uint256,address,uint256,uint256,uint8)")
      );
      
      if (event) {
        const decodedEvent = contract.interface.parseLog({
          topics: event.topics,
          data: event.data,
        });
        
        if (decodedEvent) {
          console.log(`\nSpin Result from logs:`);
          console.log(`Spin ID: ${decodedEvent.args[0].toString()}`);
          console.log(`Player: ${decodedEvent.args[1]}`);
          console.log(`Result: ${decodedEvent.args[2].toString()}`);
          console.log(`Payout: ${ethers.formatEther(decodedEvent.args[3])} ETH`);
          console.log(`Tier: ${decodedEvent.args[4]}`);
          
          // Check if payout was received
          const payout = decodedEvent.args[3];
          if (payout > 0) {
            console.log(`\n🎉 Won ${ethers.formatEther(payout)} ETH! 🎉`);
          } else {
            console.log(`\n😔 No win this time.`);
          }
        }
      } else {
        console.log("Could not find SpinResult event in the logs.");
      }
      
      console.log("\nTest completed!");
      process.exit(0);
    }, 5000);
    
    // Keep the script running to listen for events
    console.log("Listening for SpinResult event...");
    
  } catch (error) {
    console.error("Error during testing:", error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 