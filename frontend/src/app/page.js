"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

// components
import {
  connectContract,
  fetchHistoricalPrices,
  recordPrice,
} from "@/lib/contract";
import {
  getPredictionFromAPI,
  getPredictionFromLocalModel,
} from "@/lib/ai";

// Deployed address
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS; // Replace with your deployed address

// Reusable UI icon components
const MetamaskLogo = () => (
  <svg
    className='w-5 h-5 mr-2'
    viewBox='0 0 35 33'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'>
    {/* SVG paths unchanged */}
  </svg>
);

const CheckIcon = () => (
  <svg
    className='w-5 h-5 mr-2'
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M5 13l4 4L19 7'
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
    xmlns='http://www.w3.org/2000/svg'
    fill='none'
    viewBox='0 0 24 24'>
    <circle
      className='opacity-25'
      cx='12'
      cy='12'
      r='10'
      stroke='currentColor'
      strokeWidth='4'></circle>
    <path
      className='opacity-75'
      fill='currentColor'
      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
  </svg>
);

// Reusable interface components
const ActionButton = ({
  onClick,
  disabled,
  isLoading,
  loadingText,
  icon,
  children,
  className,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center transition-all duration-200 px-4 py-2 rounded-lg font-medium ${
      className || "bg-blue-600 hover:bg-blue-700 text-white"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
    {isLoading ? (
      <>
        <SpinnerIcon />
        {loadingText || "Loading..."}
      </>
    ) : (
      <>
        {icon}
        {children}
      </>
    )}
  </button>
);

const InfoBox = ({ title, icon, children }) => (
  <div className='mt-4 text-xs text-gray-500 border-t pt-3'>
    <p className='flex items-center'>
      {icon || (
        <svg
          className='w-4 h-4 mr-1 text-blue-400'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20 10 10 0 010-20z'
          />
        </svg>
      )}
      {title && <strong className='mr-1'>{title}:</strong>} {children}
    </p>
  </div>
);

const PriceDisplay = ({
  price,
  format = "0.0000",
  prefix = "$",
  suffix,
}) => {
  const formattedPrice =
    typeof price === "number" && !isNaN(price)
      ? price.toFixed(format.split(".")[1]?.length || 4)
      : "---.----";

  return (
    <>
      {prefix}
      {formattedPrice}
      {suffix}
    </>
  );
};

export default function Home() {
  // Grouping related state hooks following React best practices

  // 1. Data states
  const [priceData, setPriceData] = useState({
    prices: [], // Price history
    currentPrice: null, // Latest FLR/USD price
    prediction: null, // Next price prediction
    lastUpdated: null, // Timestamp of last update
  });

  // 2. UI states
  const [uiState, setUiState] = useState({
    isLoading: false, // General loading flag
    error: null, // Error message
    showConnectedAddress: false, // Toggle connected address display
  });

  // 3. Process states
  const [processState, setProcessState] = useState({
    isConnected: false, // Contract connection status
    isRecording: false, // Price recording in progress
    isPredicting: false, // Prediction in progress
  });

  // 4. Smart contract instance
  const [contract, setContract] = useState(null);

  // Helper updaters for concise state updates
  const updatePriceData = (newData) =>
    setPriceData((prev) => ({ ...prev, ...newData }));
  const updateUiState = (newState) =>
    setUiState((prev) => ({ ...prev, ...newState }));
  const updateProcessState = (newState) =>
    setProcessState((prev) => ({ ...prev, ...newState }));

  // Method: Initialize contract connection
  const initConnection = async () => {
    try {
      updateUiState({ isLoading: true, error: null });

      if (window.ethereum) {
        await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        const contractInstance = await connectContract();
        setContract(contractInstance);
        updateProcessState({ isConnected: true });
        updateUiState({ error: null });

        // Fetch the most recent price automatically
        fetchCurrentPrice(contractInstance);
      } else {
        updateUiState({
          error: "MetaMask is not installed or accessible",
        });
      }
    } catch (err) {
      console.error("Connection error:", err);
      updateUiState({
        error: `Connection error: ${err.message || err}`,
      });
    } finally {
      updateUiState({ isLoading: false });
    }
  };

  // Method: Disconnect wallet and reset states
  const disconnectWallet = () => {
    updateProcessState({
      isConnected: false,
      isRecording: false,
      isPredicting: false,
    });
    updateUiState({ showConnectedAddress: false, error: null });
    setContract(null);
    console.log("Wallet successfully disconnected");
  };

  // Fetch the latest price without recording it
  const fetchCurrentPrice = async (contractInstance) => {
    try {
      const contractToUse = contractInstance || contract;
      if (!contractToUse) throw new Error("Contract not connected");

      const historicalPrices = await fetchHistoricalPrices(
        contractToUse,
        1
      );
      if (historicalPrices?.length) {
        const latestPrice = parseFloat(historicalPrices[0].value);
        updatePriceData({
          currentPrice: latestPrice,
          lastUpdated: new Date().toISOString(),
        });
        console.log("Updated current price:", latestPrice);
      }
    } catch (err) {
      console.error("Error fetching current price:", err);
    }
  };

  // Record a new price
  const handleRecordPrice = async () => {
    try {
      updateProcessState({ isRecording: true });
      updateUiState({ error: null });

      if (!contract) {
        updateUiState({
          error:
            "Contract not connected. Please connect your wallet.",
        });
        updateProcessState({ isRecording: false });
        return;
      }

      const result = await recordPrice(contract);

      if (result?.priceData?.price) {
        const price =
          typeof result.priceData.price === "bigint"
            ? Number(result.priceData.price)
            : parseFloat(result.priceData.price);
        const decimals =
          typeof result.priceData.decimals === "bigint"
            ? Number(result.priceData.decimals)
            : result.priceData.decimals;
        const newPrice = price / Math.pow(10, decimals);

        updatePriceData({
          currentPrice: newPrice,
          lastUpdated: new Date().toISOString(),
        });
        console.log("Updated current price after record:", newPrice);
      }

      await loadPrices();
      updateProcessState({ isRecording: false });
    } catch (err) {
      console.error("Error recording price:", err);
      updateUiState({ error: `Error: ${err.message || err}` });
      updateProcessState({ isRecording: false });
    }
  };

  // Load price history
  const loadPrices = async () => {
    try {
      updateUiState({ isLoading: true, error: null });
      if (!contract) throw new Error("Contract not connected");

      const historicalPrices = await fetchHistoricalPrices(
        contract,
        10
      );
      if (!historicalPrices?.length)
        throw new Error("No historical prices found");

      const sortedPrices = [...historicalPrices].sort(
        (a, b) => b.timestamp - a.timestamp
      );

      let currentPriceValue = null;
      if (sortedPrices.length) {
        const first = sortedPrices[0];
        currentPriceValue =
          typeof first.price === "number"
            ? first.price
            : parseFloat(first.price || first.value || 0);
        if (isNaN(currentPriceValue)) {
          console.warn("Failed to convert price to number:", first);
          currentPriceValue = null;
        }
      }

      updatePriceData({
        prices: sortedPrices,
        currentPrice: currentPriceValue,
        lastUpdated: new Date().toISOString(),
      });

      console.log("Loaded historical prices:", sortedPrices.length);
    } catch (err) {
      console.error("Error loading prices:", err);
      updateUiState({ error: `Error: ${err.message || err}` });
    } finally {
      updateUiState({ isLoading: false });
    }
  };

  // AI-powered prediction Price
  const predictPrice = async () => {
    try {
      updateProcessState({ isPredicting: true });
      updateUiState({ isLoading: true, error: null });

      if (!priceData.prices.length) await loadPrices();
      if (!priceData.prices.length)
        throw new Error("Cannot predict without historical data");

      console.log(
        "Starting prediction with",
        priceData.prices.length,
        "historical prices"
      );

      let predictionResult = await getPredictionFromAPI(
        priceData.prices
      );
      if (!predictionResult) {
        console.log("API prediction failed, using local model");
        predictionResult = await getPredictionFromLocalModel(
          priceData.prices
        );
      }

      if (!predictionResult || predictionResult.price === null) {
        throw new Error("Prediction failed");
      }

      console.log("Prediction obtained:", predictionResult);
      updatePriceData({ prediction: predictionResult });
    } catch (err) {
      console.error("Prediction error:", err);
      updateUiState({ error: `Error: ${err.message || err}` });
    } finally {
      updateUiState({ isLoading: false });
      updateProcessState({ isPredicting: false });
    }
  };

  // ComponentDidMount
  useEffect(() => {
    initConnection();
  }, []);

  return (
    <div className='min-h-screen bg-gradient-to-b from-pink-200 to-white flex flex-col'>
      {/* Header */}
      <header className='bg-gray-900 text-white py-4 px-6 shadow-lg'>
        <div className='max-w-7xl mx-auto flex justify-between items-center'>
          {/* Brand */}
          <div className='flex items-center'>
            <div className='relative w-10 h-10 mr-2'>
              <Image
                src='https://dev.flare.network/img/flare_icon_dark.svg'
                alt='Flare Network Logo'
                width={40}
                height={40}
                className='w-full h-full'
              />
            </div>
            <span className='font-semibold text-xl'>
              Flare Network
            </span>
          </div>

          {/* Title */}
          <div className='hidden md:flex flex-col items-center'>
            <h1 className='text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-100'>
              FLR/USD AI-Price Predictor
            </h1>
            <div className='h-1 w-24 mt-1 bg-gradient-to-r from-red-600 to-pink-100 rounded-full' />
          </div>

          {/* Wallet Button */}
          <div>
            {!processState.isConnected ? (
              <button
                onClick={initConnection}
                className='bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-all duration-200 shadow-md cursor-pointer'>
                <MetamaskLogo />
                Connect Wallet
              </button>
            ) : (
              <div className='relative'>
                <button
                  onClick={() =>
                    updateUiState({
                      showConnectedAddress:
                        !uiState.showConnectedAddress,
                    })
                  }
                  className='bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-all duration-200 shadow-md cursor-pointer'>
                  <CheckIcon />
                  Connected
                </button>
                {uiState.showConnectedAddress && (
                  <div className='absolute right-0 mt-2 py-2 w-56 bg-white rounded-md shadow-xl z-20'>
                    <div className='px-4 py-2 text-sm text-gray-700 break-all'>
                      {window.ethereum?.selectedAddress
                        ? `${window.ethereum.selectedAddress.slice(
                            0,
                            6
                          )}...${window.ethereum.selectedAddress.slice(
                            -4
                          )}`
                        : "Address unavailable"}
                    </div>
                    <div className='border-t border-gray-200 mt-2 pt-2'>
                      <button
                        onClick={disconnectWallet}
                        className='w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer'>
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className='flex-grow max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col items-center gap-8'>
        {/* Instructional Overview */}
        <div className='w-full bg-red-50 border border-red-100 rounded-lg p-6 shadow-sm mb-2'>
          <h2 className='text-xl font-semibold text-red-800 mb-2 flex items-center'>
            <svg
              className='w-6 h-6 mr-2'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20 10 10 0 010-20z'
              />
            </svg>
            How does this DApp work?
          </h2>
          <div className='text-sm text-gray-700 space-y-2'>
            <p>
              <strong>1. Contract Connection:</strong> Connect your
              wallet to interact with the smart contract on the Flare
              Network.
            </p>
            <p>
              <strong>2. Price Recording:</strong> Record at least 10x
              the current FLR/USD price from the FTSO oracle.
            </p>
            <p>
              <strong>3. AI Prediction:</strong> After recording more
              than 10x prices, request a prediction for the next price
              based on historical data.
            </p>
            <p>
              <strong>Technology:</strong> This DApp leverages Flare
              Time Series Oracle (FTSO) and Mistral AI for
              predictions.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {uiState.error && (
          <div className='w-full bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md'>
            <div className='flex items-center'>
              <svg
                className='w-6 h-6 mr-2'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              <p>{uiState.error}</p>
            </div>
          </div>
        )}

        {/* Current Price Section */}
        <div className='w-full bg-white p-6 rounded-lg shadow-md'>
          <div className='flex flex-col md:flex-row justify-between items-center'>
            <div className='mb-4 md:mb-0'>
              <h2 className='text-xl font-semibold text-gray-800 mb-2 flex items-center'>
                <svg
                  className='w-6 h-6 mr-2 text-pink-500'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
                Current FLR/USD Price
              </h2>
              <div className='flex items-baseline'>
                <p className='text-4xl font-bold text-pink-600'>
                  <PriceDisplay price={priceData.currentPrice} />
                </p>
                <span className='ml-2 text-sm text-gray-500'>
                  via FTSO Oracle
                </span>
                {priceData.lastUpdated && (
                  <span className='ml-2 text-xs text-gray-400'>
                    (updated:{" "}
                    {new Date(
                      priceData.lastUpdated
                    ).toLocaleTimeString()}
                    )
                  </span>
                )}
              </div>
            </div>

            <div className='flex flex-col'>
              {/* Connection Status */}
              <div
                className={`text-sm mb-3 ${
                  processState.isConnected
                    ? "text-green-600"
                    : "text-orange-500"
                } flex items-center justify-center md:justify-end`}>
                <span
                  className={`inline-block w-3 h-3 rounded-full mr-2 ${
                    processState.isConnected
                      ? "bg-green-500"
                      : "bg-orange-500"
                  }`}></span>
                {processState.isConnected
                  ? "Contract connected"
                  : "Contract disconnected"}
              </div>

              {/* Record Button */}
              <ActionButton
                onClick={handleRecordPrice}
                disabled={
                  !processState.isConnected ||
                  processState.isRecording
                }
                isLoading={processState.isRecording}
                loadingText='Recording...'
                className='bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-lg shadow'
                icon={
                  <svg
                    className='w-5 h-5 mr-2'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4'
                    />
                  </svg>
                }>
                Record Current Price
              </ActionButton>
            </div>
          </div>

          <InfoBox title='Note'>
            Recording a price calls the{" "}
            <code className='bg-gray-100 px-1 rounded'>
              recordPrice()
            </code>{" "}
            function on the smart contract, querying the FTSO oracle.
          </InfoBox>

          {/* FlareScan Explorer Link */}
          <div className='mt-3 text-sm flex items-center'>
            <svg
              className='w-4 h-4 mr-1 text-pink-500'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
              />
            </svg>
            <span className='text-gray-700'>
              Verify transactions on{" "}
            </span>
            <a
              href={`https://coston2.testnet.flarescan.com/address/${contractAddress}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-pink-600 hover:text-pink-800 font-medium ml-1 underline'>
              FlareScan Explorer
            </a>
          </div>
        </div>

        {/* Prediction Section */}
        <div className='w-full bg-white p-6 rounded-lg shadow-md'>
          <div className='flex flex-col md:flex-row justify-between items-center'>
            <div className='mb-4 md:mb-0'>
              <h2 className='text-xl font-semibold text-gray-800 mb-2 flex items-center'>
                <svg
                  className='w-6 h-6 mr-2 text-red-500'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
                Next Price Prediction
              </h2>
              <p className='text-gray-600 mb-2 flex items-center'>
                <svg
                  className='w-4 h-4 mr-1'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                  />
                </svg>
                Based on {priceData.prices.length} recorded historical
                prices
              </p>

              {/* AI Methodologies */}
              <div className='flex flex-wrap gap-2 mt-1'>
                <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800'>
                  <span className='w-2 h-2 mr-1 bg-purple-500 rounded-full'></span>
                  Mistral AI
                </span>
                <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                  <span className='w-2 h-2 mr-1 bg-green-500 rounded-full'></span>
                  ONNX Model
                </span>
                <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                  <span className='w-2 h-2 mr-1 bg-blue-500 rounded-full'></span>
                  Local Algorithm
                </span>
              </div>
            </div>

            {/* AI Prediction button */}
            <button
              className={`${
                priceData.prices.length < 2 ||
                !processState.isConnected
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              } text-white font-bold py-3 px-6 rounded-lg shadow flex items-center transition-all duration-200`}
              onClick={predictPrice}
              disabled={
                priceData.prices.length < 2 ||
                processState.isPredicting ||
                !processState.isConnected
              }>
              {processState.isPredicting ? (
                <>
                  <svg
                    className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'>
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                  </svg>
                  Predicting...
                </>
              ) : (
                <>
                  <svg
                    className='w-5 h-5 mr-2'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
                    />
                  </svg>
                  Predict Next Price
                </>
              )}
            </button>
          </div>

          {/* Contextual help */}
          <div className='mt-4 text-xs text-gray-500 border-t pt-3'>
            <p className='flex items-center'>
              <svg
                className='w-4 h-4 mr-1 text-indigo-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20 10 10 0 010-20z'
                />
              </svg>
              The prediction first uses Mistral AI, then falls back to
              ONNX or the local algorithm if needed.
            </p>
          </div>
        </div>

        {/* Display the prediction and explanation */}
        {priceData.prediction !== null && (
          <div className='w-full bg-blue-50 p-6 border-2 border-blue-200 rounded-lg'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xl font-semibold text-black'>
                Prediction
              </h2>

              {/* Badge showing prediction source */}
              {priceData.prediction.source && (
                <div className='px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-300'>
                  {priceData.prediction.source}
                </div>
              )}
            </div>

            <div className='mt-3'>
              <p className='text-5xl font-bold text-red-700'>
                <PriceDisplay
                  price={priceData.currentPrice}
                  className='text-5xl font-bold text-red-700'
                />
              </p>
            </div>

            {/* AI-provided explanation */}
            {priceData.prediction.explanation && (
              <div className='mt-4 p-4 bg-white rounded-lg border border-blue-100'>
                <h3 className='text-md font-medium text-pink-800 mb-2'>
                  AI Explanation
                </h3>
                <p className='text-sm text-gray-700 italic'>
                  {priceData.prediction.explanation}
                </p>
              </div>
            )}

            <p className='text-sm text-gray-600 mt-4'>
              Generated on {new Date().toLocaleString()}
            </p>
          </div>
        )}

        {/* Historical prices table */}
        {priceData.prices.length > 0 && (
          <div className='w-full bg-white p-6 rounded-lg shadow-md'>
            <h2 className='text-xl font-semibold text-gray-800 mb-4'>
              Historical Prices
            </h2>
            <div className='overflow-auto max-h-60'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th
                      scope='col'
                      className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Date
                    </th>
                    <th
                      scope='col'
                      className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Price (USD)
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {priceData.prices.map((price, index) => (
                    <tr key={index}>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                        {new Date(
                          price.timestamp * 1000
                        ).toLocaleString()}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                        $
                        {typeof price.price === "number"
                          ? price.price.toFixed(4)
                          : parseFloat(
                              price.price || price.value || 0
                            ).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <footer className='bg-gray-900 text-white py-12 mt-16'>
        <div className='max-w-4xl mx-auto px-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {/* Column 1: About */}
            <div>
              <h3 className='text-xl font-semibold mb-4 flex items-center'>
                <svg
                  className='w-5 h-5 mr-2 text-red-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13 10V3L4 14h7v7l9-11h-7z'
                  />
                </svg>
                About
              </h3>
              <p className='text-gray-400 text-sm mb-4'>
                This DApp demonstrates integrating Flare FTSO oracles
                with AI to predict future cryptocurrency prices.
              </p>
              <div className='flex items-center'>
                <div className='w-8 h-8 mr-2'>
                  <Image
                    src='https://dev.flare.network/img/flare_icon_dark.svg'
                    alt='Flare Network Logo'
                    width={32}
                    height={32}
                    className='w-full h-full'
                  />
                </div>
                <span className='text-white font-medium'>
                  Flare Network
                </span>
              </div>
            </div>

            {/* Column 2: Resources */}
            <div>
              <h3 className='text-xl font-semibold mb-4 flex items-center'>
                <svg
                  className='w-5 h-5 mr-2 text-blue-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                  />
                </svg>
                Resources
              </h3>
              <ul className='space-y-2 text-gray-400 text-sm'>
                <li>
                  <a
                    href='https://dev.flare.network'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='hover:text-white transition-colors'>
                    Flare Documentation
                  </a>
                </li>
                <li>
                  <a
                    href='https://dev.flare.network/ftso/overview'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='hover:text-white transition-colors'>
                    FTSO Oracle Guide
                  </a>
                </li>
                <li>
                  <a
                    href='https://mistral.ai/news/mistral-small-3-1'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='hover:text-white transition-colors'>
                    Mistral AI Release Notes
                  </a>
                </li>
                <li>
                  <a
                    href='https://onnxruntime.ai/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='hover:text-white transition-colors'>
                    ONNX Runtime
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Key Concepts */}
            <div>
              <h3 className='text-xl font-semibold mb-4 flex items-center'>
                <svg
                  className='w-5 h-5 mr-2 text-green-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4m3 3V4'
                  />
                </svg>
                Key Concepts
              </h3>
              <ul className='space-y-2 text-gray-400 text-sm'>
                <li className='flex items-center'>
                  <span className='w-2 h-2 bg-red-500 rounded-full mr-2'></span>
                  Smart Contracts
                </li>
                <li className='flex items-center'>
                  <span className='w-2 h-2 bg-yellow-500 rounded-full mr-2'></span>
                  FTSO Oracles
                </li>
                <li className='flex items-center'>
                  <span className='w-2 h-2 bg-green-500 rounded-full mr-2'></span>
                  Artificial Intelligence
                </li>
                <li className='flex items-center'>
                  <span className='w-2 h-2 bg-blue-500 rounded-full mr-2'></span>
                  Time Series Analysis
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright & Credits */}
          <div className='border-t border-gray-800 mt-8 pt-8 text-sm text-gray-500 text-center'>
            <p>
              © {new Date().getFullYear()} Flare AI Price Predictor
              DApp - Built for the Flare Dev Ambassador Program
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
