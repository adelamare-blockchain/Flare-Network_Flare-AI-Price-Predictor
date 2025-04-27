// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Mock for FtsoV2Interface
contract MockFtsoV2 {
    uint256[] private prices;
    int8[] private decimalsArray;
    uint64 private timestamp;

    function setFeedData(
        uint256[] memory _prices,
        int8[] memory _decimals,
        uint64 _timestamp
    ) external {
        prices = _prices;
        decimalsArray = _decimals;
        timestamp = _timestamp;
    }

    function getFeedsById(bytes21[] calldata)
        external
        view
        returns (
            uint256[] memory,
            int8[] memory,
            uint64
        )
    {
        return (prices, decimalsArray, timestamp);
    }
}

