import { useState } from 'react'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Globe, Menu, X } from 'lucide-react'
import { ThemeSelect } from '@/components/theme-select'
// import { ClusterUiSelect } from './cluster/cluster-ui'
import { WalletButton } from '@/components/solana/solana-provider'
import { Link } from 'react-router'
import { useLang } from './lang-provider'

// { links = [] }: { links: { label: string; path: string }[] }
export function AppHeader() {
  // const { pathname } = useLocation()
  const [showMenu, setShowMenu] = useState(false)
  const { isKorean, setLang } = useLang()
  const { pathname } = useLocation()

  const navLinks = [
    { label: 'Referrals', path: '/' },
    { label: 'Withdrawals', path: '/withdrawals' },
  ]

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 px-4 py-2 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400">
      <div className="mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link to="/" className="text-xl hover:text-neutral-500 dark:hover:text-white">
            <div className="flex items-center gap-2">
              <img className="w-8 h-8 rounded-full" src="/apple-touch-icon.png" alt="T22" />
              <span>PingPay Referrals</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive(path)
                    ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        <div className="hidden md:flex items-center gap-4">
          <WalletButton />
          <button
            onClick={() => setLang(isKorean ? 'en' : 'ko')}
            className="flex w-fit items-center gap-2 px-3 py-1.5 rounded-lg border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:dark:bg-input/50 dark:bg-input/30 dark:border-white/10 text-sm font-bold transition-all"
          >
            <Globe size={22} />
            {isKorean ? 'EN' : 'KO'}
          </button>
          <ThemeSelect />
        </div>

        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[52px] bottom-0 bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-sm">
            <div className="flex flex-col p-4 gap-1 border-t dark:border-neutral-800">
              {/* Mobile nav */}
              {navLinks.map(({ label, path }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setShowMenu(false)}
                  className={`px-3 py-2.5 rounded-lg text-base font-semibold transition-all ${
                    isActive(path)
                      ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
                  }`}
                >
                  {label}
                </Link>
              ))}

              <div className="flex flex-col gap-4 pt-3 mt-2 border-t dark:border-neutral-800">
                <WalletButton />
                <button
                  onClick={() => setLang(isKorean ? 'en' : 'ko')}
                  className="flex w-fit items-center gap-2 px-3 py-1.5 rounded-lg border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:dark:bg-input/50 dark:bg-input/30 dark:border-white/10 text-sm font-bold transition-all"
                >
                  <Globe size={22} />
                  {isKorean ? 'EN' : 'KO'}
                </button>
                <ThemeSelect />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
