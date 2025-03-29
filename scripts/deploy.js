const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Deploying MinibetSlotMachine...");
    
    // Get the contract factory
    const MinibetSlotMachine = await ethers.getContractFactory("MinibetSlotMachine");
    
    // Deploy the contract
    const minibetSlotMachine = await MinibetSlotMachine.deploy();
    await minibetSlotMachine.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await minibetSlotMachine.getAddress();
    
    console.log(`MinibetSlotMachine deployed to: ${contractAddress}`);
    console.log(`Verify with: npx hardhat verify --network baseSepolia ${contractAddress}`);
    
    // Fund the contract with initial ETH if needed
    // Uncomment if you want to pre-fund the contract
    /*
    const [deployer] = await ethers.getSigners();
    console.log("Funding contract with initial ETH...");
    const fundTx = await deployer.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("0.5")
    });
    await fundTx.wait();
    console.log(`Contract funded with 0.5 ETH`);
    */
    
  } catch (error) {
    console.error("Error during deployment:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 