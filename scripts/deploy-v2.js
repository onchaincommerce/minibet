const hre = require("hardhat");

async function main() {
  console.log("Deploying MinibetSlotMachineV2...");
  
  const MinibetSlotMachineV2 = await hre.ethers.getContractFactory("MinibetSlotMachineV2");
  const slotMachine = await MinibetSlotMachineV2.deploy();
  
  await slotMachine.waitForDeployment();
  
  const address = await slotMachine.getAddress();
  console.log("MinibetSlotMachineV2 deployed to:", address);
  console.log("Please update your .env file with the new contract address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 