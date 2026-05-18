import React, { useMemo, useState } from 'react'
import {
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Percent,
  UserCog,
  Activity,
  CheckCircle2,
  Landmark,
  Settings,
  Copy,
  Check,
} from 'lucide-react'
import { useSwapProgram } from '../swap/swap-data-access'
import { useWallet } from '@solana/wallet-adapter-react'
import { useLang } from '../lang-provider'

const translations = {
  en: {
    title: 'Protocol Admin',
    subtitle: 'Manage reserves, fees, and protocol authority.',
    network: 'Mainnet Beta',
    swapReserves: 'Swap Reserves',
    treasuryReserves: 'Treasury Reserves',
    settingsOverview: 'Settings Overview',
    currentFee: 'Current Fee',
    adminAuth: 'Admin Auth',
    withdrawTreasury: 'Withdraw Treasury',
    withdrawDesc:
      'Withdrawing will sweep all accumulated protocol fees from the Treasury Reserves directly to the configured admin wallet. This action does not affect Swap Reserves.',
    withdrawBtn: 'Withdraw All Treasury Funds',
    fundSwap: 'Fund Swap Reserves',
    addSpl: 'Add Standard SPL',
    add2022: 'Add Token-2022',
    addBtn: 'Add',
    updateFee: 'Update Protocol Fee',
    newFee: 'New Fee Percentage (%)',
    feeDesc: 'Current fee is {fee}%. Updates take effect immediately.',
    updateFeeBtn: 'Update Fee',
    transferAuth: 'Transfer Authority',
    newAdmin: 'New Admin Public Key',
    adminWarn: 'Warning: This action is irreversible. Ensure the new address is correct.',
    transferBtn: 'Transfer Admin Rights',
    toastWithdraw: 'Successfully withdrew all treasury funds',
    toastAddSpl: 'Added {amount} to Swap SPL Reserves',
    toastAdd2022: 'Added {amount} to Swap Token-2022 Reserves',
    toastFee: 'Protocol fee updated to {fee}%',
    toastAdmin: 'Admin authority transferred to {admin}',
    placeholderWallet: 'Enter Solana Wallet Address',
  },
  ko: {
    title: '프로토콜 관리자',
    subtitle: '준비금, 수수료 및 프로토콜 권한을 관리합니다.',
    network: '메인넷 베타',
    swapReserves: '스왑 준비금',
    treasuryReserves: '트레저리 준비금',
    settingsOverview: '설정 개요',
    currentFee: '현재 수수료',
    adminAuth: '관리자 권한',
    withdrawTreasury: '트레저리 출금',
    withdrawDesc:
      '출금 시 트레저리 준비금에 누적된 모든 프로토콜 수수료가 설정된 관리자 지갑으로 일괄 전송됩니다. 스왑 준비금에는 영향을 미치지 않습니다.',
    withdrawBtn: '모든 트레저리 자금 출금',
    fundSwap: '스왑 준비금 입금',
    addSpl: '일반 SPL 추가',
    add2022: 'Token-2022 추가',
    addBtn: '추가',
    updateFee: '프로토콜 수수료 업데이트',
    newFee: '새 수수료 비율 (%)',
    feeDesc: '현재 수수료는 {fee}%입니다. 업데이트는 즉시 적용됩니다.',
    updateFeeBtn: '수수료 업데이트',
    transferAuth: '권한 양도',
    newAdmin: '새 관리자 공개 키',
    adminWarn: '경고: 이 작업은 되돌릴 수 없습니다. 새 주소가 정확한지 확인하십시오.',
    transferBtn: '관리자 권한 양도',
    toastWithdraw: '성공적으로 모든 트레저리 자금을 출금했습니다.',
    toastAddSpl: '스왑 SPL 준비금에 {amount}을(를) 추가했습니다.',
    toastAdd2022: '스왑 Token-2022 준비금에 {amount}을(를) 추가했습니다.',
    toastFee: '프로토콜 수수료가 {fee}%로 업데이트되었습니다.',
    toastAdmin: '관리자 권한이 {admin}(으)로 양도되었습니다.',
    placeholderWallet: '솔라나 지갑 주소 입력',
  },
}

export default function AdminPanel() {
  // Language State
  const { isKorean } = useLang()
  const { publicKey } = useWallet()

  const {
    swapStateQuery,
    balances,
    updateFeeMutation,
    updateAdminMutation,
    withdrawFeesMutation,
    addSplReserveMutation,
    add2022ReserveMutation,
  } = useSwapProgram()

  const { feePct, adminWallet } = useMemo(() => {
    const bps = swapStateQuery.data?.feeBps ?? 20
    const fee = bps / 100
    const admin = swapStateQuery.data?.admin?.toBase58() ?? 'DhKycm2Z9JqsssS6uUCUwsKpevq5WWhRZHknCCxG67ev'
    return { feePct: fee, adminWallet: admin }
  }, [swapStateQuery.data])

  // Input States
  const [addSplAmount, setAddSplAmount] = useState<string>('')
  const [add2022Amount, setAdd2022Amount] = useState<string>('')

  const [newFee, setNewFee] = useState<string>('')
  const [newAdmin, setNewAdmin] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Admin state (hardcoded for now)
  const isAdmin =
    publicKey?.toBase58() === adminWallet || publicKey?.toBase58() === 'DhKycm2Z9JqsssS6uUCUwsKpevq5WWhRZHknCCxG67ev' || publicKey?.toBase58() === 'i2tZJMMTqrcYv53qdLFsouL1JQPWgKiTfZ6sRDfk7nL'

  // UI State
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const t = translations[isKorean ? 'ko' : 'en']

  // Helper to format: 0x1234...5678
  const formatAddress = (addr: string) => {
    return addr ? `${addr.slice(0, 5)}...${addr.slice(-5)}` : ''
  }

  const handleCopy = () => {
    if (adminWallet) {
      navigator.clipboard.writeText(adminWallet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function uiToRaw(uiAmount: string, decimals: number): bigint {
    const [whole, fraction = ''] = uiAmount.split('.')

    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)

    return BigInt(whole + paddedFraction)
  }

  // Simulated Handlers
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    await withdrawFeesMutation.mutateAsync()
    showToast(t.toastWithdraw)
  }

  const handleAddSpl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addSplAmount || isNaN(Number(addSplAmount))) return
    const raw = uiToRaw(addSplAmount, 6)
    await addSplReserveMutation.mutateAsync(raw.toString())
    showToast(t.toastAddSpl.replace('{amount}', addSplAmount))
    setAddSplAmount('')
  }

  const handleAdd2022 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!add2022Amount || isNaN(Number(add2022Amount))) return
    const raw = uiToRaw(add2022Amount, 6)
    await add2022ReserveMutation.mutateAsync(raw.toString())
    showToast(t.toastAdd2022.replace('{amount}', add2022Amount))
    setAdd2022Amount('')
  }

  const handleChangeFee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFee) return
    const feeBps = Math.round(Number(newFee) * 100)
    if (isNaN(feeBps) || feeBps < 0 || feeBps > 10000) return
    await updateFeeMutation.mutateAsync(feeBps)
    showToast(t.toastFee.replace('{fee}', newFee))
    setNewFee('')
  }

  const handleChangeAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdmin) return
    await updateAdminMutation.mutateAsync(newAdmin)
    showToast(t.toastAdmin.replace('{admin}', newAdmin))
    setNewAdmin('')
  }

  return (
    <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 p-4 md:p-8 font-sans transition-colors duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-max max-w-[90vw] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-5 z-50">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {!isAdmin ? (
        <div className="flex items-center justify-center h-[80vh]">
          <Shield size={64} className="text-slate-300 dark:text-slate-800/50" strokeWidth={1} />
        </div>
      ) : (
        <div className="lg:max-w-11/12 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Shield className="text-indigo-600 dark:text-indigo-500" size={32} />
                {t.title}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t.subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              {/* <button
                onClick={() => setLanguage((prev) => (prev === 'en' ? 'ko' : 'en'))}
                className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium text-sm"
                aria-label="Toggle language"
              >
                <Globe size={18} />
                {language === 'en' ? 'KO' : 'EN'}
              </button> */}

              {/* Network Badge */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.network}</span>
              </div>
            </div>
          </div>

          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Swap Reserves */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-sm transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                  <Activity size={24} />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t.swapReserves}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-xs font-medium">SPL</h3>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {balances?.[0]?.amount.toString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-xs font-medium">Token-2022</h3>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {balances?.[1]?.amount.toString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Treasury Reserves */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-sm transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
                  <Landmark size={24} />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t.treasuryReserves}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-xs font-medium">SPL</h3>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {balances?.[2]?.amount.toString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-xs font-medium">Token-2022</h3>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {balances?.[3]?.amount.toString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Protocol Configuration Stats */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-sm flex flex-col justify-between transition-colors">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                    <Settings size={24} />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t.settingsOverview}</h2>
              </div>
              <div className="flex justify-between items-end mt-1">
                <div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.currentFee}</h3>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{feePct}%</p>
                </div>
                <div className="text-right">
                  <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.adminAuth}</h3>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <p className="text-sm font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {formatAddress(adminWallet)}
                    </p>
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500"
                      title="Copy Address"
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Action Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Liquidity Management */}
            <div className="space-y-6">
              {/* Withdraw Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <ArrowUpRight size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.withdrawTreasury}</h2>
                </div>

                <form onSubmit={handleWithdraw} className="space-y-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{t.withdrawDesc}</p>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 dark:shadow-indigo-500/20"
                  >
                    {t.withdrawBtn}
                  </button>
                </form>
              </div>

              {/* Add Reserves Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <ArrowDownLeft size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.fundSwap}</h2>
                </div>

                <div className="space-y-6">
                  <form onSubmit={handleAddSpl} className="space-y-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 ml-1">
                      {t.addSpl}
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        step="any"
                        value={addSplAmount}
                        onChange={(e) => setAddSplAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                      />
                      <button
                        type="submit"
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-6 rounded-xl font-medium transition-colors border border-slate-300 dark:border-slate-700"
                      >
                        {t.addBtn}
                      </button>
                    </div>
                  </form>

                  <div className="h-px w-full bg-slate-200 dark:bg-slate-800/50"></div>

                  <form onSubmit={handleAdd2022} className="space-y-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 ml-1">
                      {t.add2022}
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        step="any"
                        value={add2022Amount}
                        onChange={(e) => setAdd2022Amount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                      />
                      <button
                        type="submit"
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-6 rounded-xl font-medium transition-colors border border-slate-300 dark:border-slate-700"
                      >
                        {t.addBtn}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Column: Protocol Configuration */}
            <div className="space-y-6">
              {/* Change Fee Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                    <Percent size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.updateFee}</h2>
                </div>

                <form onSubmit={handleChangeFee} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 ml-1">
                      {t.newFee}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={newFee}
                        onChange={(e) => setNewFee(e.target.value)}
                        placeholder="e.g., 0.5"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 pr-12 transition-colors"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                        %
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 ml-1">
                      {t.feeDesc.replace('{fee}', feePct.toString())}
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                  >
                    {t.updateFeeBtn}
                  </button>
                </form>
              </div>

              {/* Change Admin Card */}
              <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/30 shadow-sm rounded-2xl p-6 relative overflow-hidden transition-colors">
                {/* Danger strip */}
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-400">
                    <UserCog size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.transferAuth}</h2>
                </div>

                <form onSubmit={handleChangeAdmin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 ml-1">
                      {t.newAdmin}
                    </label>
                    <input
                      type="text"
                      value={newAdmin}
                      onChange={(e) => setNewAdmin(e.target.value)}
                      placeholder={t.placeholderWallet}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 font-mono text-sm transition-colors"
                    />
                    <p className="text-xs text-rose-500 dark:text-rose-400/80 mt-2 ml-1 font-medium">{t.adminWarn}</p>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-rose-50 dark:bg-rose-600/10 hover:bg-rose-100 dark:hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 font-medium py-3 rounded-xl transition-colors"
                  >
                    {t.transferBtn}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
