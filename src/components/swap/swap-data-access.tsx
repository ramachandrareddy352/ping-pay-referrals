import { getSwapProgram, getSwapProgramId } from '@/lib/swap-exports'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Cluster, Connection, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '@/components/cluster/cluster-data-access'
import { useAnchorProvider } from '@/components/solana/use-anchor-provider'
import { useTransactionToast } from '@/components/use-transaction-toast'
import { toast } from 'sonner'
import * as anchor from '@coral-xyz/anchor'
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  AccountLayout,
} from '@solana/spl-token'
import { MEA_SPL2022_MINT, MEA_SPL_MINT } from '@/lib/utils'

export function useSwapProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const queryClient = useQueryClient()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const { publicKey } = useWallet()
  const programId = useMemo(() => getSwapProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getSwapProgram(provider, programId), [provider, programId])

  const statePda = useMemo(() => {
    return PublicKey.findProgramAddressSync([Buffer.from('state')], program.programId)[0]
  }, [program])

  const vaultPda = useMemo(() => {
    return PublicKey.findProgramAddressSync([Buffer.from('vault')], program.programId)[0]
  }, [program])

  const treasuryPda = useMemo(() => {
    return PublicKey.findProgramAddressSync([Buffer.from('treasury')], program.programId)[0]
  }, [program])

  const vaultSplAta = useMemo(() => {
    return getAssociatedTokenAddressSync(MEA_SPL_MINT, vaultPda, true, TOKEN_PROGRAM_ID)
  }, [vaultPda])

  const vaultSpl22Ata = useMemo(() => {
    return getAssociatedTokenAddressSync(MEA_SPL2022_MINT, vaultPda, true, TOKEN_2022_PROGRAM_ID)
  }, [vaultPda])

  const treasurySplAta = useMemo(() => {
    return getAssociatedTokenAddressSync(MEA_SPL_MINT, treasuryPda, true, TOKEN_PROGRAM_ID)
  }, [treasuryPda])

  const treasurySpl22Ata = useMemo(() => {
    return getAssociatedTokenAddressSync(MEA_SPL2022_MINT, treasuryPda, true, TOKEN_2022_PROGRAM_ID)
  }, [treasuryPda])

  const userSplAta = useMemo(() => {
    if (!publicKey) return null
    return getAssociatedTokenAddressSync(MEA_SPL_MINT, publicKey, false, TOKEN_PROGRAM_ID)
  }, [publicKey])

  const userSpl22Ata = useMemo(() => {
    if (!publicKey) return null
    return getAssociatedTokenAddressSync(MEA_SPL2022_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID)
  }, [publicKey])

  type TokenBalance = {
    ata: PublicKey
    // mint: PublicKey;
    // owner: PublicKey;
    amount: string
    // decimals: number;
  }

  const useMultipleBalances = (connection: Connection, atas: PublicKey[]) => {
    return useQuery({
      queryKey: ['multi-balances', ...atas.map((a) => a.toBase58())],
      enabled: atas.length > 0,
      queryFn: async (): Promise<(TokenBalance | null)[]> => {
        const accounts = await connection.getMultipleAccountsInfo(atas)

        return accounts.map((acc, index) => {
          if (!acc) return null

          // Ensure it's a token account (SPL or 2022)
          if (!acc.owner.equals(TOKEN_PROGRAM_ID) && !acc.owner.equals(TOKEN_2022_PROGRAM_ID)) {
            return null
          }

          const decoded = AccountLayout.decode(acc.data)

          // const mint = new PublicKey(decoded.mint);
          // const owner = new PublicKey(decoded.owner);

          const rawAmount = BigInt(decoded.amount.toString())

          // 6 decimals
          const decimals = 6n
          const divisor = 10n ** decimals

          // integer part
          const whole = rawAmount / divisor

          // fractional part (scaled to 4 decimals)
          const fraction = (rawAmount % divisor) / 10n ** (decimals - 4n)

          // format safely
          const uiAmount = `${whole}.${fraction.toString().padStart(4, '0')}`

          return {
            ata: atas[index],
            // mint,
            // owner,
            amount: uiAmount,
          }
        })
      },
    })
  }

  const useUserBalances = (connection: Connection, atas: PublicKey[]) => {
    return useQuery({
      queryKey: ['user-balances', ...atas.map((a) => a.toBase58())],
      enabled: atas.length > 0,
      queryFn: async (): Promise<(TokenBalance | null)[]> => {
        const accounts = await connection.getMultipleAccountsInfo(atas)

        return accounts.map((acc, index) => {
          if (!acc) return null

          // Ensure it's a token account (SPL or 2022)
          if (!acc.owner.equals(TOKEN_PROGRAM_ID) && !acc.owner.equals(TOKEN_2022_PROGRAM_ID)) {
            return null
          }

          const decoded = AccountLayout.decode(acc.data)

          // const mint = new PublicKey(decoded.mint);
          // const owner = new PublicKey(decoded.owner);

          const rawAmount = BigInt(decoded.amount.toString())

          // 6 decimals
          const decimals = 6n
          const divisor = 10n ** decimals

          // integer part
          const whole = rawAmount / divisor

          // fractional part (scaled to 4 decimals)
          const fraction = (rawAmount % divisor) / 10n ** (decimals - 4n)

          // format safely
          const uiAmount = `${whole}.${fraction.toString().padStart(4, '0')}`

          return {
            ata: atas[index],
            // mint,
            // owner,
            amount: uiAmount,
          }
        })
      },
    })
  }

  const { data: balances } = useMultipleBalances(connection, [
    vaultSplAta,
    vaultSpl22Ata,
    treasurySplAta,
    treasurySpl22Ata,
  ])

  const userAtas = useMemo(() => {
    if (!userSplAta || !userSpl22Ata) return []
    return [userSplAta, userSpl22Ata]
  }, [userSplAta, userSpl22Ata])

  const { data: userBalances } = useUserBalances(connection, userAtas)

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', cluster],
    enabled: !!programId,
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initialize = useMutation({
    mutationKey: ['swap-state', 'initialize', cluster],
    mutationFn: () => program.methods.initialize(20).rpc(),
    onSuccess: async (signature) => {
      transactionToast(signature)
      queryClient.invalidateQueries({
        queryKey: ['swap-state', cluster],
      })
    },
    onError: () => {
      toast.error('Failed to initialize account')
    },
  })

  const swapStateQuery = useQuery({
    queryKey: ['swap-state', cluster],
    enabled: !!program && !!statePda,
    queryFn: async () => {
      try {
        return await program.account.swapState.fetch(statePda)
      } catch (error) {
        console.error('Error fetching swap state account:', error)
        return null
      }
    },
  })

  const updateFeeMutation = useMutation({
    mutationKey: ['swap-state', 'updateFee', cluster],
    mutationFn: (feeBps: number) => {
      return program.methods.updateFee(feeBps).rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      queryClient.invalidateQueries({
        queryKey: ['swap-state', cluster],
      })
    },
    onError: (error) => {
      console.error('Update fee failed:', error)
    },
  })

  const updateAdminMutation = useMutation({
    mutationKey: ['swap-state', 'updateAdmin', cluster],
    mutationFn: (newAdmin: string) => {
      return program.methods.updateAdmin(new PublicKey(newAdmin)).rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      queryClient.invalidateQueries({
        queryKey: ['swap-state', cluster],
      })
    },
    onError: (error) => {
      console.error('Update admin failed:', error)
    },
  })

  const withdrawFeesMutation = useMutation({
    mutationKey: ['withdrawFees', cluster],
    mutationFn: () => {
      return program.methods
        .withdrawFees()
        .accounts({
          mea2022: MEA_SPL2022_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          token2022Program: TOKEN_2022_PROGRAM_ID,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'multi-balances',
      })
    },
    onError: (error) => {
      console.error('Withdraw fees failed:', error)
    },
  })

  const add2022ReserveMutation = useMutation({
    mutationKey: ['add2022Reserve', cluster],
    mutationFn: (amount: string) => {
      return program.methods
        .add2022Reserve(new anchor.BN(amount))
        .accounts({
          mea2022: MEA_SPL2022_MINT,
          token2022Program: TOKEN_2022_PROGRAM_ID,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'multi-balances',
      })
    },
    onError: (error) => {
      console.error('Add 2022 reserve failed:', error)
    },
  })

  const addSplReserveMutation = useMutation({
    mutationKey: ['addSplReserve', cluster],
    mutationFn: (amount: string) => {
      return program.methods.addSplReserve(new anchor.BN(amount)).accounts({ tokenProgram: TOKEN_PROGRAM_ID }).rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'multi-balances',
      })
    },
    onError: (error) => {
      console.error('Add SPL reserve failed:', error)
    },
  })

  const swapSplTo2022 = useMutation({
    mutationKey: ['swapSplTo2022', cluster],
    mutationFn: (amount: string) => {
      return program.methods
        .swapSplToSpl2022(new anchor.BN(amount))
        .accounts({
          mea2022: MEA_SPL2022_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          token2022Program: TOKEN_2022_PROGRAM_ID,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'user-balances',
      })
    },
    onError: (error) => {
      console.error('Swap SPL to 2022 failed:', error)
    },
  })

  const swap2022ToSpl = useMutation({
    mutationKey: ['swap2022ToSpl', cluster],
    mutationFn: (amount: string) => {
      return program.methods
        .swapSpl2022ToSpl(new anchor.BN(amount))
        .accounts({
          mea2022: MEA_SPL2022_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          token2022Program: TOKEN_2022_PROGRAM_ID,
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'user-balances',
      })
    },
    onError: (error) => {
      console.error('Swap 2022 to SPL failed:', error)
    },
  })

  return {
    program,
    programId,
    getProgramAccount,
    initialize,
    swapStateQuery,
    updateFeeMutation,
    updateAdminMutation,
    withdrawFeesMutation,
    add2022ReserveMutation,
    addSplReserveMutation,
    swapSplTo2022,
    swap2022ToSpl,
    balances,
    vaultSpl22Ata,
    vaultSplAta,
    userBalances,
  }
}
