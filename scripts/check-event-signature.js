const { ethers } = require("hardhat");

async function main() {
  // Contract address
  const contractAddress = "0x3C4883E9eE3FAa7A014e6c656138e7dDc049E754";
  console.log(`Checking event signature for contract: ${contractAddress}`);
  
  // Get the transaction hash from a recent tx
  // You can replace this with any transaction hash that triggered the SpinResult event
  const txHash = "0x187f808fe0783927763d6a3051c38ff109917d2c5d28208cdb577def218347bc";
  
  // Get transaction receipt
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  console.log(`Found receipt with ${receipt.logs.length} logs`);
  
  // Find logs from our contract
  const contractLogs = receipt.logs.filter(
    log => log.address.toLowerCase() === contractAddress.toLowerCase()
  );
  
  console.log(`Found ${contractLogs.length} logs from our contract`);
  
  // Print details of each log
  for (let i = 0; i < contractLogs.length; i++) {
    const log = contractLogs[i];
    console.log(`\nLog #${i+1}:`);
    console.log("Topics:", log.topics);
    console.log("First topic (event signature):", log.topics[0]);
    console.log("Data:", log.data);
    
    // Try to match this with SpinResult event signature
    const factory = await ethers.getContractFactory("MinibetSlotMachine");
    const interface = factory.interface;
    
    try {
      // Try to decode the log
      console.log("\nAttempting to decode log...");
      const decoded = interface.parseLog(log);
      console.log("Decoded event name:", decoded.name);
      console.log("Decoded args:", decoded.args);
    } catch (e) {
      console.log("Could not decode log with contract interface:", e.message);
    }
  }
  
  // Generate expected event signature
  console.log("\n=== Expected Event Signatures ===");
  const factory = await ethers.getContractFactory("MinibetSlotMachine");
  const eventFragment = factory.interface.getEvent("SpinResult");
  console.log("Event fragment format:", eventFragment.format());
  
  // Calculate various signatures
  const signatures = [
    "SpinResult(uint256,address,uint256,uint256,uint8)",
    "SpinResult(uint256 indexed,address indexed,uint256,uint256,uint8)",
    "SpinResult(uint256 indexed spinId,address indexed player,uint256 result,uint256 payout,uint8 tier)"
  ];
  
  for (const sig of signatures) {
    const hash = ethers.utils.id(sig);
    console.log(`Hash for "${sig}": ${hash}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 