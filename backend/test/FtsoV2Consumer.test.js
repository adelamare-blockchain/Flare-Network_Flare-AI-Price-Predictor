// test/FtsoV2Consumer.test.js
const { expect } = require("chai");
const hre = require("hardhat");
const {
  buildModule,
} = require("@nomicfoundation/hardhat-ignition/modules");

// Components
const PriceRecorderModule = require("../ignition/modules/priceRecorder.test.module");

// Constants
const FLR_USD_FEED_ID =
  "0x01464c522f55534400000000000000000000000000";

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
