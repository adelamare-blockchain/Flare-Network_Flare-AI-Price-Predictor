import * as ort from "onnxruntime-web";

// Use the standard chat API instead of the agents API which requires a configured agent
const API_URL = "https://api.mistral.ai/v1/chat/completions";
const MODEL_ID = "mistral-small-latest"; // Standard Mistral model

// Cloud-based prediction with Mistral AI API (hypothetical)
export async function getPredictionFromAPI(prices) {
  // Quickly verify if environment variables are accessible
  if (
    typeof process === "undefined" ||
    !process.env ||
    (!process.env.NEXT_PUBLIC_MISTRAL_API_KEY &&
      !process.env.NEXT_PUBLIC_MISTRAL_AI_PRIVATE_KEY)
  ) {
    console.log(
      "Mistral API key not available, falling back to the local model"
    );
    return null;
  }

  // Extract temporal information from the data to enrich the context
  const timeRange =
    prices.length > 0
      ? {
          start: new Date(prices[0].timestamp * 1000).toISOString(),
          end: new Date(
            prices[prices.length - 1].timestamp * 1000
          ).toISOString(),
        }
      : { start: "unknown", end: "unknown" };

  // Calculate basic statistics to enrich the prompt
  const priceValues = prices.map((p) => p.price);
  const stats =
    priceValues.length > 0
      ? {
          min: Math.min(...priceValues).toFixed(4),
          max: Math.max(...priceValues).toFixed(4),
          avg: (
            priceValues.reduce((sum, p) => sum + p, 0) /
            priceValues.length
          ).toFixed(4),
          count: priceValues.length,
        }
      : { min: 0, max: 0, avg: 0, count: 0 };

  // Format statistics for the prompt
  const statsFormatted = `
  - Number of observations: ${stats.count}
  - Minimum price: $${stats.min}
  - Maximum price: $${stats.max}
  - Average price: $${stats.avg}
  - Period: ${timeRange.start} to ${timeRange.end}
  `;

  // Format price list for the prompt
  const pricesFormatted = prices
    .map(
      (p, i) =>
        `#${i + 1}: $${p.price.toFixed(4)} (${
          new Date(p.timestamp * 1000).toLocaleString().split(",")[0]
        })`
    )
    .join("\n");

  // Build messages according to Mistral Chat API
  // Expected sequence: system (optional) -> user -> assistant -> user -> ...
  const messages = [
    // 1) ROLE = system: long-term context with detailed instructions
    {
      role: "system",
      content: `You are a financial analyst specializing in predicting the FLR/USD price on the Flare network.
      
Your role:
- Analyze the provided historical FLR/USD price data
- Generate an accurate prediction for the next price
- Explain your reasoning in a clear and educational manner
- Mention trend factors, volatility, and regression models
- Structure your response by always starting with the predicted price (numeric format), followed by an explanation

Desired response format:
"The next predicted price is [PRICE] USD. This prediction is based on [EXPLANATION]..."`,
    },

    // 2) ROLE = user: Mistral API requires that the first message after system is a user message
    {
      role: "user",
      content: `I need a FLR/USD price prediction based on the following historical data:
      
${statsFormatted}

Price history:
${pricesFormatted}

Can you predict the next price and explain your reasoning?

I require:
1. A precise numeric prediction (start with this)
2. A detailed explanation including trend and your methodology
3. A confidence level for this prediction`,
    },

    // 3) ROLE = assistant with prefix=true to guide response format
    {
      role: "assistant",
      content: "The next predicted price is ",
      prefix: true,
    },
  ];

  const body = {
    model: MODEL_ID, // Use a standard model instead of an agent
    max_tokens: 256, // Increase to allow more detailed explanations
    stream: false,
    messages,
    temperature: 0.7, // Moderate creativity
    top_p: 0.9, // Diversity parameter
    response_format: { type: "text" },
    presence_penalty: 0.2, // Slightly increased to encourage diversity
    frequency_penalty: 0.3, // Reduce repetition
    random_seed: Math.floor(Date.now() / 1000), // Add dynamic seed for session consistency
  };

  try {
    // Check for Mistral API key availability (accepted under both env var names)
    const apiKey =
      process.env.NEXT_PUBLIC_MISTRAL_API_KEY ||
      process.env.NEXT_PUBLIC_MISTRAL_AI_PRIVATE_KEY;

    // Disable API call in development if no key is set
    if (!apiKey || apiKey.trim() === "") {
      console.log(
        "No valid Mistral API key configured in environment variables"
      );
      console.log(
        "To enable the Mistral API, check your key in the .env file"
      );
      return null;
    }

    console.log("Mistral API key found! Using Mistral AI API...");

    console.log("Attempting prediction via Mistral API...");

    // Correct authorization header format according to Mistral documentation
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Verify response status before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    // Verify response structure
    if (
      !data.choices ||
      !data.choices[0] ||
      !data.choices[0].message ||
      !data.choices[0].message.content
    ) {
      console.error("Unexpected API response format:", data);
      return null;
    }

    // Parse the AI's response text
    const aiResponse = data.choices[0].message.content;
    console.log("Full Mistral API response:", aiResponse);

    // Advanced regex to accurately extract the predicted price
    const priceRegex =
      /(?:predicted price|prediction|estimated).{1,10}(?:is of|is|:)?\s*([0-9]+[.,][0-9]+)/i;
    const priceMatch = aiResponse.match(priceRegex);

    let predictedValue = null;
    if (priceMatch && priceMatch[1]) {
      // Normalize numeric format (handle comma/dot decimal)
      const normalizedNumber = priceMatch[1].replace(",", ".");
      predictedValue = parseFloat(normalizedNumber);

      if (isNaN(predictedValue)) {
        // Fallback: find the first number in the response
        const simpleMatch = aiResponse.match(/\d+([.,]\d+)?/);
        if (simpleMatch) {
          predictedValue = parseFloat(
            simpleMatch[0].replace(",", ".")
          );
        }
      }
    } else {
      // Fallback: find the first number in the response
      const simpleMatch = aiResponse.match(/\d+([.,]\d+)?/);
      if (simpleMatch) {
        predictedValue = parseFloat(simpleMatch[0].replace(",", "."));
      }
    }

    // Separate the explanation from the price
    let explanation = aiResponse;

    // Cleanly split explanation if priceMatch found near start
    if (predictedValue !== null && priceMatch) {
      const priceIndex = aiResponse.indexOf(priceMatch[0]);
      if (priceIndex < 50 && priceIndex !== -1) {
        const afterPrice = aiResponse.substring(
          priceIndex + priceMatch[0].length
        );
        explanation = afterPrice.replace(/^\s*[.,:;]\s*/, "");
      }
    }

    // Return both the predicted value and the enriched explanation
    return {
      price: predictedValue,
      explanation: explanation,
      timestamp: Date.now(),
      source: "Mistral AI",
    };
  } catch (error) {
    console.error("Mistral API inaccessible:", error);
    return null;
  }
}

// Fallback method based on a simple weighted moving average
export async function getPredictionFromLocalModel(prices) {
  try {
    console.log("Using simple local prediction model...");

    // Ensure prices are available
    if (!prices || prices.length === 0) {
      console.error("No prices available for prediction");
      return null;
    }

    // First, attempt to load ONNX model if present
    try {
      console.log("Attempting to load ONNX model...");
      const modelPath = "/model.onnx";

      // Check if the model exists
      const modelResponse = await fetch(modelPath, {
        method: "HEAD",
      });
      if (modelResponse.ok) {
        console.log("ONNX model found, using it");
        const session = await ort.InferenceSession.create(modelPath);
        const input = new Float32Array(prices.map((p) => p.price));
        const tensor = new ort.Tensor("float32", input, [
          1,
          input.length,
        ]);
        const feeds = { input: tensor };
        const results = await session.run(feeds);
        return {
          price: results.output.data[0],
          explanation:
            "Prediction generated by the ONNX model trained on historical data.",
          source: "ONNX Model",
        };
      } else {
        console.log("ONNX model not found, using fallback algorithm");
      }
    } catch (onnxError) {
      console.warn("Error loading ONNX model:", onnxError);
      console.log("Using fallback algorithm...");
    }

    // Fallback: weighted average with more weight on recent prices
    const pricesToUse = prices.slice(-5);

    if (pricesToUse.length === 0) {
      return null;
    }

    if (pricesToUse.length === 1) {
      return pricesToUse[0].price;
    }

    const recentPrices = pricesToUse.map((p) => p.price);
    const weights = Array.from(
      { length: recentPrices.length },
      (_, i) => i + 1
    );
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    const weightedSum = recentPrices.reduce((acc, price, i) => {
      return acc + price * weights[i];
    }, 0);
    const weightedAvg = weightedSum / totalWeight;
    const lastPrice = recentPrices[recentPrices.length - 1];
    const secondLastPrice = recentPrices[recentPrices.length - 2];
    const trend = lastPrice - secondLastPrice;

    const prediction = weightedAvg + trend * 0.5;
    const predictedPrice = parseFloat(prediction.toFixed(4));

    let explanation = "";
    if (trend > 0) {
      const trendPercent = ((trend / secondLastPrice) * 100).toFixed(
        2
      );
      explanation = `Based on the analysis of the ${
        recentPrices.length
      } most recent prices, an upward trend of ${trendPercent}% is observed. The prediction is based on a weighted average of ${weightedAvg.toFixed(
        4
      )} adjusted for this positive trend.`;
    } else if (trend < 0) {
      const trendPercent = (
        (Math.abs(trend) / secondLastPrice) *
        100
      ).toFixed(2);
      explanation = `Based on the analysis of the ${
        recentPrices.length
      } most recent prices, a downward trend of ${trendPercent}% is observed. The prediction is based on a weighted average of ${weightedAvg.toFixed(
        4
      )} adjusted for this negative trend.`;
    } else {
      explanation = `Based on the analysis of the ${
        recentPrices.length
      } most recent prices, the market is stable (no change). The prediction is based solely on the weighted average of recent prices (${weightedAvg.toFixed(
        4
      )}).`;
    }

    return {
      price: predictedPrice,
      explanation: explanation,
      source: "Local Algorithm",
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error during local prediction:", error);
    return prices.length > 0
      ? {
          price: prices[prices.length - 1].price,
          explanation:
            "Prediction could not be computed. Using the last known price as a substitute.",
          source: "Simple Fallback",
          timestamp: Date.now(),
        }
      : null;
  }
}
