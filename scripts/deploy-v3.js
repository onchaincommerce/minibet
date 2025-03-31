const hre = require("hardhat");

async function main() {
  console.log("Deploying MinibetSlotMachineV3...");
  
  const MinibetSlotMachineV3 = await hre.ethers.getContractFactory("MinibetSlotMachineV3");
  const slotMachine = await MinibetSlotMachineV3.deploy();
  
  await slotMachine.waitForDeployment();
  
  const address = await slotMachine.getAddress();
  console.log("MinibetSlotMachineV3 deployed to:", address);
  console.log("Please update your .env.local file with:");
  console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=" + address);
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network baseSepolia ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 