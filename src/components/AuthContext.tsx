/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import bs58 from 'bs58'

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://api-platform.pingpay.info'
const AUTH_STORAGE_PREFIX = 'pingpay_auth_'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStoredToken = (address: string): string | null => {
  try {
    return localStorage.getItem(`${AUTH_STORAGE_PREFIX}${address}`)
  } catch {
    return null
  }
}
const storeToken = (address: string, token: string) => {
  try {
    localStorage.setItem(`${AUTH_STORAGE_PREFIX}${address}`, token)
  } catch {}
}
export const clearStoredToken = (address: string) => {
  try {
    localStorage.removeItem(`${AUTH_STORAGE_PREFIX}${address}`)
  } catch {}
}

const safeFetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const res = await fetch(input, init)
  const text = await res.text()
  try {
    const parsed = JSON.parse(text)
    if (!res.ok) throw new Error(parsed?.message || `HTTP ${res.status}`)
    return parsed
  } catch {
    throw new Error(`Invalid response: ${text.slice(0, 100)}`)
  }
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextType {
  bearerToken: string | null
  authLoading: boolean
  authError: string | null
  /** Force a fresh signature even if a cached token exists */
  reauthenticate: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected } = useWallet()

  const [bearerToken, setBearerToken] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const prevAddressRef = useRef<string | null>(null)

  // ── Core sign-in ─────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (address: string, force = false): Promise<string | null> => {
      // Return cached token if available and not forcing
      if (!force) {
        const stored = getStoredToken(address)
        if (stored) {
          setBearerToken(stored)
          return stored
        }
      }

      setAuthLoading(true)
      setAuthError(null)

      try {
        const init = await safeFetchJson(`${BASE_URL}/user/a/initiate-sign-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })

        const msgBytes = new TextEncoder().encode(init.body.message)
        if (!signMessage) throw new Error('Wallet does not support message signing')
        const signature = await signMessage(msgBytes)
        const sig58 = bs58.encode(signature)

        const auth = await safeFetchJson(`${BASE_URL}/user/a/sign-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, signature: sig58 }),
        })

        const token = auth?.body?.token
        if (!token) throw new Error('No token received')

        storeToken(address, token)
        setBearerToken(token)
        return token
      } catch (e: any) {
        const msg = e.message || 'Authentication failed'
        setAuthError(msg)
        setBearerToken(null)
        return null
      } finally {
        setAuthLoading(false)
      }
    },
    [signMessage],
  )

  // ── Auto sign-in when wallet connects / account changes ───────────────────────
  useEffect(() => {
    if (!publicKey || !connected) {
      setBearerToken(null)
      setAuthError(null)
      return
    }

    const address = publicKey.toBase58()

    // Account changed → clear old cached token and re-authenticate
    if (prevAddressRef.current && prevAddressRef.current !== address) {
      clearStoredToken(prevAddressRef.current)
      setBearerToken(null)
    }

    prevAddressRef.current = address
    signIn(address)
  }, [publicKey, connected])

  const reauthenticate = useCallback(async (): Promise<string | null> => {
    if (!publicKey) return null
    const address = publicKey.toBase58()
    clearStoredToken(address)
    return signIn(address, true)
  }, [publicKey, signIn])

  return (
    <AuthContext.Provider value={{ bearerToken, authLoading, authError, reauthenticate }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
