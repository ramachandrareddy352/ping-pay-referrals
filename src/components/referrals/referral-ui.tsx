/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import {
  Copy,
  Share2,
  Lock,
  Unlock,
  ExternalLink,
  X,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowDownToLine,
  Store,
  TrendingUp,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import { VersionedTransaction, Transaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { useLang } from '../lang-provider'

// ─── i18n ─────────────────────────────────────────────────────────────────────

const translations = {
  ko: {
    pageTitle: '추천 & 적립',
    connected: '연결됨',
    connectWallet: '지갑 연결',
    connectDesc: '지갑을 연결하여 추천 보상을 확인하고 스토어를 관리하며 수익을 인출하세요.',
    authenticating: '인증 중',
    authDesc: '지갑에서 메시지에 서명해주세요...',
    authFailed: '인증 실패',
    tryAgain: '다시 시도',
    refresh: '새로고침',
    yourReferralCode: '내 추천 코드',
    shareDesc: '이 코드를 스토어 오너와 공유하여 모든 거래에서 수수료를 받으세요.',
    sharePingPay: 'PingPay 스토어 링크 공유',
    locked: '잠금',
    available: '사용 가능',
    withdraw: '인출',
    referralRate: '현재 추천 수수료율',
    referralRateDesc: '추천 스토어의 모든 거래에서 플랫폼 수수료의',
    referralRateDesc2: '를 받습니다.',
    lockNote: '⚡ 보상은 30일 후 인출 가능합니다.',
    yourMerchants: '추천한 스토어',
    stores: '개 스토어',
    noMerchants: '아직 추천한 스토어가 없습니다',
    noMerchantsDesc: '추천 코드를 스토어 오너와 공유하여 수수료를 받아보세요.',
    earned: '적립',
    withdrawTokens: '토큰 인출',
    balance: '잔액',
    exceedsBalance: '잔액 초과',
    enterAmount: '금액을 입력하세요',
    receiveAs: '받을 토큰',
    processing: '처리 중...',
    signingTx: '지갑에서 트랜잭션에 서명해주세요...',
    submitting: '출금 요청 중...',
    successTitle: '인출 성공!',
    successDesc: '토큰이 곧 전송됩니다.',
    txHash: '트랜잭션 해시',
    done: '완료',
    failedTitle: '인출 실패',
    failedDesc: '문제가 발생했습니다. 다시 시도해주세요.',
    cancel: '취소',
    referralEarnings: '추천 수익',
    txHistory: '거래 내역',
    noTxYet: '아직 거래 내역이 없습니다',
    processed: '처리됨',
    referralFee: '추천 수수료',
    copyTxHash: '트랜잭션 해시 복사',
    max: '최대',
    unnamedBusiness: '이름 없는 스토어',
  },
  en: {
    pageTitle: 'Refer & Earn',
    connected: 'Connected',
    connectWallet: 'Connect Wallet',
    connectDesc: 'Connect your wallet to view referral rewards, track referred stores, and withdraw your earnings.',
    authenticating: 'Authenticating',
    authDesc: 'Please sign the message in your wallet...',
    authFailed: 'Authentication Failed',
    tryAgain: 'Try Again',
    refresh: 'Refresh',
    yourReferralCode: 'Your Referral Code',
    shareDesc: 'Share this code with merchant owners to earn commissions on every transaction they process.',
    sharePingPay: 'Share PingPay Store Link',
    locked: 'Locked',
    available: 'Available',
    withdraw: 'Withdraw',
    referralRate: 'Current Referral Rate',
    referralRateDesc: 'You earn',
    referralRateDesc2: 'of the platform fee from every transaction at your referred stores.',
    lockNote: '⚡ Rewards are locked for 30 days before becoming available.',
    yourMerchants: 'Your Referred Merchants',
    stores: 'stores',
    noMerchants: 'No referred merchants yet',
    noMerchantsDesc: 'Share your referral code with store owners to start earning commission.',
    earned: 'earned',
    withdrawTokens: 'Withdraw Tokens',
    balance: 'Balance',
    exceedsBalance: 'Exceeds balance',
    enterAmount: 'Enter at least one amount',
    receiveAs: 'Receive as',
    processing: 'Processing...',
    signingTx: 'Please sign the transaction in your wallet...',
    submitting: 'Submitting withdrawal...',
    successTitle: 'Withdrawal Successful!',
    successDesc: 'Your tokens are on their way.',
    txHash: 'Transaction Hash',
    done: 'Done',
    failedTitle: 'Withdrawal Failed',
    failedDesc: 'Something went wrong. Please try again.',
    cancel: 'Cancel',
    referralEarnings: 'Referral Earnings',
    txHistory: 'Transaction History',
    noTxYet: 'No transactions yet',
    processed: 'Processed',
    referralFee: 'Your Referral Fee',
    copyTxHash: 'Copy Transaction Hash',
    max: 'MAX',
    unnamedBusiness: 'Unnamed Store',
  },
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://api-platform.pingpay.info'
const IMAGE_BASE = 'https://meapay-merchant-prod.s3.ap-northeast-2.amazonaws.com/'
const PLAY_STORE_LINK = 'https://play.google.com/store/apps/details?id=com.ping_pay'
const AUTH_STORAGE_PREFIX = 'pingpay_auth_'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReferredStore {
  business_id: number
  business: {
    id: number
    merchantId?: number
    businessName: string | null
    businessImage?: string | null
    banner?: string | null
    siteUrl?: string | null
    description?: string | null
  }
  aggregated: {
    total: { usdt: { amount: number }; mea: { amount: number } }
    locked: { usdt: { amount: number }; mea: { amount: number } }
  }
}

interface ReferralRewardTransaction {
  _id: string
  payment_id: string
  status: string
  type: string
  transaction?: {
    processed?: { symbol: string; amount: number }
    fees?: { platform_share?: { symbol: string; amount: number } }
    rewards?: {
      referrer_reward?: { symbol: string; amount: number; percentage?: number }
    }
    tx?: { hash: string; time?: string }
  }
}

type TokenType = 'mea' | 'usdt'
type ModalStep = 'form' | 'processing' | 'success' | 'failed'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt6 = (n: number) => n.toFixed(6)
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`
  return n.toFixed(4)
}

const imageUrl = (path?: string | null): string | null => {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${IMAGE_BASE}${path}`
}

const shortHash = (s?: string) => (s && s.length > 10 ? `${s.slice(0, 6)}...${s.slice(-4)}` : s || '-')

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

// ─── Auth Storage ─────────────────────────────────────────────────────────────

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
const clearStoredToken = (address: string) => {
  try {
    localStorage.removeItem(`${AUTH_STORAGE_PREFIX}${address}`)
  } catch {}
}

// ─── Token Icon ───────────────────────────────────────────────────────────────

function TokenIcon({ symbol, size = 20 }: { symbol: string; size?: number }) {
  const s = symbol.toLowerCase()
  const style: React.CSSProperties = { width: size, height: size, borderRadius: size / 2, flexShrink: 0 }
  if (s === 'mea') {
    return <img src="/apple-touch-icon.png" alt="MEA" style={style} className="object-cover" />
  }
  if (s === 'usdt') {
    return (
      <div style={style} className="bg-[#26a17b] flex items-center justify-center text-white font-black">
        <span style={{ fontSize: size * 0.5 }}>₮</span>
      </div>
    )
  }
  return <div style={style} className="bg-neutral-400 dark:bg-neutral-600" />
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800 ${className}`} />
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-all"
    >
      {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  )
}

// ─── Balance Mini Card ────────────────────────────────────────────────────────

function BalanceMiniCard({ symbol, amount, color }: { symbol: string; amount: number; color: string }) {
  return (
    <div className="rounded-xl p-3 space-y-1 bg-neutral-100 dark:bg-neutral-800/60">
      <div className="flex items-center gap-1.5">
        <TokenIcon symbol={symbol} size={13} />
        <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">{symbol.toUpperCase()}</span>
      </div>
      <p className="text-base lg:text-lg font-black" style={{ color }}>
        {fmt6(amount)}
      </p>
    </div>
  )
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────

function WithdrawModal({
  visible,
  meaFree,
  usdtFree,
  bearerToken,
  onClose,
  onSuccess,
  t,
}: {
  visible: boolean
  meaFree: number
  usdtFree: number
  bearerToken: string | null
  onClose: () => void
  onSuccess: () => void
  t: (typeof translations)['en']
}) {
  const { connection } = useConnection()
  const { signTransaction } = useWallet()
  const [meaAmount, setMeaAmount] = useState('')
  const [usdtAmount, setUsdtAmount] = useState('')
  const [receive, setReceive] = useState<TokenType>('usdt')
  const [step, setStep] = useState<ModalStep>('form')
  const [stepLabel, setStepLabel] = useState('')
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')

  const meaVal = parseFloat(meaAmount) || 0
  const usdtVal = parseFloat(usdtAmount) || 0
  const isDisabled = (meaVal <= 0 && usdtVal <= 0) || meaVal > meaFree || usdtVal > usdtFree

  const handleWithdraw = async () => {
    const mea = parseFloat(meaAmount) || 0
    const usdt = parseFloat(usdtAmount) || 0
    if (mea <= 0 && usdt <= 0) {
      setError(t.enterAmount)
      return
    }
    if (mea > meaFree) {
      setError(`${t.exceedsBalance} (${fmt6(meaFree)} MEA)`)
      return
    }
    if (usdt > usdtFree) {
      setError(`${t.exceedsBalance} (${fmt6(usdtFree)} USDT)`)
      return
    }
    setError('')
    setStep('processing')
    setStepLabel(t.submitting)
    try {
      const amounts: { symbol: string; amount: number }[] = []
      if (mea > 0) amounts.push({ symbol: 'mea', amount: mea })
      if (usdt > 0) amounts.push({ symbol: 'usdt', amount: usdt })
      const res = await fetch(`${BASE_URL}/v2/user/r/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearerToken}` },
        body: JSON.stringify({ amounts, receive }),
      })
      const json = await res.json()
      if (!json.success || !json.body?.encodedTx) throw new Error(json.message || 'Failed')
      setStepLabel(t.signingTx)
      const txBytes = Buffer.from(json.body.encodedTx, 'base64')
      let signature: string
      try {
        const vTx = VersionedTransaction.deserialize(new Uint8Array(txBytes))
        if (!signTransaction) throw new Error('no signTransaction')
        const signed = await signTransaction(vTx as any)
        signature = await connection.sendRawTransaction((signed as any).serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        })
      } catch {
        const lTx = Transaction.from(txBytes)
        if (!signTransaction) throw new Error('no signTransaction')
        const signed = await signTransaction(lTx)
        signature = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        })
      }
      setTxHash(signature)
      setStep('success')
      onSuccess()
    } catch (e: any) {
      console.error('Withdraw error:', e)
      setStep('failed')
    }
  }

  const handleClose = () => {
    setStep('form')
    setMeaAmount('')
    setUsdtAmount('')
    setReceive('usdt')
    setError('')
    setTxHash('')
    onClose()
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border overflow-hidden max-h-[92vh] flex flex-col bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        </div>

        {step === 'form' && (
          <div className="overflow-y-auto">
            <div className="p-5 sm:p-7 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-neutral-900 dark:text-white">
                  <ArrowDownToLine size={22} className="text-[#890AD7]" />
                  {t.withdrawTokens}
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* MEA input */}
              <div className="rounded-2xl overflow-hidden border border-[#890AD7]/25 bg-neutral-50 dark:bg-neutral-800">
                <div className="h-0.5 bg-[#890AD7]" />
                <div className="p-4 sm:p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TokenIcon symbol="mea" size={22} />
                      <span className="text-sm sm:text-base font-bold text-[#890AD7]">MEA</span>
                    </div>
                    <button
                      onClick={() => setMeaAmount(String(meaFree))}
                      className="text-xs sm:text-sm font-bold text-[#890AD7] px-3 py-1 rounded-full bg-[#890AD7]/10 hover:bg-[#890AD7]/20 transition-all"
                    >
                      {t.max}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={meaAmount}
                    onChange={(e) => {
                      setMeaAmount(e.target.value)
                      setError('')
                    }}
                    placeholder="0.000000"
                    className="w-full bg-transparent text-2xl sm:text-3xl font-black outline-none text-neutral-900 dark:text-white placeholder-neutral-300 dark:placeholder-neutral-600"
                  />
                  <p className="text-xs sm:text-sm text-neutral-400 dark:text-neutral-500">
                    {t.balance}:{' '}
                    <span className="text-neutral-600 dark:text-neutral-300 font-medium">{fmt6(meaFree)} MEA</span>
                    {meaVal > meaFree && <span className="text-red-500 ml-2">{t.exceedsBalance}</span>}
                  </p>
                </div>
              </div>

              {/* USDT input */}
              <div className="rounded-2xl overflow-hidden border border-[#26a17b]/25 bg-neutral-50 dark:bg-neutral-800">
                <div className="h-0.5 bg-[#26a17b]" />
                <div className="p-4 sm:p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TokenIcon symbol="usdt" size={22} />
                      <span className="text-sm sm:text-base font-bold text-[#26a17b]">USDT</span>
                    </div>
                    <button
                      onClick={() => setUsdtAmount(String(usdtFree))}
                      className="text-xs sm:text-sm font-bold text-[#26a17b] px-3 py-1 rounded-full bg-[#26a17b]/10 hover:bg-[#26a17b]/20 transition-all"
                    >
                      {t.max}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={usdtAmount}
                    onChange={(e) => {
                      setUsdtAmount(e.target.value)
                      setError('')
                    }}
                    placeholder="0.000000"
                    className="w-full bg-transparent text-2xl sm:text-3xl font-black outline-none text-neutral-900 dark:text-white placeholder-neutral-300 dark:placeholder-neutral-600"
                  />
                  <p className="text-xs sm:text-sm text-neutral-400 dark:text-neutral-500">
                    {t.balance}:{' '}
                    <span className="text-neutral-600 dark:text-neutral-300 font-medium">{fmt6(usdtFree)} USDT</span>
                    {usdtVal > usdtFree && <span className="text-red-500 ml-2">{t.exceedsBalance}</span>}
                  </p>
                </div>
              </div>

              {/* Receive as */}
              <div className="space-y-2">
                <p className="text-sm sm:text-base font-semibold text-neutral-500 dark:text-neutral-400">
                  {t.receiveAs}
                </p>
                <div className="flex gap-3">
                  {(['mea', 'usdt'] as TokenType[]).map((tk) => {
                    const isSelected = receive === tk
                    const color = tk === 'mea' ? '#890AD7' : '#26a17b'
                    return (
                      <button
                        key={tk}
                        onClick={() => setReceive(tk)}
                        className="flex-1 flex items-center justify-center gap-2 h-12 sm:h-14 rounded-xl border transition-all font-bold text-sm sm:text-base"
                        style={{
                          borderColor: isSelected ? color : undefined,
                          backgroundColor: isSelected ? `${color}15` : undefined,
                          color: isSelected ? color : undefined,
                        }}
                      >
                        <TokenIcon symbol={tk} size={18} />
                        {tk.toUpperCase()}
                        {isSelected && <CheckCircle2 size={14} className="text-emerald-500" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm sm:text-base text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl p-3 border border-red-200 dark:border-red-500/20">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                onClick={handleWithdraw}
                disabled={isDisabled}
                className="w-full h-14 sm:h-16 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
              >
                <ArrowDownToLine size={20} />
                {t.withdraw}
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-12 flex flex-col items-center gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#890AD7]/10 border-2 border-[#890AD7]/30 flex items-center justify-center">
              <Loader2 size={36} className="text-[#890AD7] animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">{t.processing}</h3>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{stepLabel}</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 sm:p-10 flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">{t.successTitle}</h3>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{t.successDesc}</p>
            </div>
            {txHash && (
              <div className="w-full rounded-xl p-4 flex items-center justify-between border bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
                <div>
                  <p className="text-xs sm:text-sm text-neutral-400 mb-1">{t.txHash}</p>
                  <p className="text-sm sm:text-base font-semibold font-mono text-neutral-700 dark:text-neutral-300">
                    {shortHash(txHash)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <CopyButton text={txHash} />
                  <a
                    href={`https://explorer.solana.com/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 transition-all"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            )}
            <button
              onClick={handleClose}
              className="w-full h-12 sm:h-14 rounded-2xl font-black text-white text-base sm:text-lg"
              style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
            >
              {t.done}
            </button>
          </div>
        )}

        {step === 'failed' && (
          <div className="p-8 flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/25 flex items-center justify-center">
              <X size={36} className="text-red-500" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">{t.failedTitle}</h3>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{t.failedDesc}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={handleClose}
                className="flex-1 h-12 sm:h-14 rounded-2xl font-bold text-sm sm:text-base border transition-all text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => setStep('form')}
                className="flex-1 h-12 sm:h-14 rounded-2xl font-black text-white text-sm sm:text-base"
                style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
              >
                {t.tryAgain}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Store Detail Modal ───────────────────────────────────────────────────────

function StoreDetailModal({
  store,
  transactions,
  modalLoading,
  onClose,
  t,
}: {
  store: ReferredStore | null
  transactions: ReferralRewardTransaction[]
  modalLoading: boolean
  onClose: () => void
  t: (typeof translations)['en']
}) {
  if (!store) return null

  const { business, aggregated } = store
  const bannerUrl = imageUrl(business.banner)
  const imgUrl = imageUrl(business.businessImage)
  const totalUsdt = aggregated?.total?.usdt?.amount ?? 0
  const totalMea = aggregated?.total?.mea?.amount ?? 0
  const lockedUsdt = aggregated?.locked?.usdt?.amount ?? 0
  const lockedMea = aggregated?.locked?.mea?.amount ?? 0
  const availableUsdt = totalUsdt - lockedUsdt
  const availableMea = totalMea - lockedMea

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border overflow-hidden max-h-[92vh] flex flex-col bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
        {/* Banner */}
        <div className="relative shrink-0">
          {bannerUrl ? (
            <img src={bannerUrl} className="w-full h-32 sm:h-44 object-cover" alt="banner" />
          ) : (
            <div className="w-full h-32 sm:h-44 bg-linear-to-br from-[#890AD7]/20 to-[#890AD7]/5" />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-all"
          >
            <X size={16} />
          </button>
          <div className="absolute -bottom-8 left-5 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-white dark:border-neutral-900 overflow-hidden shadow-lg">
            {imgUrl ? (
              <img src={imgUrl} className="w-full h-full object-cover" alt="store" />
            ) : (
              <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-2xl">
                🏪
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          <div className="px-5 sm:px-6 pt-12 pb-8 space-y-5">
            {/* Name + verified */}
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white truncate">
                {business.businessName || t.unnamedBusiness}
              </h2>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-black">✓</span>
              </div>
            </div>

            {/* ID + URL */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-xs sm:text-sm font-bold bg-[#890AD7]/10 text-[#890AD7] border border-[#890AD7]/20">
                ID #{business.merchantId ?? business.id}
              </span>
              {business.siteUrl && (
                <a
                  href={business.siteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs sm:text-sm text-blue-500 hover:underline"
                >
                  <ExternalLink size={12} />
                  {business.siteUrl.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            {/* Earnings */}
            <div>
              <p className="text-xs sm:text-sm font-bold tracking-widest uppercase text-neutral-400 dark:text-neutral-500 mb-3">
                {t.referralEarnings}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Locked */}
                <div className="rounded-2xl overflow-hidden border border-yellow-200 dark:border-yellow-500/20 bg-neutral-50 dark:bg-neutral-800">
                  <div className="h-0.5 bg-yellow-400" />
                  <div className="p-3 sm:p-4 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Lock size={12} className="text-yellow-500" />
                      <span className="text-xs font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
                        {t.locked}
                      </span>
                    </div>
                    <BalanceMiniCard symbol="usdt" amount={lockedUsdt} color="#ca8a04" />
                    <BalanceMiniCard symbol="mea" amount={lockedMea} color="#ca8a04" />
                  </div>
                </div>
                {/* Available */}
                <div className="rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-500/20 bg-neutral-50 dark:bg-neutral-800">
                  <div className="h-0.5 bg-emerald-400" />
                  <div className="p-3 sm:p-4 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Unlock size={12} className="text-emerald-500" />
                      <span className="text-xs font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
                        {t.available}
                      </span>
                    </div>
                    <BalanceMiniCard symbol="usdt" amount={availableUsdt} color="#16a34a" />
                    <BalanceMiniCard symbol="mea" amount={availableMea} color="#16a34a" />
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions */}
            <div>
              <p className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mb-3">{t.txHistory}</p>
              {modalLoading ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 size={28} className="text-[#890AD7] animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3 text-neutral-400">
                  <span className="text-4xl">📭</span>
                  <p className="text-sm sm:text-base font-medium">{t.noTxYet}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const refReward = tx.transaction?.rewards?.referrer_reward
                    const processed = tx.transaction?.processed
                    const isCompleted = tx.status === 'completed'
                    const accentColor = isCompleted ? '#16a34a' : '#ca8a04'
                    return (
                      <div
                        key={tx._id}
                        className="rounded-xl overflow-hidden border bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                      >
                        <div className="h-0.5" style={{ backgroundColor: accentColor }} />
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-mono text-neutral-400 dark:text-neutral-500">
                              {tx.payment_id?.slice(0, 12)}...
                            </span>
                            <span
                              className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full"
                              style={{ color: accentColor, backgroundColor: `${accentColor}18` }}
                            >
                              {tx.status}
                            </span>
                          </div>
                          <div className="h-px bg-neutral-100 dark:bg-neutral-700" />
                          {processed && (
                            <div className="flex justify-between text-sm sm:text-base">
                              <span className="text-neutral-500 dark:text-neutral-400">{t.processed}</span>
                              <span className="font-semibold text-neutral-900 dark:text-white">
                                {processed.amount} {processed.symbol.toUpperCase()}
                              </span>
                            </div>
                          )}
                          {refReward && (
                            <div className="flex justify-between text-sm sm:text-base">
                              <span className="text-neutral-500 dark:text-neutral-400">{t.referralFee}</span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                {refReward.amount} {refReward.symbol.toUpperCase()}
                                {refReward.percentage ? ` (${refReward.percentage}%)` : ''}
                              </span>
                            </div>
                          )}
                          {tx.transaction?.tx?.hash && (
                            <button
                              onClick={() => navigator.clipboard.writeText(tx.transaction!.tx!.hash)}
                              className="w-full text-xs sm:text-sm font-semibold text-[#890AD7] rounded-lg py-2 transition-all border border-[#890AD7]/20 bg-[#890AD7]/5 hover:bg-[#890AD7]/10"
                            >
                              {t.copyTxHash}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReferralPage() {
  const { publicKey, signMessage, connected } = useWallet()
  const { setVisible: openWalletModal } = useWalletModal()

  // ── Use the app-wide lang and theme ──────────────────────
  const { isKorean } = useLang()
  const t = translations[isKorean ? 'ko' : 'en']

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const [bearerToken, setBearerToken] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [dataLoading, setDataLoading] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [referralFeeRate] = useState(1)
  const [availableUSDT, setAvailableUSDT] = useState(0)
  const [availableMEA, setAvailableMEA] = useState(0)
  const [lockedUSDT, setLockedUSDT] = useState(0)
  const [lockedMEA, setLockedMEA] = useState(0)
  const [referredStores, setReferredStores] = useState<ReferredStore[]>([])
  const [copiedCode, setCopiedCode] = useState(false)

  // ── Modals ───────────────────────────────────────────────────────────────────
  const [selectedStore, setSelectedStore] = useState<ReferredStore | null>(null)
  const [storeTransactions, setStoreTransactions] = useState<ReferralRewardTransaction[]>([])
  const [storeModalLoading, setStoreModalLoading] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  const prevAddressRef = useRef<string | null>(null)

  // ── Authenticate ─────────────────────────────────────────────────────────────
  const authenticate = useCallback(
    async (address: string, force = false) => {
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
        if (!token) throw new Error('No token')
        storeToken(address, token)
        setBearerToken(token)
        return token
      } catch (e: any) {
        setAuthError(e.message || 'Authentication failed')
        return null
      } finally {
        setAuthLoading(false)
      }
    },
    [signMessage],
  )

  // ── Fetch data ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (token: string) => {
    setDataLoading(true)
    try {
      const [profileRes, overviewRes, storesRes] = await Promise.all([
        safeFetchJson(`${BASE_URL}/user/d/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        safeFetchJson(`${BASE_URL}/user/r/referral/overview`, { headers: { Authorization: `Bearer ${token}` } }),
        safeFetchJson(`${BASE_URL}/user/r/referral/stores`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (profileRes?.success && profileRes.body?.user?.code) setReferralCode(profileRes.body.user.code)
      if (overviewRes?.success && overviewRes.body?.aggregated) {
        const { total, locked } = overviewRes.body.aggregated
        setAvailableUSDT((total?.usdt?.amount ?? 0) - (locked?.usdt?.amount ?? 0))
        setAvailableMEA((total?.mea?.amount ?? 0) - (locked?.mea?.amount ?? 0))
        setLockedUSDT(locked?.usdt?.amount ?? 0)
        setLockedMEA(locked?.mea?.amount ?? 0)
      }
      if (storesRes?.success) setReferredStores(storesRes.body?.stores ?? [])
    } catch (err) {
      console.error('fetchData error:', err)
    } finally {
      setDataLoading(false)
    }
  }, [])

  const fetchStoreTransactions = async (businessId: number, token: string) => {
    setStoreModalLoading(true)
    try {
      const res = await safeFetchJson(
        `${BASE_URL}/user/r/referral/rewards?business_ids=${businessId}&page=1&limit=25`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setStoreTransactions(res?.success ? (res.body?.payments ?? []) : [])
    } catch {
      setStoreTransactions([])
    } finally {
      setStoreModalLoading(false)
    }
  }

  // ── Wallet account / connection change ────────────────────────────────────────
  useEffect(() => {
    if (!publicKey || !connected) {
      setBearerToken(null)
      setReferralCode('')
      setReferredStores([])
      return
    }
    const address = publicKey.toBase58()
    if (prevAddressRef.current && prevAddressRef.current !== address) {
      clearStoredToken(prevAddressRef.current)
      setBearerToken(null)
    }
    prevAddressRef.current = address
    authenticate(address).then((token) => {
      if (token) fetchData(token)
    })
  }, [publicKey, connected])

  useEffect(() => {
    if (bearerToken) fetchData(bearerToken)
  }, [bearerToken])

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(referralCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleShare = async () => {
    try {
      await navigator.share({ title: 'Join PingPay', text: `Use my referral code ${referralCode}\n${PLAY_STORE_LINK}` })
    } catch {
      await navigator.clipboard.writeText(`${referralCode} — ${PLAY_STORE_LINK}`)
    }
  }

  const handleRefresh = async () => {
    if (!publicKey) return
    const address = publicKey.toBase58()
    clearStoredToken(address)
    const token = await authenticate(address, true)
    if (token) fetchData(token)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Not connected
  // ─────────────────────────────────────────────────────────────────────────────

  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#890AD7]/10 border border-[#890AD7]/20 flex items-center justify-center mx-auto">
            <Wallet size={36} className="text-[#890AD7]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">{t.pageTitle}</h2>
            <p className="text-sm sm:text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
              {t.connectDesc}
            </p>
          </div>
          <button
            onClick={() => openWalletModal(true)}
            className="w-full h-14 sm:h-16 rounded-2xl font-black text-white text-base sm:text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
          >
            <Wallet size={20} />
            {t.connectWallet}
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Auth loading
  // ─────────────────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#890AD7]/10 border-2 border-[#890AD7]/25 flex items-center justify-center mx-auto">
            <Loader2 size={28} className="text-[#890AD7] animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">{t.authenticating}</h3>
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{t.authDesc}</p>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Auth error
  // ─────────────────────────────────────────────────────────────────────────────

  if (authError) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">{t.authFailed}</h3>
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{authError}</p>
          </div>
          <button
            onClick={() => authenticate(publicKey.toBase58(), true)}
            className="w-full h-12 sm:h-14 rounded-2xl font-black text-white text-sm sm:text-base flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
          >
            <RefreshCw size={16} />
            {t.tryAgain}
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Main content
  // ─────────────────────────────────────────────────────────────────────────────

  const isLoading = dataLoading && !referralCode

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
        {/* Connected address + refresh */}
        <div className="flex items-center justify-between">
          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
            {t.connected}:{' '}
            <span className="font-mono text-neutral-700 dark:text-neutral-300">{shortHash(publicKey.toBase58())}</span>
          </p>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-all text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <RefreshCw size={13} />
            {t.refresh}
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
            </div>
            <Skeleton className="h-28" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {/* ── Referral Code Card ── */}
            <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-[#890AD7]/20">
              <p className="text-xs sm:text-sm font-bold tracking-widest uppercase text-neutral-400 dark:text-neutral-500">
                {t.yourReferralCode}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center justify-between px-4 sm:px-5 h-14 sm:h-16 rounded-xl border bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-widest text-neutral-900 dark:text-white">
                    {referralCode || '—'}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 sm:p-2.5 rounded-xl bg-[#890AD7] hover:bg-[#7a09c5] text-white transition-all"
                  >
                    {copiedCode ? <CheckCircle2 size={17} /> : <Copy size={17} />}
                  </button>
                </div>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-neutral-400 dark:text-neutral-500">{t.shareDesc}</p>
            </div>

            {/* ── Share button ── */}
            <button
              onClick={handleShare}
              className="w-full h-14 sm:h-16 rounded-2xl font-black text-white text-base sm:text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
            >
              <Share2 size={20} />
              {t.sharePingPay}
            </button>

            {/* ── Balance Row ── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Locked */}
              <div className="rounded-2xl overflow-hidden border bg-white dark:bg-neutral-900 border-yellow-200 dark:border-yellow-500/20">
                <div className="h-1 bg-yellow-400" />
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock size={13} className="text-yellow-500" />
                    <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
                      {t.locked}
                    </span>
                  </div>
                  <BalanceMiniCard symbol="usdt" amount={lockedUSDT} color="#ca8a04" />
                  <BalanceMiniCard symbol="mea" amount={lockedMEA} color="#ca8a04" />
                  <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 w-fit bg-yellow-50 dark:bg-yellow-500/8">
                    <span className="text-xs sm:text-sm font-bold text-yellow-600 dark:text-yellow-400">🔒 30d</span>
                  </div>
                </div>
              </div>

              {/* Available */}
              <div className="rounded-2xl overflow-hidden border bg-white dark:bg-neutral-900 border-emerald-200 dark:border-emerald-500/20">
                <div className="h-1 bg-emerald-400" />
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Unlock size={13} className="text-emerald-500" />
                    <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
                      {t.available}
                    </span>
                  </div>
                  <BalanceMiniCard symbol="usdt" amount={availableUSDT} color="#16a34a" />
                  <BalanceMiniCard symbol="mea" amount={availableMEA} color="#16a34a" />
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="w-full h-9 sm:h-10 rounded-xl font-black text-white text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 transition-all"
                  >
                    <ArrowDownToLine size={14} />
                    {t.withdraw}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Referral Rate ── */}
            <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 border space-y-3 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-[#890AD7]/15">
              <div className="flex items-center justify-between">
                <p className="text-sm sm:text-base font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
                  <TrendingUp size={18} className="text-[#890AD7]" />
                  {t.referralRate}
                </p>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                  {referralFeeRate}%
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                {t.referralRateDesc} {referralFeeRate}% {t.referralRateDesc2}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400">{t.lockNote}</p>
            </div>

            {/* ── Referred Stores ── */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm font-bold tracking-widest uppercase flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
                  <Store size={13} />
                  {t.yourMerchants}
                </p>
                <span className="text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full text-[#890AD7] bg-[#890AD7]/10">
                  {referredStores.length} {t.stores}
                </span>
              </div>

              {referredStores.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-4 text-neutral-400">
                  <span className="text-5xl sm:text-6xl">🤝</span>
                  <p className="text-sm sm:text-base font-semibold">{t.noMerchants}</p>
                  <p className="text-xs sm:text-sm text-center max-w-xs text-neutral-400">{t.noMerchantsDesc}</p>
                </div>
              ) : (
                referredStores.map((store) => {
                  const { business, aggregated } = store
                  const imgUrl = imageUrl(business.businessImage)
                  const totalUsdt = aggregated?.total?.usdt?.amount ?? 0
                  const totalMea = aggregated?.total?.mea?.amount ?? 0
                  return (
                    <button
                      key={store.business_id}
                      onClick={() => {
                        setSelectedStore(store)
                        setStoreTransactions([])
                        if (bearerToken) fetchStoreTransactions(store.business_id, bearerToken)
                      }}
                      className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border transition-all text-left bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:border-[#890AD7]/30 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 shrink-0">
                        {imgUrl ? (
                          <img src={imgUrl} className="w-full h-full object-cover" alt="store" />
                        ) : (
                          <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xl sm:text-2xl">
                            🏪
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm sm:text-base font-bold truncate text-neutral-900 dark:text-white">
                          {business.businessName || t.unnamedBusiness}
                        </p>
                        <span className="text-xs sm:text-sm font-bold text-[#890AD7] px-2 py-0.5 rounded-md bg-[#890AD7]/8">
                          ID #{business.merchantId ?? business.id}
                        </span>
                      </div>
                      <div className="text-right space-y-1 shrink-0">
                        <div className="flex items-center justify-end gap-1.5">
                          <TokenIcon symbol="usdt" size={14} />
                          <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                            {fmtShort(totalUsdt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <TokenIcon symbol="mea" size={14} />
                          <span className="text-sm sm:text-base font-bold text-[#890AD7]">{fmtShort(totalMea)}</span>
                        </div>
                        <p className="text-xs text-neutral-400">{t.earned}</p>
                      </div>
                      <ChevronRight size={18} className="text-neutral-300 dark:text-neutral-600 shrink-0" />
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showWithdrawModal && (
        <WithdrawModal
          visible={showWithdrawModal}
          meaFree={availableMEA}
          usdtFree={availableUSDT}
          bearerToken={bearerToken}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            setShowWithdrawModal(false)
            if (bearerToken) fetchData(bearerToken)
          }}
          t={t}
        />
      )}
      {selectedStore && (
        <StoreDetailModal
          store={selectedStore}
          transactions={storeTransactions}
          modalLoading={storeModalLoading}
          onClose={() => setSelectedStore(null)}
          t={t}
        />
      )}
    </div>
  )
}
