const { ethers } = require("hardhat");

async function main() {
  // The address of our deployed contract
  const contractAddress = "0x3D43745a871fDC20F52E4e6a4Ac7bbEE05683f58"; 
  
  // Connect to the contract
  const CropInsurance = await ethers.getContractFactory("CropInsurance");
  const cropInsurance = await CropInsurance.attach(contractAddress);
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Interacting with contract using account:", deployer.address);
  
  // Check account balance
  const accountBalance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(accountBalance), "ETH");
  
  // Calculate amounts based on available balance
  // Use much smaller amounts for testing (0.0001 ETH premium instead of 0.01)
  const premium = ethers.utils.parseEther("0.0001");            // Small premium
  
  // Calculate max amount we can send to contract (leave enough for gas)
  const maxFundAmount = accountBalance.sub(premium).sub(ethers.utils.parseEther("0.002"));          // Leave 0.002 ETH for gas
  const fundAmount = ethers.utils.parseEther("0.0005");         // Use a very small amount
  
  // Make sure we don't try to send more than we have
  const actualFundAmount = fundAmount.gt(maxFundAmount) ? maxFundAmount : fundAmount;
  
  console.log("Will fund contract with:", ethers.utils.formatEther(actualFundAmount), "ETH");
  console.log("Will create policy with premium:", ethers.utils.formatEther(premium), "ETH");
  
  // Add a location if needed
  console.log("Adding a location...");
  try {
    const locationId = 1;
    const tx1 = await cropInsurance.addLocation(locationId, "40.7128", "-74.0060", { gasLimit: 200000 });
    await tx1.wait();
    console.log(`Location ${locationId} added`);
  } catch (error) {
    console.log("Error adding location (may already exist):", error.message);
  }
  
  // Send some ETH to the contract to cover payouts
  console.log("Funding contract with ETH for payouts...");
  try {
    const fundingTx = await deployer.sendTransaction({
      to: contractAddress,
      value: actualFundAmount,
      gasLimit: 100000 // Set explicit gas limit
    });
    await fundingTx.wait();
    console.log(`Contract funded with ${ethers.utils.formatEther(actualFundAmount)} ETH`);
  } catch (error) {
    console.log("Error funding contract:", error.message);
    return; // Exit if funding fails
  }
  
  // Create a policy
  console.log("Creating a policy...");
  try {
    const locationId = 1;
    const condition = 0; // 0 = ExcessRain, 1 = Drought, 2 = Frost
    const threshold = 80; // Example threshold for excess rain (humidity > 80%)
    const expiryDays = 30; // Policy expires in 30 days
    
    const tx2 = await cropInsurance.createPolicy(
      locationId, 
      condition, 
      threshold, 
      expiryDays, 
      { value: premium, gasLimit: 200000 }
    );
    await tx2.wait();
    console.log("Policy created");
  } catch (error) {
    console.log("Error creating policy:", error.message);
    return; // Exit if policy creation fails
  }
  
  // Get policy details
  try {
    const policyId = 1;
    const policyDetails = await cropInsurance.getPolicyDetails(policyId);
    console.log("Policy Details:");
    console.log("  Farmer:", policyDetails[0]);
    console.log("  Location ID:", policyDetails[1].toString());
    console.log("  Condition:", policyDetails[2].toString());
    console.log("  Premium:", ethers.utils.formatEther(policyDetails[3]), "ETH");
    console.log("  Coverage Amount:", ethers.utils.formatEther(policyDetails[4]), "ETH");
    console.log("  Threshold:", policyDetails[5].toString());
    console.log("  Expiry Date:", new Date(policyDetails[6].toNumber() * 1000).toLocaleString());
    console.log("  Status:", policyDetails[7].toString());
  } catch (error) {
    console.log("Error getting policy details:", error.message);
  }
  
  // Check contract balance
  try {
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    console.log("Contract balance before payout:", ethers.utils.formatEther(contractBalance), "ETH");
  } catch (error) {
    console.log("Error getting contract balance:", error.message);
  }
  
  // Simulate weather data
  console.log("Simulating weather data...");
  try {
    const locationId = 1;
    const condition = 0;
    const weatherValue = 85; // Example: humidity of 85%
    const tx3 = await cropInsurance.simulateWeatherData(
      locationId, 
      condition, 
      weatherValue,
      { gasLimit: 300000 } // Add explicit gas limit
    );
    await tx3.wait();
    console.log(`Weather data simulated: ${weatherValue}`);
  } catch (error) {
    console.log("Error simulating weather data:", error.message);
  }
  
  // Get policy details again (should be paid out)
  try {
    const policyId = 1;
    const updatedPolicyDetails = await cropInsurance.getPolicyDetails(policyId);
    console.log("Updated Policy Status:", updatedPolicyDetails[7].toString());
  } catch (error) {
    console.log("Error getting updated policy details:", error.message);
  }
  
  // Check contract balance after payout
  try {
    const updatedContractBalance = await ethers.provider.getBalance(contractAddress);
    console.log("Contract balance after payout:", ethers.utils.formatEther(updatedContractBalance), "ETH");
  } catch (error) {
    console.log("Error getting updated contract balance:", error.message);
  }
  
  console.log("Interaction complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });