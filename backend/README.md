<h1 align="center">Flare AI Price Predictor - Backend</h1>

<div align="center">
  <img src="https://dev.flare.network/img/flare_icon_dark.svg" alt="Flare Network Logo" width="150" />
</div>

<div align="center">
  <p>
    <a href="#"><img src="https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity" alt="Solidity 0.8.28"></a>
    <a href="#"><img src="https://img.shields.io/badge/Hardhat-2.23.0-f7f745?logo=hardhat" alt="Hardhat 2.23.0"></a>
    <a href="#"><img src="https://img.shields.io/badge/Flare_FTSO-0.1.22-FF5733" alt="Flare FTSO Integration"></a>
    <a href="#"><img src="https://img.shields.io/badge/Ethers.js-6.4.0-3C3C3D?logo=ethereum" alt="Ethers.js 6.4.0"></a>
    <a href="#"><img src="https://img.shields.io/badge/TypeChain-8.3.0-3178C6?logo=typescript" alt="TypeChain 8.3.0"></a>
  </p>
</div>

## 📑 Table of Contents

- [Overview](#-overview)
- [Project Architecture](#-project-architecture)
- [Smart Contract Details](#-smart-contract-details)
  - [PriceRecorder.sol](#pricerecordersol)
  - [Key Functions](#key-functions)
- [FTSO Integration](#-ftso-integration)
- [Testing Framework](#-testing-framework)
- [Deployment](#-deployment)
  - [Using Hardhat Ignition](#using-hardhat-ignition)
  - [Manual Deployment](#manual-deployment)
- [Environment Configuration](#-environment-configuration)
- [Installation & Setup](#-installation--setup)
- [Learning Exercises](#-learning-exercises)
- [Troubleshooting](#-troubleshooting)
- [Resources](#-resources)
- [Flare Ambassador Program](#-flare-ambassador-program)

## 🚀 Overview

This backend component of the Flare AI Price Predictor dApp serves as the blockchain interface for retrieving and storing FLR/USD price data from the Flare Time Series Oracle (FTSO). The smart contract provides a secure, transparent, and permanent record of historical prices which are then used by the AI component to generate price predictions.

The project demonstrates:

- **Oracle Integration**: Direct interaction with Flare's FTSO
- **Time Series Data**: On-chain storage and retrieval of chronological price data
- **Clean Architecture**: Separation of concerns between data retrieval and storage
- **Efficient Gas Usage**: Optimized for minimal transaction costs

This is an educational project designed for developers who want to learn how to:

1. Interact with blockchain oracles
2. Store time-series data on-chain efficiently
3. Integrate smart contracts with frontend applications
4. Build decentralized AI prediction systems

## 📐 Project Architecture

The backend implements a clean, modular architecture:

```shell
backend/
├── contracts/                # Smart contracts
│   └── PriceRecorder.sol     # Main contract for FTSO interaction & data storage
├── test/                     # Test suite
│   └── FtsoV2Consumer.test.js # Tests for the PriceRecorder contract
├── ignition/                 # Hardhat Ignition deployment system
│   └── modules/
│       └── priceRecorder.module.js  # Deployment configuration
├── .env                      # Environment variables (not committed)
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Dependencies and scripts
└── README.md                 # Documentation
```

## 📄 Smart Contract Details

### PriceRecorder.sol

The `PriceRecorder` contract is the core of the backend system. It performs two main functions:

1. **Price Retrieval**: Connects to Flare's FTSO to get the current FLR/USD price
2. **Historical Storage**: Maintains an on-chain record of all retrieved prices

```solidity
contract PriceRecorder {
    // Interface to interact with FTSO
    FtsoV2Interface internal ftsoV2;

    // Feed ID for FLR/USD (format 2025)
    bytes21 public constant FLR_USD_FEED_ID = bytes21(0x01464c522f55534400000000000000000000000000);

    // Structure for historical price data
    struct PriceData {
        uint256 price;    // The price value
        int8 decimals;    // Decimal places
        uint64 timestamp; // When the price was updated
    }

    // Array storing price history
    PriceData[] public priceHistory;

    // Event emitted when a new price is recorded
    event PriceRecorded(uint256 price, int8 decimals, uint64 timestamp);

    // Contract functions...
}
```

### Key Functions

#### Constructor

The constructor initializes the contract by getting the current instance of the FTSO V2 interface from the Flare contract registry:

```solidity
constructor() {
    ftsoV2 = ContractRegistry.getFtsoV2();
}
```

#### recordPrice()

This function retrieves the current FLR/USD price from the FTSO and stores it in the on-chain history:

```solidity
function recordPrice() external {
    // Get the latest FTSO instance (best practice)
    ftsoV2 = ContractRegistry.getFtsoV2();

    // Create array with FLR/USD feed ID
    bytes21[] memory feedIds = new bytes21[](1);
    feedIds[0] = FLR_USD_FEED_ID;

    // Get price data directly from FTSO
    (uint256[] memory prices, int8[] memory decimals, uint64 timestamp) = ftsoV2.getFeedsById(feedIds);

    // Store in history
    priceHistory.push(PriceData(prices[0], decimals[0], timestamp));

    // Emit event for tracking
    emit PriceRecorded(prices[0], decimals[0], timestamp);
}
```

#### getLastNPrices(uint256 n)

Retrieves the most recent N prices for historical analysis:

```solidity
function getLastNPrices(uint256 n) external view returns (PriceData[] memory) {
    if(n > priceHistory.length) revert InsufficientData({requested: n, available: priceHistory.length});
    PriceData[] memory lastN = new PriceData[](n);
    for (uint256 i = 0; i < n; i++) {
        lastN[i] = priceHistory[priceHistory.length - n + i];
    }
    return lastN;
}
```

## 🔮 FTSO Integration

The Flare Time Series Oracle (FTSO) is a decentralized oracle system that provides price feeds for various assets. Key points about the FTSO integration:

1. **Contract Registry**

   - The contract uses `ContractRegistry.getFtsoV2()` to get the latest FTSO interface
   - This ensures compatibility with any future updates to the FTSO system

2. **Feed IDs**

   - Assets in FTSO are identified by feed IDs
   - For FLR/USD: `0x01464c522f55534400000000000000000000000000`
   - Format: First byte (0x01) is the type, followed by the asset pair in ASCII

3. **Price Formatting**

   - Prices are returned as integers with a separate decimals value
   - Example: If price = 12345 and decimals = 3, the actual price is 12.345
   - This approach ensures precision when dealing with fractional values

4. **Best Practices**
   - Always refresh the FTSO instance before each call (as done in `recordPrice()`)
   - Handle decimals correctly when displaying prices in the frontend

## 🧪 Testing Framework

The project uses Hardhat's testing framework with Ignition for deployment in tests:

```javascript
describe("PriceRecorder", function () {
  // Global variables for tests
  let priceRecorder, mockFtsoV2, mockRegistry;
  let owner, addr1;

  beforeEach(async () => {
    // 1️⃣ Get signers for tests
    [owner, addr1] = await hre.ethers.getSigners();

    // 2️⃣ contracts deployment through Ignition
    try {
      const deployment = await hre.ignition.deploy(
        PriceRecorderModule
      );

      // 3️⃣ Get contracts instances
      priceRecorder = deployment.priceRecorder;
      mockFtsoV2 = deployment.mockFtsoV2;
      mockRegistry = deployment.mockContractRegistry;

      console.log("✅ Contracts deployed with success");
      console.log(
        `📄 MockFtsoV2 deployed at: ${await mockFtsoV2.getAddress()}`
      );
      console.log(
        `📄 PriceRecorder deployed at: ${await priceRecorder.getAddress()}`
      );
    } catch (error) {
      console.error("❌ Error during deployment: ", error);
      throw error;
    }
  });

  it("should record and correctly display FLR/USD price", async () => {
    // 4️⃣ Configure mock to retrieve a set of datas
    const sampleValue = 123456n;
    const sampleDecimals = 3n;
    const sampleTs = 1_700_000_000n;

    try {
      // Use setFeedData method defined inside MockFtsoV2 contracts
      await mockFtsoV2.setFeedData(
        [sampleValue], // values
        [sampleDecimals], // decimals
        sampleTs // timestamp
      );
      console.log("✅ Mock successfully configured");

      // ➡️ Call of function to test
      const tx = await priceRecorder.recordPrice();
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed: ${receipt.hash}`);

      // 🔍 Verify with getLastNPrices(1)
      const last = await priceRecorder.getLastNPrices(1);
      console.log("📊 Data recovered: ", {
        price: last[0].price.toString(),
        decimals: last[0].decimals.toString(),
        timestamp: last[0].timestamp.toString(),
      });

      expect(last[0].price).to.equal(sampleValue);
      expect(last[0].decimals).to.equal(sampleDecimals);
      expect(last[0].timestamp).to.equal(sampleTs);
      console.log("✅ All assertions are validated");
    } catch (error) {
      console.error("❌ Error during test: ", error);
      throw error;
    }
  });

  it("should fail correctly when requesting more prices than available", async () => {
    // Verify that the getLastNPrices function fails correctly
    await expect(
      priceRecorder.getLastNPrices(1)
    ).to.be.revertedWithCustomError(
      priceRecorder,
      "InsufficientData"
    );
  });
});
```

Key testing concepts demonstrated:

1. **Mock Objects**: The tests use mock implementations of the FTSO and Contract Registry
2. **Test Isolation**: Each test runs with a fresh deployment using `beforeEach`
3. **Behavioral Testing**: The tests verify the contract behavior rather than implementation details

To run the tests:

```bash
npx hardhat test

# For gas usage reporting
REPORT_GAS=true npx hardhat test
```

## 🚢 Deployment

### Using Hardhat Ignition

Hardhat Ignition provides a declarative, reproducible deployment system. The project includes a deployment module:

```javascript
const PriceRecorderModule = buildModule(
  "PriceRecorderModule",
  (m) => {
    // Deploy PriceRecorder contract
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
```

To deploy with Ignition:

```bash
# Deploy to Coston2 testnet
npx hardhat ignition deploy ./ignition/modules/priceRecorder.module.js --network coston2 --verify
```

### Manual Deployment

For more control, you can write a script inside `scripts/deploy.js` and deploy it manually:

```bash
# Deploy to Coston2 testnet
npx hardhat run scripts/deploy.js --network coston2
```

## 🔐 Environment Configuration

The project requires environment variables for secure deployment and verification:

```env
# .env file example
COSTON2_PRIVATE_KEY=your_private_key_without_0x_prefix
FLARESCAN_API_KEY=your_flarescan_api_key_for_verification
FLARE_EXPLORER_API_KEY=your_flare_explorer_api_key
```

To use these variables, create a `.env` file in the project root with the values above.

## 🛠️ Installation & Setup

1. **Clone the repository**

```bash
git clone https://github.com/adelamare-blockchain/Flare-Network_Flare-AI-Price-Predictor.git
cd flare-price-predictor/backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

Create a `.env` file with your private keys and API keys.

4. **Compile contracts**

```bash
npx hardhat compile
```

5. **Run tests**

```bash
npx hardhat test
```

6. **Deploy to testnet**

```bash
npx hardhat ignition deploy ./ignition/modules/priceRecorder.module.js --network coston2 --verify
```

## 📚 Learning Exercises

To deepen your understanding of this project, try these exercises:

1. **Extend the contract to support multiple asset pairs**

   - Modify `PriceRecorder.sol` to track prices of additional assets (e.g., FLR/EUR, FLR/BTC)
   - Update the data structure to map asset pairs to their historical prices
   - Add a function to get the latest prices for all supported pairs

2. **Implement price aggregation functions**

   - Add a function to calculate the average price over a specific time period
   - Create a function to find the highest and lowest prices in the history
   - Implement a simple moving average calculation on-chain

3. **Add access control**

   - Restrict who can call `recordPrice()` using OpenZeppelin's `Ownable` or `AccessControl`
   - Implement a role-based system for different types of price recorders
   - Add a whitelist for approved price recorders

4. **Optimize gas usage**
   - Analyze the current gas consumption using `hardhat-gas-reporter`
   - Identify opportunities to reduce gas costs in the contract
   - Implement and test your optimizations

## 🔍 Troubleshooting

### Common Issues

1. **FTSO Connection Failure**

   - Ensure you're connected to the correct network (Coston2 testnet)
   - Verify the Contract Registry address is correct for the network
   - Check that your node provider (RPC URL) is operational

2. **Deployment Errors**

   - Verify your private key is correct in the `.env` file
   - Ensure you have sufficient testnet FLR for gas fees
   - Check network connectivity to the Coston2 testnet

3. **Test Failures**
   - Run tests with `--verbose` flag for more details
   - Ensure mock objects are correctly configured
   - Verify that contract interfaces have not changed

## 📖 Resources

- [Flare Network Documentation](https://dev.flare.network/)
- [FTSO Documentation](https://dev.flare.network/ftso/getting-started)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [Hardhat Ignition Guide](https://hardhat.org/ignition/docs/overview)

## 🏆 Flare Ambassador Program

This project is part of the Flare Ambassador Program, which aims to promote innovation and development on the Flare Network.

For more information, visit the [Flare Developer Portal](https://dev.flare.network/).

---

<div align="center">
  <p>
    <strong>© 2025 Flare AI Price Predictor</strong><br>
    Built for the Flare Ambassador Program
  </p>
</div>
