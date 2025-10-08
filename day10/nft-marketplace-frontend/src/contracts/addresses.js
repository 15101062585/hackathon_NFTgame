// src/contracts/addresses.js
export const CONTRACT_ADDRESSES = {
  // 请替换为你的实际合约地址
  NFTMarket: "0xdb819529f72568472e9b5857741171A4F4AC3258",
  NFT: "0xEd663faC23dD5D2914E48493fc43639E46C721F3", 
  ERC20: "0x5F97a3a99B590D93fF798b7dCE5E917d4eEd8778"
};

export const CHAIN_CONFIG = {
  chainId: "0xaa36a7", // Sepolia 测试网
  chainName: "Sepolia",
  rpcUrls: ["https://sepolia.infura.io/v3/f30e6c1b7e74434e8a28fba71d8f6331"],
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18
  },
  blockExplorerUrls: ["https://sepolia.etherscan.io"]
};