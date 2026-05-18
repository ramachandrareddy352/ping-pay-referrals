// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import SplSwapIDL from './spl_swap.json'
import type { SplSwap } from './spl_swap'

// Re-export the generated IDL and type
export { SplSwap, SplSwapIDL }

// The programId is imported from the program IDL.
export const COUNTER_PROGRAM_ID = new PublicKey(SplSwapIDL.address)

// This is a helper function to get the Anchor program.
export function getSwapProgram(provider: AnchorProvider, address?: PublicKey): Program<SplSwap> {
  return new Program({ ...SplSwapIDL, address: address ? address.toBase58() : SplSwapIDL.address } as SplSwap, provider)
}

export function getSwapProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID
      return new PublicKey('FkC52qZsfzR4gxwV8Si7T69zz7Mh6QJ4rWhjVr3SYG8P')
    case 'mainnet-beta':
    default:
      return COUNTER_PROGRAM_ID
  }
}
