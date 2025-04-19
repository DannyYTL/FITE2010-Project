const { ethers } = require("hardhat");

async function main() {
  // The address of our deployed contract
  const contractAddress = "0x7f388843E98489cCf83bb440588cE3bF89DC5Bc2"; 
  
  // Connect to the contract
  const CropInsurance = await ethers.getContractFactory("CropInsurance");
  const cropInsurance = await CropInsurance.attach(contractAddress);
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Interacting with contract using account:", deployer.address);
  
  // Check account balance
  const initialAccountBalance = await deployer.getBalance();  // Changed variable name to initialAccountBalance
  console.log("Account balance:", ethers.utils.formatEther(initialAccountBalance), "ETH");
  
  // Calculate amounts based on available balance
  // Use much smaller amounts for testing (0.0001 ETH premium instead of 0.01)
  const premium = ethers.utils.parseEther("0.0001");            // Small premium
  
  // Calculate max amount we can send to contract (leave enough for gas)
  const maxFundAmount = initialAccountBalance.sub(premium).sub(ethers.utils.parseEther("0.002"));          // Leave 0.002 ETH for gas
  const fundAmount = ethers.utils.parseEther("0.0005");         // Use a very small amount
  
  // Make sure we don't try to send more than we have
  const actualFundAmount = fundAmount.gt(maxFundAmount) ? maxFundAmount : fundAmount;
  
  console.log("Will fund contract with:", ethers.utils.formatEther(actualFundAmount), "ETH");
  console.log("Will create policy with premium:", ethers.utils.formatEther(premium), "ETH");
  
  // Add a location if needed
  console.log("Adding a location...");
  let locationGasCost = ethers.BigNumber.from(0);             // variable to track location gas cost
  try {
    const locationId = 1;
    const tx1 = await cropInsurance.addLocation(locationId, "40.7128", "-74.0060", { gasLimit: 200000 });
    const locationReceipt = await tx1.wait();                 // Store receipt to calculate gas
    locationGasCost = locationReceipt.gasUsed.mul(locationReceipt.effectiveGasPrice);         // Calculate gas cost
    console.log(`Location ${locationId} added`);
    console.log("Location gas cost:", ethers.utils.formatEther(locationGasCost), "ETH");
  } catch (error) {
    console.log("Error adding location (may already exist):", error.message);
  }
  
  // Send some ETH to the contract to cover payouts
  console.log("Funding contract with ETH for payouts...");
  let fundingGasCost = ethers.BigNumber.from(0);              // variable to track funding gas cost
  try {
    const fundingTx = await deployer.sendTransaction({
      to: contractAddress,
      value: actualFundAmount,
      gasLimit: 100000                // Set explicit gas limit
    });
    const fundingReceipt = await fundingTx.wait();            // Store receipt to calculate gas
    fundingGasCost = fundingReceipt.gasUsed.mul(fundingReceipt.effectiveGasPrice);        // Calculate gas cost
    console.log(`Contract funded with ${ethers.utils.formatEther(actualFundAmount)} ETH`);
    console.log("Funding gas cost:", ethers.utils.formatEther(fundingGasCost), "ETH");
  } catch (error) {
    console.log("Error funding contract:", error.message);
    return;                           // Exit if funding fails
  }
  
  // Create a policy
  console.log("Creating a policy...");
  let policyGasCost = ethers.BigNumber.from(0);  // variable to track policy creation gas cost
  try {
    const locationId = 1;
    const condition = 0;              // 0 = ExcessRain, 1 = Drought, 2 = Frost
    const threshold = 80;             // Example threshold for excess rain (humidity > 80%)
    const expiryDays = 30;            // Policy expires in 30 days
    
    const tx2 = await cropInsurance.createPolicy(
      locationId, 
      condition, 
      threshold, 
      expiryDays, 
      { value: premium, gasLimit: 200000 }
    );
    const policyReceipt = await tx2.wait();       // Store receipt to calculate gas
    policyGasCost = policyReceipt.gasUsed.mul(policyReceipt.effectiveGasPrice);       // Calculate gas cost
    console.log("Policy created");
    console.log("Policy creation gas cost:", ethers.utils.formatEther(policyGasCost), "ETH");
  } catch (error) {
    console.log("Error creating policy:", error.message);
    return;                           // Exit if policy creation fails
  }

  // Track the total gas cost for all transactions so far
  const totalGasCostSoFar = locationGasCost.add(fundingGasCost).add(policyGasCost);  // Include all gas costs
   
  console.log("Gas cost so far:", ethers.utils.formatEther(totalGasCostSoFar), "ETH");
   
  // Calculate what the balance should be after funding and creating policy (including gas)
  const expectedBalanceBeforePayout = initialAccountBalance
    .sub(actualFundAmount)      // Subtract funds sent to contract
    .sub(premium)               // Subtract premium paid
    .sub(totalGasCostSoFar);    // Subtract gas costs
   
  // Get actual balance before payout
  const actualBalanceBeforePayout = await deployer.getBalance();
   
  console.log("Expected balance before payout:", ethers.utils.formatEther(expectedBalanceBeforePayout), "ETH");
  console.log("Actual balance before payout:", ethers.utils.formatEther(actualBalanceBeforePayout), "ETH");

  // Get policy details and save coverage amount
  let coverageAmount = ethers.BigNumber.from(0);  // variable to track coverage amount
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
    
    // Save coverage amount for later verification
    coverageAmount = policyDetails[4];
  } catch (error) {
    console.log("Error getting policy details:", error.message);
  }
  
  // Check contract balance
  let contractBalanceBeforePayout;            // variable for contract balance before payout
  try {
    contractBalanceBeforePayout = await ethers.provider.getBalance(contractAddress);
    console.log("Contract balance before payout:", ethers.utils.formatEther(contractBalanceBeforePayout), "ETH");
  } catch (error) {
    console.log("Error getting contract balance:", error.message);
  }
  
  // Simulate weather data
  console.log("Simulating weather data...");
  let weatherGasCost = ethers.BigNumber.from(0);      // variable to track weather simulation gas cost
  try {
    const locationId = 1;
    const condition = 0;
    const weatherValue = 85;                          // Example: humidity of 85%
    const tx3 = await cropInsurance.simulateWeatherData(
      locationId, 
      condition, 
      weatherValue,
      { gasLimit: 300000 }                            // Add explicit gas limit
    );
    const weatherReceipt = await tx3.wait();          // Store receipt to calculate gas
    weatherGasCost = weatherReceipt.gasUsed.mul(weatherReceipt.effectiveGasPrice);          // Calculate gas cost
    console.log(`Weather data simulated: ${weatherValue}`);
    console.log("Weather simulation gas cost:", ethers.utils.formatEther(weatherGasCost), "ETH");
  } catch (error) {
    console.log("Error simulating weather data:", error.message);
  }
  
  // Get policy details again (should be paid out)
  let policyPaidOut = false;                          // variable to track if policy was paid out
  try {
    const policyId = 1;
    const updatedPolicyDetails = await cropInsurance.getPolicyDetails(policyId);
    console.log("Updated Policy Status:", updatedPolicyDetails[7].toString());

    // Check if policy was paid out
    policyPaidOut = updatedPolicyDetails[7].toString() === "2";               // 2 = PaidOut
    console.log("Policy paid out:", policyPaidOut ? "Yes" : "No");
    
    if (policyPaidOut) {
      // If paid out, we expect to see the coverage amount in the farmer's account
      console.log("Coverage amount received:", ethers.utils.formatEther(coverageAmount), "ETH");
    }
  } catch (error) {
    console.log("Error getting updated policy details:", error.message);
  }
  
  // Check contract balance after payout
  let contractBalanceAfterPayout;
  try {
    contractBalanceAfterPayout = await ethers.provider.getBalance(contractAddress);
    console.log("Contract balance after payout:", ethers.utils.formatEther(contractBalanceAfterPayout), "ETH");
    
    // Calculate how much was paid out from the contract
    const contractBalanceChange = contractBalanceBeforePayout.sub(contractBalanceAfterPayout);
    console.log("Amount paid out from contract:", ethers.utils.formatEther(contractBalanceChange), "ETH");
  } catch (error) {
    console.log("Error getting updated contract balance:", error.message);
  }
  
  // Get farmer's balance after payout
  const balanceAfterPayout = await deployer.getBalance();
  console.log("Balance after payout:", ethers.utils.formatEther(balanceAfterPayout), "ETH");
  
  // Calculate expected balance after payout based on whether policy was paid out
  let expectedBalanceAfterPayout;
  if (policyPaidOut) {
    // If policy was paid out, add coverage amount
    expectedBalanceAfterPayout = expectedBalanceBeforePayout
      .sub(weatherGasCost)           // Subtract gas for weather simulation
      .add(coverageAmount);          // Add coverage amount (dynamic from policy)
  } else {
    // If policy was not paid out, just subtract gas cost
    expectedBalanceAfterPayout = expectedBalanceBeforePayout
      .sub(weatherGasCost);          // Subtract gas for weather simulation
  }
  
  console.log("Expected balance after payout (including gas costs):", ethers.utils.formatEther(expectedBalanceAfterPayout), "ETH");
  console.log("Actual balance after payout:", ethers.utils.formatEther(balanceAfterPayout), "ETH");
  
  // Calculate the difference between actual and expected balance
  const balanceDifference = balanceAfterPayout.sub(expectedBalanceAfterPayout);
  console.log("Balance difference (actual - expected):", ethers.utils.formatEther(balanceDifference), "ETH");
  
  // Verify the balance change
  if (policyPaidOut) {
    // If policy was paid out, verify that balance matches expected
    if (Math.abs(parseFloat(ethers.utils.formatEther(balanceDifference))) < 0.00001) {
      console.log("✅ VERIFICATION SUCCESSFUL: Farmer received the correct payout amount!");
    } else {
      console.log("❌ VERIFICATION FAILED: Farmer's balance change doesn't match expected payout");
    }
  } else {
    console.log("⚠️ Policy was not paid out, so no payout verification is possible");
  }
  
  console.log("Interaction complete");
}

// Executes the main function, which returns a Promise
// On successful completion, exits with code 0 (success)
// On error, logs the error and exits with code 1 (failure)
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });