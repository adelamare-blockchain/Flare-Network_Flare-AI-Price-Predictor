require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv/config");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  paths: {
    artifacts: "../frontend/src/artifacts",
  },
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    apiKey: {
      coston2: process.env.FLARESCAN_API_KEY
        ? `${process.env.FLARESCAN_API_KEY}`
        : "",
    },
    customChains: [
      {
        network: "coston2",
        chainId: 114,
        urls: {
          // faucet: https://faucet.flare.network/coston2
          apiURL:
            "https://api.routescan.io/v2/network/testnet/evm/114/etherscan", // Must not have / endpoint
          browserURL: "https://coston2.testnet.flarescan.com/",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
  networks: {
    coston2: {
      url: "https://coston2-api.flare.network/ext/C/rpc",
      accounts: process.env.COSTON2_PRIVATE_KEY
        ? [`0x${process.env.COSTON2_PRIVATE_KEY}`]
        : [],
      chainId: 114,
    },
  },
};
