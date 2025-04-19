# FITE2010-Project
## Personal project for HKU course FITE2010 - Distributed Ledger and Blockchain
### By Yao Tianle (UID: 3036253691)
-------------------
- Overview:
<br> This project implements a decentralized insurance system for crop farmers using blockchain technology. Traditional crop insurance often suffers from slow claim processing, ambiguous policy terms, and potential conflicts of interest between insurance providers and farmers. Our smart contract solution addresses these challenges through automation, transparency, and immutable execution.
-------------------
- Problem Statement
<br> Agricultural producers face significant risks from extreme weather events such as excessive rainfall, drought, and frost. Traditional insurance solutions present several challenges:
<br> 1. Delayed payouts: Manual verification processes can take weeks or months
<br> 2. Policy ambiguity: Terms may be subject to interpretation or dispute
<br> 3. Trust issues: Farmers must rely on insurance companies to honor claims fairly
<br> 4. High administrative costs: Traditional insurance involves significant overhead
-------------------
- Solution
<br> This smart contract implements an automated, transparent crop insurance platform with the following features:
<br> 1. Instant payouts: Claims are processed automatically when weather thresholds are met
<br> 2. Transparent terms: All policy conditions are explicitly coded in the contract
<br> 3. Trustless execution: Once deployed, the contract executes according to predefined rules without human intervention
<br> 4. Reduced costs: Automation eliminates administrative overhead and reduces premiums
-------------------
- How It Works
<br> - Policy Creation: Farmers create customized policies by specifying: 
<br> Location (coordinates);
<br> Weather condition to insure against (excess rain, drought, or frost);
<br> Threshold value that triggers a payout;
<br> Policy duration;
<br> - Premium Payment: Farmers pay a premium that is proportional to the coverage amount
<br> - Weather Monitoring: The contract connects to weather data feeds (simulated in this implementation)
<br> - Automatic Execution: When weather conditions exceed the specified threshold, the contract automatically:
<br> - Verifies the policy is active
<br> - Processes the payout to the farmer's wallet
<br> - Updates the policy status
-------------------
- Technical Implementation
<br> This project leverages Ethereum smart contracts written in Solidity; and the testing of project runs on Ethereum wallet with testnet ETH (for Sepolia testnet)
-------------------
- Potential Future Enhancements
<br> - Integration with real-world oracle services like Chainlink for verified weather data
<br> - Support for parametric insurance with partial payouts based on severity
<br> - Pooled risk management to optimize capital efficiency
<br> - Mobile dApp interface for farmers to manage policies
-------------------
### Setup and Deployment
- Install dependencies with command:
<br> npm install

- Deploy to Sepolia testnet with command:
<br> npx hardhat run scripts/deploy.js --network sepolia

- Interact with the deployed contract with command:
<br> npx hardhat run scripts/interact.js --network sepolia
-------------------
### Sample run result:
![Crop Insurance System](sample_run.png)
