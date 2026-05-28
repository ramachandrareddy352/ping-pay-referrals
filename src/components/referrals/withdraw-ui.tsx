/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import {
  ArrowDownToLine,
  Lock,
  Unlock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Copy,
  Wallet,
  RefreshCw,
  Info,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { VersionedTransaction, Transaction } from '@solana/web3.js'
import { useLang } from '../lang-provider'
import { useAuth } from '../AuthContext'

// ─── i18n ─────────────────────────────────────────────────────────────────────

const translations = {
  ko: {
    pageTitle: '인출',
    connected: '연결됨',
    connectWallet: '지갑 연결',
    connectDesc: '지갑을 연결하여 보상을 인출하세요.',
    authFailed: '인증 실패',
    tryAgain: '다시 시도',
    refresh: '새로고침',
    authenticating: '인증 중',
    authDesc: '지갑에서 메시지에 서명해주세요...',
    yourBalances: '내 잔액',
    locked: '잠금',
    available: '사용 가능',
    lockNote: '보상은 30일 후 인출 가능합니다.',
    withdrawTokens: '토큰 인출',
    balance: '잔액',
    exceedsBalance: '잔액 초과',
    enterAmount: '금액을 입력하세요',
    receiveAs: '받을 토큰',
    max: '최대',
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
    withdraw: '인출',
    infoTitle: '인출 안내',
    infoDesc: '인출하기 전에 아래 내용을 확인하세요.',
    infoCase1Title: '즉시 인출 (MEA → MEA)',
    infoCase1: 'MEA를 MEA로 인출하면 즉시 지갑으로 전송됩니다.',
    infoCase2Title: '스왑 인출 (MEA → USDT)',
    infoCase2: 'MEA를 USDT로 인출하면 스왑 후 전송됩니다.',
    infoCase3Title: 'USDT 인출',
    infoCase3: 'USDT는 직접 지갑으로 전송됩니다.',
    infoClose: '확인',
    withdrawalHistory: '인출 내역',
    total: '건',
    noWithdrawals: '인출 내역이 없습니다',
    noWithdrawalsDesc: '첫 인출을 진행해보세요.',
    inputTokens: '입력 토큰',
    swapped: '스왑됨',
    priceAt: '가격',
    waitingConfirmation: '확인 대기 중...',
    noTxAvailable: '트랜잭션 없음',
    prev: '이전',
    next: '다음',
    page: '페이지',
    of: '/',
  },
  en: {
    pageTitle: 'Withdraw',
    connected: 'Connected',
    connectWallet: 'Connect Wallet',
    connectDesc: 'Connect your wallet to withdraw your rewards.',
    authFailed: 'Authentication Failed',
    tryAgain: 'Try Again',
    refresh: 'Refresh',
    authenticating: 'Authenticating',
    authDesc: 'Please sign the message in your wallet...',
    yourBalances: 'Your Balances',
    locked: 'Locked',
    available: 'Available',
    lockNote: 'Rewards are locked for 30 days before they can be withdrawn.',
    withdrawTokens: 'Withdraw Tokens',
    balance: 'Balance',
    exceedsBalance: 'Exceeds balance',
    enterAmount: 'Enter at least one amount',
    receiveAs: 'Receive as',
    max: 'MAX',
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
    withdraw: 'Withdraw',
    infoTitle: 'Withdrawal Info',
    infoDesc: 'Please review the details below before withdrawing.',
    infoCase1Title: 'Instant Withdrawal (MEA → MEA)',
    infoCase1: 'Withdrawing MEA as MEA sends tokens directly to your wallet.',
    infoCase2Title: 'Swap Withdrawal (MEA → USDT)',
    infoCase2: 'Withdrawing MEA as USDT performs a swap before sending.',
    infoCase3Title: 'USDT Withdrawal',
    infoCase3: 'USDT is sent directly to your wallet.',
    infoClose: 'Got it',
    withdrawalHistory: 'Withdrawal History',
    total: 'total',
    noWithdrawals: 'No withdrawals yet',
    noWithdrawalsDesc: 'Your withdrawal history will appear here.',
    inputTokens: 'Input',
    swapped: 'Swapped',
    priceAt: 'Price at',
    waitingConfirmation: 'Waiting for confirmation...',
    noTxAvailable: 'No transaction available',
    prev: 'Prev',
    next: 'Next',
    page: 'Page',
    of: 'of',
  },
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://api-platform.pingpay.info'

// ─── Types ────────────────────────────────────────────────────────────────────

type TokenType = 'mea' | 'usdt'
type ModalStep = 'form' | 'processing' | 'success' | 'failed'

interface WithdrawalTx {
  _id: string
  tokens: { symbol: string; amount: number }[]
  amount: number
  receive: string
  symbol: string
  price: number
  is_swap: boolean
  status: 'success' | 'pending' | 'failed'
  transaction?: { tx?: { hash?: string; timestamp?: string } }
  createdAt: string
  updatedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt6 = (n: number) => n.toFixed(6)
const fmtAmount = (n: number, d = 4) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: d })
const shortHash = (s?: string | null) => (s && s.length > 10 ? `${s.slice(0, 6)}...${s.slice(-4)}` : s || '-')
const formatDate = (iso?: string | null) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return (
    d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  )
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

function statusColor(s: string) {
  if (s === 'success')
    return {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/20',
      bar: '#16a34a',
    }
  if (s === 'pending')
    return {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/20',
      bar: '#ca8a04',
    }
  return {
    text: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/20',
    bar: '#ef4444',
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

// ─── Info Modal ───────────────────────────────────────────────────────────────

function InfoModal({ visible, onClose, t }: { visible: boolean; onClose: () => void; t: (typeof translations)['en'] }) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <Info size={20} className="text-[#890AD7]" /> {t.infoTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{t.infoDesc}</p>
        {[
          { title: t.infoCase1Title, body: t.infoCase1, color: '#890AD7' },
          { title: t.infoCase2Title, body: t.infoCase2, color: '#ca8a04' },
          { title: t.infoCase3Title, body: t.infoCase3, color: '#16a34a' },
        ].map((c) => (
          <div
            key={c.title}
            className="rounded-xl p-4 border-l-4"
            style={{ borderColor: c.color, backgroundColor: `${c.color}10` }}
          >
            <p className="text-sm sm:text-base font-bold mb-1" style={{ color: c.color }}>
              {c.title}
            </p>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">{c.body}</p>
          </div>
        ))}
        <button
          onClick={onClose}
          className="w-full h-12 rounded-2xl font-black text-white text-sm sm:text-base hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
        >
          {t.infoClose}
        </button>
      </div>
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
  const [showInfo, setShowInfo] = useState(false)

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
    <>
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border overflow-hidden max-h-[92vh] flex flex-col bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          </div>

          {step === 'form' && (
            <div className="overflow-y-auto">
              <div className="p-5 sm:p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-neutral-900 dark:text-white">
                    <ArrowDownToLine size={22} className="text-[#890AD7]" />
                    {t.withdrawTokens}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowInfo(true)}
                      className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 transition-all"
                    >
                      <Info size={18} />
                    </button>
                    <button
                      onClick={handleClose}
                      className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* MEA */}
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
                    <p className="text-xs sm:text-sm text-neutral-400">
                      {t.balance}:{' '}
                      <span className="text-neutral-600 dark:text-neutral-300 font-medium">{fmt6(meaFree)} MEA</span>
                      {meaVal > meaFree && <span className="text-red-500 ml-2">{t.exceedsBalance}</span>}
                    </p>
                  </div>
                </div>

                {/* USDT */}
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
                    <p className="text-xs sm:text-sm text-neutral-400">
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
              <div className="w-20 h-20 rounded-full bg-[#890AD7]/10 border-2 border-[#890AD7]/30 flex items-center justify-center">
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
                    <button
                      onClick={() => navigator.clipboard.writeText(txHash)}
                      className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all"
                    >
                      <Copy size={14} />
                    </button>
                    <a
                      href={`https://explorer.solana.com/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              )}
              <button
                onClick={handleClose}
                className="w-full h-12 sm:h-14 rounded-2xl font-black text-white text-base sm:text-lg hover:opacity-90 transition-all"
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
                  className="flex-1 h-12 sm:h-14 rounded-2xl font-bold text-sm sm:text-base border transition-all text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 h-12 sm:h-14 rounded-2xl font-black text-white text-sm sm:text-base hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
                >
                  {t.tryAgain}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <InfoModal visible={showInfo} onClose={() => setShowInfo(false)} t={t} />
    </>
  )
}

// ─── Withdrawal History Item ──────────────────────────────────────────────────

function WithdrawalItem({ item, t }: { item: WithdrawalTx; t: (typeof translations)['en'] }) {
  const sc = statusColor(item.status)
  const hash = item.transaction?.tx?.hash

  const StatusIcon = item.status === 'success' ? CheckCircle : item.status === 'pending' ? Clock : XCircle

  return (
    <div className={`rounded-2xl overflow-hidden border bg-white dark:bg-neutral-900 ${sc.border}`}>
      <div className="h-0.5" style={{ backgroundColor: sc.bar }} />
      <div className="p-4 sm:p-5 space-y-4">
        {/* Row 1: Token + amount + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <TokenIcon symbol={item.receive} size={40} />
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${sc.bg} border border-white dark:border-neutral-900`}
              >
                <ArrowUpRight size={9} style={{ color: sc.bar }} />
              </div>
            </div>
            <div>
              <p className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                {fmtAmount(item.amount)} {item.receive.toUpperCase()}
              </p>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">{formatDate(item.createdAt)}</p>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs sm:text-sm font-bold flex-shrink-0 ${sc.text} ${sc.bg} ${sc.border}`}
          >
            <StatusIcon size={12} />
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </div>
        </div>

        <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

        {/* Input tokens */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs sm:text-sm text-neutral-400">{t.inputTokens}:</span>
          {item.tokens.map((tk, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
            >
              <TokenIcon symbol={tk.symbol} size={13} />
              <span className="text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                {fmtAmount(tk.amount)} {tk.symbol.toUpperCase()}
              </span>
            </div>
          ))}
          {item.is_swap && (
            <span className="px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold bg-[#890AD7]/10 text-[#890AD7] border border-[#890AD7]/20">
              ⇄ {t.swapped}
            </span>
          )}
        </div>

        {/* Price */}
        {item.price > 0 && (
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-neutral-400">{t.priceAt}</span>
            <span className="font-semibold text-neutral-600 dark:text-neutral-300">${item.price}</span>
          </div>
        )}

        {/* TX hash */}
        {item.status === 'success' && hash ? (
          <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 rounded-xl px-3 py-2.5 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Tx:</span>
              <span className="text-xs sm:text-sm font-mono font-medium text-neutral-600 dark:text-neutral-300">
                {shortHash(hash)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(hash)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all"
              >
                <Copy size={13} />
              </button>
              <a
                href={`https://explorer.solana.com/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ) : item.status === 'pending' ? (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-600 dark:text-amber-400">
            <Loader2 size={13} className="animate-spin" />
            {t.waitingConfirmation}
          </div>
        ) : item.status === 'failed' ? (
          <p className="text-xs sm:text-sm text-neutral-400">{t.noTxAvailable}</p>
        ) : null}
      </div>
    </div>
  )
}

// ─── Main Withdraw Page ───────────────────────────────────────────────────────

export default function WithdrawUi() {
  const { publicKey, connected } = useWallet()
  const { setVisible: openWalletModal } = useWalletModal()
  const { isKorean } = useLang()
  const t = translations[isKorean ? 'ko' : 'en']
  const { bearerToken, authLoading, authError, reauthenticate } = useAuth()

  const [dataLoading, setDataLoading] = useState(false)
  const [availableUSDT, setAvailableUSDT] = useState(0)
  const [availableMEA, setAvailableMEA] = useState(0)
  const [lockedUSDT, setLockedUSDT] = useState(0)
  const [lockedMEA, setLockedMEA] = useState(0)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  // History state
  const [historyLoading, setHistoryLoading] = useState(false)
  const [withdrawals, setWithdrawals] = useState<WithdrawalTx[]>([])
  const [totalWithdrawals, setTotalWithdrawals] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Balance from referral/overview — same source as referral page
  const fetchBalance = useCallback(async (token: string) => {
    setDataLoading(true)
    try {
      const res = await safeFetchJson(`${BASE_URL}/user/r/referral/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res?.success && res.body?.aggregated) {
        const { total, locked } = res.body.aggregated
        setAvailableUSDT((total?.usdt?.amount ?? 0) - (locked?.usdt?.amount ?? 0))
        setAvailableMEA((total?.mea?.amount ?? 0) - (locked?.mea?.amount ?? 0))
        setLockedUSDT(locked?.usdt?.amount ?? 0)
        setLockedMEA(locked?.mea?.amount ?? 0)
      }
    } catch (err) {
      console.error('fetchBalance error:', err)
    } finally {
      setDataLoading(false)
    }
  }, [])

  // Withdrawal history
  const fetchHistory = useCallback(async (token: string, pg = 1) => {
    setHistoryLoading(true)
    try {
      const res = await safeFetchJson(`${BASE_URL}/v2/user/r/withdrawls?page=${pg}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res?.success && res.body?.withdrawals) {
        setWithdrawals(res.body.withdrawals)
        setTotalWithdrawals(res.body.pagination?.total ?? 0)
        setTotalPages(res.body.pagination?.pages ?? 1)
        setPage(pg)
      }
    } catch (err) {
      console.error('fetchHistory error:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (bearerToken) {
      fetchBalance(bearerToken)
      fetchHistory(bearerToken, 1)
    }
  }, [bearerToken, fetchBalance, fetchHistory])

  const handleWithdrawSuccess = () => {
    setShowWithdrawModal(false)
    if (bearerToken) {
      fetchBalance(bearerToken)
      fetchHistory(bearerToken, 1)
    }
  }

  // ── Not connected ─────────────────────────────────────────────────────────────
  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-[#890AD7]/10 border border-[#890AD7]/20 flex items-center justify-center mx-auto">
            <Wallet size={36} className="text-[#890AD7]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">{t.pageTitle}</h2>
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{t.connectDesc}</p>
          </div>
          <button
            onClick={() => openWalletModal(true)}
            className="w-full h-14 rounded-2xl font-black text-white text-base sm:text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
          >
            <Wallet size={20} />
            {t.connectWallet}
          </button>
        </div>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#890AD7]/10 border-2 border-[#890AD7]/25 flex items-center justify-center mx-auto">
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

  if (authError) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
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
            className="w-full h-12 rounded-2xl font-black text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
          >
            <RefreshCw size={16} />
            {t.tryAgain}
          </button>
        </div>
      </div>
    )
  }

  const isBalanceLoading = dataLoading && availableUSDT === 0 && availableMEA === 0

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
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

        {/* ── Balances ── */}
        {isBalanceLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-52" />
              <Skeleton className="h-52" />
            </div>
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm font-bold tracking-widest uppercase text-neutral-400 dark:text-neutral-500">
              {t.yourBalances}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Locked */}
              <div className="rounded-2xl overflow-hidden border bg-white dark:bg-neutral-900 border-yellow-200 dark:border-yellow-500/20">
                <div className="h-1 bg-yellow-400" />
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock size={13} className="text-yellow-500" />
                    <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-neutral-400">
                      {t.locked}
                    </span>
                  </div>
                  <div className="rounded-xl p-3 space-y-1 bg-neutral-100 dark:bg-neutral-800/60">
                    <div className="flex items-center gap-1.5">
                      <TokenIcon symbol="usdt" size={13} />
                      <span className="text-xs font-bold text-neutral-400">USDT</span>
                    </div>
                    <p className="text-base lg:text-lg font-black text-yellow-600 dark:text-yellow-400">
                      {fmt6(lockedUSDT)}
                    </p>
                  </div>
                  <div className="rounded-xl p-3 space-y-1 bg-neutral-100 dark:bg-neutral-800/60">
                    <div className="flex items-center gap-1.5">
                      <TokenIcon symbol="mea" size={13} />
                      <span className="text-xs font-bold text-neutral-400">MEA</span>
                    </div>
                    <p className="text-base lg:text-lg font-black text-yellow-600 dark:text-yellow-400">
                      {fmt6(lockedMEA)}
                    </p>
                  </div>
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
                    <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-neutral-400">
                      {t.available}
                    </span>
                  </div>
                  <div className="rounded-xl p-3 space-y-1 bg-neutral-100 dark:bg-neutral-800/60">
                    <div className="flex items-center gap-1.5">
                      <TokenIcon symbol="usdt" size={13} />
                      <span className="text-xs font-bold text-neutral-400">USDT</span>
                    </div>
                    <p className="text-base lg:text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {fmt6(availableUSDT)}
                    </p>
                  </div>
                  <div className="rounded-xl p-3 space-y-1 bg-neutral-100 dark:bg-neutral-800/60">
                    <div className="flex items-center gap-1.5">
                      <TokenIcon symbol="mea" size={13} />
                      <span className="text-xs font-bold text-neutral-400">MEA</span>
                    </div>
                    <p className="text-base lg:text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {fmt6(availableMEA)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lock note */}
            <p className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Lock size={13} />
              {t.lockNote}
            </p>

            {/* Withdraw CTA */}
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="w-full h-14 sm:h-16 rounded-2xl font-black text-white text-base sm:text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #890AD7, #6a08aa)' }}
            >
              <ArrowDownToLine size={20} />
              {t.withdrawTokens}
            </button>
          </div>
        )}

        {/* ── Withdrawal History ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-bold tracking-widest uppercase text-neutral-400 dark:text-neutral-500">
              {t.withdrawalHistory}
            </p>
            {totalWithdrawals > 0 && (
              <span className="text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full text-[#890AD7] bg-[#890AD7]/10">
                {totalWithdrawals} {t.total}
              </span>
            )}
          </div>

          {historyLoading && withdrawals.length === 0 ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3 text-neutral-400">
              <span className="text-5xl sm:text-6xl">📭</span>
              <p className="text-sm sm:text-base font-semibold">{t.noWithdrawals}</p>
              <p className="text-xs sm:text-sm text-neutral-400">{t.noWithdrawalsDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((item) => (
                <WithdrawalItem key={item._id} item={item} t={t} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && bearerToken && (
            <div className="flex items-center justify-between pt-2">
              <button
                disabled={page <= 1 || historyLoading}
                onClick={() => fetchHistory(bearerToken, page - 1)}
                className="px-4 py-2 rounded-xl border text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                {t.prev}
              </button>
              <span className="text-sm text-neutral-400">
                {t.page} {page} {t.of} {totalPages}
              </span>
              <button
                disabled={page >= totalPages || historyLoading}
                onClick={() => fetchHistory(bearerToken, page + 1)}
                className="px-4 py-2 rounded-xl border text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                {t.next}
              </button>
            </div>
          )}
        </div>
      </main>

      <WithdrawModal
        visible={showWithdrawModal}
        meaFree={availableMEA}
        usdtFree={availableUSDT}
        bearerToken={bearerToken}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={handleWithdrawSuccess}
        t={t}
      />
    </div>
  )
}
