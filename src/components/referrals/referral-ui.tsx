import React, { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
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
  Store,
  TrendingUp,
  Wallet,
  RefreshCw,
  ArrowDownToLine,
} from 'lucide-react'
import { useLang } from '../lang-provider'
import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router'

// ─── i18n ─────────────────────────────────────────────────────────────────────

const translations = {
  ko: {
    pageTitle: '추천 & 적립',
    connected: '연결됨',
    connectWallet: '지갑 연결',
    connectDesc: '지갑을 연결하여 추천 보상을 확인하고 스토어를 관리하세요.',
    authFailed: '인증 실패',
    tryAgain: '다시 시도',
    refresh: '새로고침',
    yourReferralCode: '내 추천 코드',
    shareDesc: '이 코드를 스토어 오너와 공유하여 모든 거래에서 수수료를 받으세요.',
    sharePingPay: 'PingPay 스토어 링크 공유',
    locked: '잠금',
    available: '사용 가능',
    withdraw: '인출',
    goToWithdraw: '인출 페이지로 이동',
    referralRate: '현재 추천 수수료율',
    referralRateDesc: '추천 스토어의 모든 거래에서 플랫폼 수수료의',
    referralRateDesc2: '를 받습니다.',
    lockNote: '⚡ 보상은 30일 후 인출 가능합니다.',
    yourMerchants: '추천한 스토어',
    stores: '개 스토어',
    noMerchants: '아직 추천한 스토어가 없습니다',
    noMerchantsDesc: '추천 코드를 스토어 오너와 공유하여 수수료를 받아보세요.',
    earned: '적립',
    referralEarnings: '추천 수익',
    txHistory: '거래 내역',
    noTxYet: '아직 거래 내역이 없습니다',
    processed: '처리됨',
    referralFee: '추천 수수료',
    copyTxHash: '트랜잭션 해시 복사',
    unnamedBusiness: '이름 없는 스토어',
    authenticating: '인증 중',
    authDesc: '지갑에서 메시지에 서명해주세요...',
  },
  en: {
    pageTitle: 'Refer & Earn',
    connected: 'Connected',
    connectWallet: 'Connect Wallet',
    connectDesc: 'Connect your wallet to view referral rewards and track referred stores.',
    authFailed: 'Authentication Failed',
    tryAgain: 'Try Again',
    refresh: 'Refresh',
    yourReferralCode: 'Your Referral Code',
    shareDesc: 'Share this code with merchant owners to earn commissions on every transaction they process.',
    sharePingPay: 'Share PingPay Store Link',
    locked: 'Locked',
    available: 'Available',
    withdraw: 'Withdraw',
    goToWithdraw: 'Go to Withdraw',
    referralRate: 'Current Referral Rate',
    referralRateDesc: 'You earn',
    referralRateDesc2: 'of the platform fee from every transaction at your referred stores.',
    lockNote: '⚡ Rewards are locked for 30 days before becoming available.',
    yourMerchants: 'Your Referred Merchants',
    stores: 'stores',
    noMerchants: 'No referred merchants yet',
    noMerchantsDesc: 'Share your referral code with store owners to start earning commission.',
    earned: 'earned',
    referralEarnings: 'Referral Earnings',
    txHistory: 'Transaction History',
    noTxYet: 'No transactions yet',
    processed: 'Processed',
    referralFee: 'Your Referral Fee',
    copyTxHash: 'Copy Transaction Hash',
    unnamedBusiness: 'Unnamed Store',
    authenticating: 'Authenticating',
    authDesc: 'Please sign the message in your wallet...',
  },
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://api-platform.pingpay.info'
const IMAGE_BASE = 'https://meapay-merchant-prod.s3.ap-northeast-2.amazonaws.com/'
const PLAY_STORE_LINK = 'https://play.google.com/store/apps/details?id=com.ping_pay'

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
  transaction?: {
    processed?: { symbol: string; amount: number }
    rewards?: { referrer_reward?: { symbol: string; amount: number; percentage?: number } }
    tx?: { hash: string }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt6 = (n: number) => n.toFixed(6)
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`
  return n.toFixed(4)
}
const imageUrl = (path?: string | null) => {
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

// ─── Shared UI ────────────────────────────────────────────────────────────────

function TokenIcon({ symbol, size = 20 }: { symbol: string; size?: number }) {
  const s = symbol.toLowerCase()
  const style: React.CSSProperties = { width: size, height: size, borderRadius: size / 2, flexShrink: 0 }
  if (s === 'mea') return <img src="/apple-touch-icon.png" alt="MEA" style={style} className="object-cover" />
  if (s === 'usdt')
    return (
      <div style={style} className="bg-[#26a17b] flex items-center justify-center text-white font-black">
        <span style={{ fontSize: size * 0.5 }}>₮</span>
      </div>
    )
  return <div style={style} className="bg-neutral-400 dark:bg-neutral-600" />
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800 ${className}`} />
}

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

// ─── Store Detail Modal ───────────────────────────────────────────────────────

function StoreDetailModal({
  store,
  transactions,
  modalLoading,
  onClose,
  t,
}: {
  store: ReferredStore
  transactions: ReferralRewardTransaction[]
  modalLoading: boolean
  onClose: () => void
  t: (typeof translations)['en']
}) {
  const { business, aggregated } = store
  const bannerUrl = imageUrl(business.banner)
  const imgUrl = imageUrl(business.businessImage)
  const lockedUsdt = aggregated?.locked?.usdt?.amount ?? 0
  const lockedMea = aggregated?.locked?.mea?.amount ?? 0
  const availableUsdt = (aggregated?.total?.usdt?.amount ?? 0) - lockedUsdt
  const availableMea = (aggregated?.total?.mea?.amount ?? 0) - lockedMea

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

        <div className="overflow-y-auto flex-1">
          <div className="px-5 sm:px-6 pt-12 pb-8 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white truncate">
                {business.businessName || t.unnamedBusiness}
              </h2>
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-black">✓</span>
              </div>
            </div>

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
                <div className="rounded-2xl overflow-hidden border border-yellow-200 dark:border-yellow-500/20 bg-neutral-50 dark:bg-neutral-800">
                  <div className="h-0.5 bg-yellow-400" />
                  <div className="p-3 sm:p-4 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Lock size={12} className="text-yellow-500" />
                      <span className="text-xs font-bold tracking-wider uppercase text-neutral-400">{t.locked}</span>
                    </div>
                    <BalanceMiniCard symbol="usdt" amount={lockedUsdt} color="#ca8a04" />
                    <BalanceMiniCard symbol="mea" amount={lockedMea} color="#ca8a04" />
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-500/20 bg-neutral-50 dark:bg-neutral-800">
                  <div className="h-0.5 bg-emerald-400" />
                  <div className="p-3 sm:p-4 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Unlock size={12} className="text-emerald-500" />
                      <span className="text-xs font-bold tracking-wider uppercase text-neutral-400">{t.available}</span>
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
                            <span className="text-xs sm:text-sm font-mono text-neutral-400">ID: {tx.payment_id}</span>
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
                              <span className="text-neutral-500">{t.processed}</span>
                              <span className="font-semibold text-neutral-900 dark:text-white">
                                {processed.amount} {processed.symbol.toUpperCase()}
                              </span>
                            </div>
                          )}
                          {refReward && (
                            <div className="flex justify-between text-sm sm:text-base">
                              <span className="text-neutral-500">{t.referralFee}</span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                {refReward.amount} {refReward.symbol.toUpperCase()}
                                {refReward.percentage ? ` (${refReward.percentage}%)` : ''}
                              </span>
                            </div>
                          )}
                          {tx.transaction?.tx?.hash && (
                            <button
                              onClick={() => navigator.clipboard.writeText(tx.transaction!.tx!.hash)}
                              className="w-full text-xs sm:text-sm font-semibold text-[#890AD7] rounded-lg py-2 border border-[#890AD7]/20 bg-[#890AD7]/5 hover:bg-[#890AD7]/10 transition-all"
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
  const navigate = useNavigate()
  const { publicKey, connected } = useWallet()
  const { setVisible: openWalletModal } = useWalletModal()
  const { isKorean } = useLang()
  const t = translations[isKorean ? 'ko' : 'en']
  const { bearerToken, authLoading, authError, reauthenticate } = useAuth()

  const [dataLoading, setDataLoading] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [referralFeeRate] = useState(1)
  const [availableUSDT, setAvailableUSDT] = useState(0)
  const [availableMEA, setAvailableMEA] = useState(0)
  const [lockedUSDT, setLockedUSDT] = useState(0)
  const [lockedMEA, setLockedMEA] = useState(0)
  const [referredStores, setReferredStores] = useState<ReferredStore[]>([])
  const [copiedCode, setCopiedCode] = useState(false)
  const [selectedStore, setSelectedStore] = useState<ReferredStore | null>(null)
  const [storeTransactions, setStoreTransactions] = useState<ReferralRewardTransaction[]>([])
  const [storeModalLoading, setStoreModalLoading] = useState(false)

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

  useEffect(() => {
    if (bearerToken) fetchData(bearerToken)
  }, [bearerToken, fetchData])

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

  // ── Not connected ─────────────────────────────────────────────────────────────
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

  // ── Auth loading ──────────────────────────────────────────────────────────────
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

  // ── Auth error ────────────────────────────────────────────────────────────────
  if (authError) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">{t.authFailed}</h3>
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{authError}</p>
          </div>
          <button
            onClick={reauthenticate}
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

  const isLoading = dataLoading && !referralCode

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
        {/* Address + refresh */}
        <div className="flex items-center justify-between">
          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
            {t.connected}:{' '}
            <span className="font-mono text-neutral-700 dark:text-neutral-300">{shortHash(publicKey.toBase58())}</span>
          </p>
          <button
            onClick={reauthenticate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-all text-neutral-500 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
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
            {/* Referral Code */}
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

            {/* Share button */}
            <button
              onClick={handleShare}
              className="w-full h-14 sm:h-16 rounded-2xl font-black text-white text-base sm:text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
            >
              <Share2 size={20} />
              {t.sharePingPay}
            </button>

            {/* Balance Row */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl overflow-hidden border bg-white dark:bg-neutral-900 border-yellow-200 dark:border-yellow-500/20">
                <div className="h-1 bg-yellow-400" />
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock size={13} className="text-yellow-500" />
                    <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-neutral-400">
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
              <div className="rounded-2xl overflow-hidden border bg-white dark:bg-neutral-900 border-emerald-200 dark:border-emerald-500/20">
                <div className="h-1 bg-emerald-400" />
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Unlock size={13} className="text-emerald-500" />
                    <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-neutral-400">
                      {t.available}
                    </span>
                  </div>
                  <BalanceMiniCard symbol="usdt" amount={availableUSDT} color="#16a34a" />
                  <BalanceMiniCard symbol="mea" amount={availableMEA} color="#16a34a" />

                  <button
                    onClick={() => navigate('/withdrawals')}
                    className="w-full flex items-center justify-center gap-2 h-9 sm:h-10 rounded-xl font-bold text-xl sm:text-sm text-white bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 transition-all"
                  >
                    <ArrowDownToLine size={18} />
                    {t.withdraw}
                  </button>
                </div>
              </div>
            </div>

            {/* Referral Rate */}
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

            {/* Referred Stores */}
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
                  <p className="text-xs sm:text-sm text-center max-w-xs">{t.noMerchantsDesc}</p>
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
