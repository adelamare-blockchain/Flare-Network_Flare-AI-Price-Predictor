export const contractABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_ftsoV2Override",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "requested",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "available",
        type: "uint256",
      },
    ],
    name: "InsufficientData",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "int8",
        name: "decimals",
        type: "int8",
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "timestamp",
        type: "uint64",
      },
    ],
    name: "PriceRecorded",
    type: "event",
  },
  {
    inputs: [],
    name: "FLR_USD_FEED_ID",
    outputs: [
      {
        internalType: "bytes21",
        name: "",
        type: "bytes21",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "n",
        type: "uint256",
      },
    ],
    name: "getLastNPrices",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "price",
            type: "uint256",
          },
          {
            internalType: "int8",
            name: "decimals",
            type: "int8",
          },
          {
            internalType: "uint64",
            name: "timestamp",
            type: "uint64",
          },
        ],
        internalType: "struct PriceRecorder.PriceData[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "priceHistory",
    outputs: [
      {
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        internalType: "int8",
        name: "decimals",
        type: "int8",
      },
      {
        internalType: "uint64",
        name: "timestamp",
        type: "uint64",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "recordPrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
