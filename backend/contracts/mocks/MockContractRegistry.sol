// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IFlareContractRegistryMock {
    function getContractAddressByHash(bytes32 _nameHash) external view returns (address);
    // Other methods if needed…
}

// Mock pour ContractRegistry
contract MockContractRegistry is IFlareContractRegistryMock {
    address private immutable ftsoV2Address;

    constructor(address _ftsoV2Address) {
        require(_ftsoV2Address != address(0), "Wrong address");
        ftsoV2Address = _ftsoV2Address;
    }

    function getContractAddressByHash(bytes32) 
        external view override returns (address) 
    {
        return ftsoV2Address;
    }
}