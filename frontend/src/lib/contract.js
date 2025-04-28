import { ethers } from "ethers";
import { contractABI } from "@/utils/abi";

// Deployed address
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS; // Replace with your deployed address
export async function connectContract() {
  if (!contractAddress) {
    throw new Error(
      "Contract address is not defined in environment variables"
    );
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(contractAddress, contractABI, signer);
}

// Record a new price
export async function recordPrice(contract) {
  try {
    // Set explicit transaction parameters to avoid gas estimation issues
    const overrides = {
      gasLimit: 300000, // More reasonable limit now that the contract is simplified
      maxFeePerGas: ethers.parseUnits("100", "gwei"), // Appropriate value for the Flare network
      maxPriorityFeePerGas: ethers.parseUnits("5", "gwei"), // Standard priority fee
    };

    console.log("Recording FLR/USD price in progress...");
    // Execute the transaction with the specified parameters
    const tx = await contract.recordPrice(overrides);
    console.log("Transaction sent, hash:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait(1);
    console.log("Transaction confirmed");

    // Check if the PriceRecorded event has been emitted
    const priceRecordedEvent = receipt.logs.find((log) => {
      try {
        return log.fragment && log.fragment.name === "PriceRecorded";
      } catch {
        return false;
      }
    });

    // Extract event data if available
    let eventData = null;
    if (priceRecordedEvent) {
      try {
        // Decode the event parameters
        eventData = {
          price: priceRecordedEvent.args[0],
          decimals: priceRecordedEvent.args[1],
          timestamp: priceRecordedEvent.args[2],
        };
        console.log("Recorded price:", eventData);
      } catch (err) {
        console.warn(
          "Unable to decode the PriceRecorded event:",
          err
        );
      }
    }

    return {
      success: true, // Success if the transaction is confirmed
      hash: tx.hash,
      receipt: receipt,
      priceData: eventData,
    };
  } catch (error) {
    console.error("Error recording price:", error);

    // Simplified handling of common errors
    if (error.code === "CALL_EXCEPTION") {
      throw new Error(
        `Error during FTSO call: ${error.message}. ` +
          `Check your connection to the Coston2 network.`
      );
    } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
      throw new Error(
        `Gas estimation failed: ${error.message}. ` +
          `The Flare network may be congested or the FTSO temporarily unavailable.`
      );
    } else if (error.message && error.message.includes("network")) {
      throw new Error(
        `Network issue: ${error.message}. ` +
          `Ensure you are connected to the Coston2 network.`
      );
    }

    // Generic message for other errors
    throw new Error(`Error: ${error.message || error}`);
  }
}

// Get the number of entries in history
export async function getPriceHistoryLength(contract) {
  // This function does not exist directly in the contract, so we'll
  // try fetching the element at index 0 to see if the array is empty
  try {
    await contract.priceHistory(0);
    // If this does not throw an error, there is at least one entry
    return 1;
  } catch (error) {
    // If it's an out-of-bounds error, the array is empty
    if (error.message.includes("invalid array access")) {
      return 0;
    }
    // Rethrow other errors
    throw error;
  }
}

// Fetch historical prices with adaptive quantity handling
export async function fetchHistoricalPrices(contract, n = 10) {
  // Utility function to wait for a specified delay
  const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Retrieval parameters with retry
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds between attempts

  // Function to attempt price retrieval with enhanced error handling
  async function attemptFetchPrices(retryCount = 0) {
    try {
      // 1. First try getLastNPrices if the requested number is reasonable
      // Ensure n is a standard number (not BigInt)
      const nNumber = typeof n === "bigint" ? Number(n) : n;
      if (nNumber <= 20) {
        // Limit the number to avoid errors
        try {
          const prices = await contract.getLastNPrices(nNumber);
          return prices.map((p) => {
            // Safely convert to Number type to avoid BigInt errors
            const priceNum =
              typeof p.price === "bigint"
                ? Number(p.price)
                : Number(p.price);
            const decimalsNum =
              typeof p.decimals === "bigint"
                ? Number(p.decimals)
                : Number(p.decimals);
            const timestampNum =
              typeof p.timestamp === "bigint"
                ? Number(p.timestamp)
                : Number(p.timestamp);
            return {
              price: priceNum / Math.pow(10, decimalsNum),
              timestamp: timestampNum,
            };
          });
        } catch (directError) {
          // If the error isn't due to lack of data, rethrow
          if (
            !directError.message.includes("CALL_EXCEPTION") &&
            !directError.message.includes("Not enough data")
          ) {
            throw directError;
          }
          // Otherwise, try the alternative approach
        }
      }

      // 2. Alternative approach: first determine how many entries exist
      // By counting one by one from index 0
      let historyLength = 0;

      try {
        console.log("Checking for existing recorded prices...");
        await contract.priceHistory(0);
        historyLength = 1;

        // Find the actual size by checking subsequent entries
        let checking = true;
        while (checking) {
          try {
            await contract.priceHistory(historyLength);
            historyLength++;
          } catch {
            checking = false;
          }
        }

        console.log(`${historyLength} prices found in the contract`);
      } catch (lengthError) {
        // If we can't even access index 0, there is no data
        if (retryCount < maxRetries) {
          console.log(
            `Attempt ${
              retryCount + 1
            }/${maxRetries} - No prices found, retrying in ${
              retryDelay / 1000
            }s...`
          );
          await sleep(retryDelay);
          return attemptFetchPrices(retryCount + 1);
        }
        throw new Error(
          "No prices have been recorded in the contract. Please record prices first."
        );
      }

      // 3. If entries were found, fetch as many as possible
      if (historyLength > 0) {
        const actualN = Math.min(historyLength, nNumber);
        console.log(`Fetching the last ${actualN} prices...`);

        try {
          const prices = await contract.getLastNPrices(actualN);
          return prices.map((p) => {
            const priceNum =
              typeof p.price === "bigint"
                ? Number(p.price)
                : Number(p.price);
            const decimalsNum =
              typeof p.decimals === "bigint"
                ? Number(p.decimals)
                : Number(p.decimals);
            const timestampNum =
              typeof p.timestamp === "bigint"
                ? Number(p.timestamp)
                : Number(p.timestamp);
            return {
              price: priceNum / Math.pow(10, decimalsNum),
              timestamp: timestampNum,
            };
          });
        } catch (lastNError) {
          console.error(
            "Error calling getLastNPrices despite available entries:",
            lastNError
          );
          // Manually retrieve entries one by one
          if (historyLength > 0) {
            console.log(
              "Attempting manual retrieval of entries one by one..."
            );
            const manualPrices = [];
            const startIdx = Math.max(0, historyLength - actualN);
            for (let i = startIdx; i < historyLength; i++) {
              const entry = await contract.priceHistory(i);
              const priceNum =
                typeof entry.price === "bigint"
                  ? Number(entry.price)
                  : Number(entry.price);
              const decimalsNum =
                typeof entry.decimals === "bigint"
                  ? Number(entry.decimals)
                  : Number(entry.decimals);
              const timestampNum =
                typeof entry.timestamp === "bigint"
                  ? Number(entry.timestamp)
                  : Number(entry.timestamp);
              manualPrices.push({
                price: priceNum / Math.pow(10, decimalsNum),
                timestamp: timestampNum,
              });
            }
            return manualPrices;
          }
        }
      }

      // If we reach this point, we've tried everything but failed
      throw new Error(
        "Unable to fetch historical prices despite several attempts."
      );
    } catch (error) {
      // If we have remaining retries, try again
      if (
        retryCount < maxRetries &&
        (error.message.includes("CALL_EXCEPTION") ||
          error.message.includes("No prices"))
      ) {
        console.log(
          `Attempt ${
            retryCount + 1
          }/${maxRetries} failed - retrying in ${
            retryDelay / 1000
          }s...`
        );
        await sleep(retryDelay);
        return attemptFetchPrices(retryCount + 1);
      }
      throw error;
    }
  }

  // Start the retrieval process with retry mechanism
  return attemptFetchPrices();
}
