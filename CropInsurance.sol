// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// The contract allows farmers to purchase insurance policies that automatically pay out when specific 
// weather conditions exceed pre-determined thresholds, without requiring manual claims processing

// the contract inherits from two OpenZeppelin base contracts
// Ownable: Provides basic authorization control, restricting certain functions to the contract owner
// ReentrancyGuard: Prevents reentrant attacks during fund transfers
contract CropInsurance is Ownable, ReentrancyGuard {       
    // Weather conditions that can trigger insurance payouts
    // ExcessRain: When humidity/rainfall exceeds the threshold (e.g., >80%)
    // Drought: When humidity/rainfall is below the threshold (e.g., <20%)
    // Frost: When temperature falls below the threshold (e.g., <0°C)
    enum WeatherCondition { ExcessRain, Drought, Frost }
    
    // Status of an insurance policy
    enum PolicyStatus { Active, Expired, PaidOut }
    
    // Structure to store insurance policy details
    struct Policy {
        address farmer;                 // Ethereum address of the policy holder
        uint256 locationId;             // Geographic location being insured
        WeatherCondition condition;     // Type of weather event insured against
        uint256 premium;                // Amount paid by farmer for coverage
        uint256 coverageAmount;         // Payout amount (3x premium in this implementation)
        uint256 threshold;              // Weather value that triggers payout
        uint256 expiryDate;             // When the policy expires (in Unix timestamp)
        PolicyStatus status;            // Current state of the policy
    }
    
    // Maps to store policies and weather data
    uint256 private nextPolicyId = 1;               
    mapping(uint256 => Policy) public policies;                                    // Maps policy IDs to Policy structs
    mapping(uint256 => mapping(WeatherCondition => uint256)) public weatherData;   // Stores weather values for each location and condition
    mapping(uint256 => string) public locationToLatitude;                          // Maps location IDs to geographic coordinates
    mapping(uint256 => string) public locationToLongitude;
    
    // Events -
    // When a farmer purchases insurance
    event PolicyCreated(uint256 policyId, address farmer, uint256 locationId, WeatherCondition condition, uint256 premium, uint256 coverageAmount, uint256 threshold, uint256 expiryDate);
    
    // When weather data is updated
    event WeatherDataUpdated(uint256 locationId, WeatherCondition condition, uint256 value);
    
    // When a policy pays out
    event PolicyPaidOut(uint256 policyId, address farmer, uint256 coverageAmount, uint256 weatherValue);
    
    // When a new location is added to the system
    event LocationAdded(uint256 locationId, string latitude, string longitude);
    
    // When a payout is reduced due to insufficient contract funds
    event PartialPayout(uint256 policyId, uint256 requestedAmount, uint256 actualAmount);
    
    /**
     * @dev Constructor initializes the contract
     */
    constructor() Ownable(msg.sender) {
        // Empty constructor
    }
    
    /**
     * @dev Add a new insurable location, only the contract owner can add, each with geographic coordinates
     * @param _locationId Unique identifier for the location
     * @param _latitude Latitude of the location
     * @param _longitude Longitude of the location
     */
    function addLocation(uint256 _locationId, string memory _latitude, string memory _longitude) external onlyOwner {
        // _locationId validation to be implemented; the string memory may be changed to string calldata to save gas cost
        locationToLatitude[_locationId] = _latitude;
        locationToLongitude[_locationId] = _longitude;
        emit LocationAdded(_locationId, _latitude, _longitude);
    }
    
    /**
     * @dev Farmers can purchase insurance: create a new insurance policy
     * @param _locationId Location ID for the insured farm
     * @param _condition Weather condition to insure against
     * @param _threshold Weather threshold that triggers a payout
     * @param _expiryDays Number of days until policy expires
     */
    function createPolicy(uint256 _locationId, WeatherCondition _condition, uint256 _threshold, uint256 _expiryDays) external payable {
        require(bytes(locationToLatitude[_locationId]).length > 0, "Location does not exist");
        require(msg.value > 0, "Premium must be greater than 0");
        require(_expiryDays > 0, "Expiry must be in the future");
        
        uint256 policyId = nextPolicyId++;
        uint256 coverageAmount = msg.value * 3; // Coverage is 3x the premium
        uint256 expiryDate = block.timestamp + (_expiryDays * 1 days);
        
        policies[policyId] = Policy({
            farmer: msg.sender,
            locationId: _locationId,
            condition: _condition,
            premium: msg.value,
            coverageAmount: coverageAmount,
            threshold: _threshold,
            expiryDate: expiryDate,
            status: PolicyStatus.Active
        });
        
        emit PolicyCreated(policyId, msg.sender, _locationId, _condition, msg.value, coverageAmount, _threshold, expiryDate);
    }
    
    /**
     * @dev Function for testing without actual oracle; When weather data is updated, the contract checks if any policies should pay out
     * @param _locationId Location ID
     * @param _condition Weather condition
     * @param _value Weather value to set
     */
    function simulateWeatherData(
        uint256 _locationId,
        WeatherCondition _condition,
        uint256 _value
    ) external onlyOwner {
        weatherData[_locationId][_condition] = _value;
        emit WeatherDataUpdated(_locationId, _condition, _value);
        
        // Check if any policies should pay out based on this data
        checkPoliciesForPayout(_locationId, _condition, _value);
    }
    
    /**
     * @dev Check all policies for the given location and condition to see if they should pay out
     * @param _locationId Location ID
     * @param _condition Weather condition
     * @param _weatherValue Current weather value
     */
    function checkPoliciesForPayout(
        uint256 _locationId,
        WeatherCondition _condition,
        uint256 _weatherValue
    ) internal {
        for (uint256 i = 1; i < nextPolicyId; i++) {
            Policy storage policy = policies[i];
            
            if (policy.status != PolicyStatus.Active) {
                continue;
            }
            
            if (policy.locationId != _locationId || policy.condition != _condition) {
                continue;
            }
            
            bool shouldPayout = false;
            
            // Logic for different weather conditions
            if (_condition == WeatherCondition.ExcessRain && _weatherValue > policy.threshold) {
                shouldPayout = true;
            } else if (_condition == WeatherCondition.Drought && _weatherValue < policy.threshold) {
                shouldPayout = true;
            } else if (_condition == WeatherCondition.Frost && _weatherValue < policy.threshold) {
                shouldPayout = true;
            }
            
            if (shouldPayout) {
                executePayoutForPolicy(i, _weatherValue);
            }
        }
    }
    
    /**
     * @dev Execute payout for a specific policy
     * @param _policyId ID of the policy to pay out
     * @param _weatherValue Weather value that triggered the payout
     */
    function executePayoutForPolicy(uint256 _policyId, uint256 _weatherValue) internal nonReentrant {
        Policy storage policy = policies[_policyId];

        // Check if policy has expired before processing
        if (policy.status == PolicyStatus.Active && block.timestamp > policy.expiryDate) {
            policy.status = PolicyStatus.Expired;
        }

        require(policy.status == PolicyStatus.Active, "Policy not active");
        
        // Mark policy as paid out regardless of available funds
        policy.status = PolicyStatus.PaidOut;
        
        // Check contract balance and adjust payout amount if needed
        uint256 requestedAmount = policy.coverageAmount;
        uint256 payoutAmount = requestedAmount;
        
        if (address(this).balance < requestedAmount) {
            payoutAmount = address(this).balance;
            emit PartialPayout(_policyId, requestedAmount, payoutAmount);
        }
        
        // Only attempt transfer if we have funds
        if (payoutAmount > 0) {
            (bool success, ) = policy.farmer.call{value: payoutAmount}("");
            require(success, "Payout transfer failed");
        }
        
        emit PolicyPaidOut(_policyId, policy.farmer, payoutAmount, _weatherValue);
    }
    
    /**
     * @dev Expire policies that have passed their expiry date
     * @param _policyIds Array of policy IDs to check for expiry
     */
    function expirePolicies(uint256[] calldata _policyIds) external {
        for (uint256 i = 0; i < _policyIds.length; i++) {
            uint256 policyId = _policyIds[i];
            Policy storage policy = policies[policyId];
            
            if (policy.status == PolicyStatus.Active && block.timestamp > policy.expiryDate) {
                policy.status = PolicyStatus.Expired;
            }
        }
    }

    function checkAndUpdatePolicyStatus(uint256 _policyId) internal {
        Policy storage policy = policies[_policyId];
        
        if (policy.status == PolicyStatus.Active && block.timestamp > policy.expiryDate) {
            policy.status = PolicyStatus.Expired;
        }
    }
    
    /**
     * @dev Allow contract owner to withdraw funds
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Get details of a specific policy
     * @param _policyId ID of the policy
     */
    function getPolicyDetails(uint256 _policyId) external view returns (
        address farmer,
        uint256 locationId,
        WeatherCondition condition,
        uint256 premium,
        uint256 coverageAmount,
        uint256 threshold,
        uint256 expiryDate,
        PolicyStatus status
    ) {
        Policy storage policy = policies[_policyId];

        // Check if expired but don't update state since this is a view function
        PolicyStatus currentStatus = policy.status;
        if (currentStatus == PolicyStatus.Active && block.timestamp > policy.expiryDate) {
            currentStatus = PolicyStatus.Expired;
        }

        return (
            policy.farmer,
            policy.locationId,
            policy.condition,
            policy.premium,
            policy.coverageAmount,
            policy.threshold,
            policy.expiryDate,
            currentStatus               // Return the current status, which may be different from stored status
        );
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {}
}
