// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {FtsoV2Interface} from "@flarenetwork/flare-periphery-contracts/coston2/FtsoV2Interface.sol";

/// @notice Custom error thrown when the requested history length exceeds available entries
/// @param requested Number of entries requested by the caller
/// @param available Number of entries actually stored
error InsufficientData(uint256 requested, uint256 available);

/**
 * @title PriceRecorder
 * @author Antoine Delamare - https://github.com/adelamare-blockchain
 * @dev Records FLR/USD prices from Flare FTSO V2 and provides historical data retrieval
 */
contract PriceRecorder {
    /// @notice Interface FTSO to fetch fresh data prices
    FtsoV2Interface internal ftsoV2;
    
    /// @notice FLR/USD feed ID  (format 2025)
    bytes21 public constant FLR_USD_FEED_ID = bytes21(0x01464c522f55534400000000000000000000000000); 
    
    /// @dev Struct to store individual price data points in history
    struct PriceData {
        uint256 price;    // Integer representation of the price value
        int8 decimals;    // Number of decimals for the price
        uint64 timestamp; // UNIX timestamp when the price was updated
    }

    /// @notice Array storing all recorded price points in chronological order
    PriceData[] public priceHistory;
    
    /// @notice Emitted when a new price point is recorded
    /// @param price     Recorded price value
    /// @param decimals  Decimal count of the price
    /// @param timestamp Time of the price update
    event PriceRecorded(uint256 price, int8 decimals, uint64 timestamp);

    /**
     * @dev Initialize contract while connecting to FTSO V2 Interface.
     * @param _ftsoV2Override Optional address to override the FTSO interface (for testing)
     */
    constructor(address _ftsoV2Override) {
        if (_ftsoV2Override != address(0)) {
            ftsoV2 = FtsoV2Interface(_ftsoV2Override);
        } else {
            ftsoV2 = ContractRegistry.getFtsoV2();
        }
    }

    /**
     * @notice Fetches the current FLR/USD price from FTSO V2 and appends it to history
     */
    function recordPrice() external {
        // Only refresh FTSO interface if this is a production environment
        // For test environments, we keep the mock that was injected in the constructor
        if (address(ftsoV2) == address(0)) {
            ftsoV2 = ContractRegistry.getFtsoV2();
        }
        
        // Create feed IDs array with FLR/USD
        bytes21[] memory feedIds = new bytes21[](1);
        feedIds[0] = FLR_USD_FEED_ID;
        
        // Interaction: external call to getFeedsById
        (uint256[] memory prices, int8[] memory decimals, uint64 timestamp) = ftsoV2.getFeedsById(feedIds);
        
        // Effects: update storage
        priceHistory.push(PriceData(prices[0], decimals[0], timestamp));
        
         // Interaction: emit event after state change
        emit PriceRecorded(prices[0], decimals[0], timestamp);
    }

    /**
     * @notice Retrieves the last N recorded prices for prediction.
     * @param n Number of historical prices to return.
     * @return lastN PriceData[] Array of the most recent N prices.
     */
    function getLastNPrices(uint256 n) external view returns (PriceData[] memory) {
        if(n > priceHistory.length) revert InsufficientData({requested: n, available: priceHistory.length});
        PriceData[] memory lastN = new PriceData[](n);
        uint256 start = priceHistory.length - n;
        for (uint256 i = 0; i < n; i++) {
            lastN[i] = priceHistory[start + i];
        }
        return lastN;
    }
}