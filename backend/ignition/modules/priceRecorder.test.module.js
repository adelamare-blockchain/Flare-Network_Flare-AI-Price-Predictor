// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const {
  buildModule,
} = require("@nomicfoundation/hardhat-ignition/modules");

// constants

// yarn hardhat ignition deploy ignition/modules/priceRecorder.test.module.js

// address from library ContractRegistry
const FLARE_REGISTRY_ADDRESS =
  "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

// Module Ignition for tests
const PriceRecorderModule = buildModule(
  "PriceRecorderTestModule",
  (m) => {
    // Mock FtsoV2 deployment
    const mockFtsoV2 = m.contract("MockFtsoV2", [], {
      id: "MockFtsoV2Contract",
    });

    // Mock ContractRegistry deployment
    const mockContractRegistry = m.contract(
      "MockContractRegistry",
      [mockFtsoV2],
      {
        id: "MockContractRegistryContract",
        after: [mockFtsoV2],
      }
    );

    // priceRecorder deployment
    const priceRecorder = m.contract("PriceRecorder", [mockFtsoV2], {
      id: "priceRecorderContract",
      after: [mockFtsoV2],
    });

    return { priceRecorder, mockFtsoV2, mockContractRegistry };
  }
);

module.exports = PriceRecorderModule;
