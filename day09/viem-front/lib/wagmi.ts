import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, localhost } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia, localhost],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [localhost.id]: http(),
  },
})