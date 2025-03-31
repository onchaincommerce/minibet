const hre = require("hardhat");

async function main() {
  console.log("Deploying MinibetSlotMachineV3 to Base mainnet...");
  
  const MinibetSlotMachineV3 = await hre.ethers.getContractFactory("MinibetSlotMachineV3");
  const slotMachine = await MinibetSlotMachineV3.deploy();
  
  await slotMachine.waitForDeployment();
  
  const address = await slotMachine.getAddress();
  console.log("MinibetSlotMachineV3 deployed to Base mainnet:", address);
  console.log("\nPlease update your .env.local file with:");
  console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=" + address);
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network base ${address}`);
  
  // Initial funding
  const [deployer] = await hre.ethers.getSigners();
  console.log("\nFunding contract with initial ETH...");
  const fundTx = await deployer.sendTransaction({
    to: address,
    value: hre.ethers.parseEther("0.05")
  });
  await fundTx.wait();
  console.log("Contract funded with 0.05 ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 