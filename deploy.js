const { ethers } = require("hardhat");

async function main() {
  // Get the Contract Factory
  const CropInsurance = await ethers.getContractFactory("CropInsurance");
  
  // Deploy the contract
  console.log("Deploying CropInsurance...");
  const cropInsurance = await CropInsurance.deploy();
  
  // Wait for deployment to finish
  await cropInsurance.deployed();
  
  console.log("CropInsurance deployed to:", cropInsurance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });