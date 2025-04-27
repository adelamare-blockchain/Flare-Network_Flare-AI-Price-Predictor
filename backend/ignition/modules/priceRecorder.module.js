// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition
const hre = require("hardhat");
const {
  buildModule,
} = require("@nomicfoundation/hardhat-ignition/modules");

// Deployement script :
// yarn hardhat ignition deploy ignition/modules/priceRecorder.module.js --network coston2 --verify

// constants

// Module Ignition
const PriceRecorderModule = buildModule(
  "PriceRecorderModule",
  (m) => {
    // priceRecorder deployment
    const priceRecorder = m.contract(
      "PriceRecorder",
      [hre.ethers.ZeroAddress],
      {
        id: "priceRecorderContract",
      }
    );

    return { priceRecorder };
  }
);

module.exports = PriceRecorderModule;
