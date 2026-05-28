import { useState } from 'react'
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

  // function isActive(path: string) {
  //   return path === '/' ? pathname === '/' : pathname.startsWith(path)
  // }

  return (
    <header className="sticky top-0 z-50 px-4 py-2 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400">
      <div className="mx-auto flex justify-between items-center">
        <div className="flex items-baseline gap-4">
          <Link to="/" className="text-xl hover:text-neutral-500 dark:hover:text-white">
            <div className="flex items-center gap-2">
              <img className="w-8 h-8 rounded-full" src="/apple-touch-icon.png" alt="T22" />
              <span>PingPay Referrals</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center">
            <ul className="flex gap-4 flex-nowrap items-center">
              {/* {links.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    className={`hover:text-neutral-500 dark:hover:text-white ${isActive(path) ? 'text-neutral-500 dark:text-white' : ''}`}
                    to={path}
                  >
                    {label}
                  </Link>
                </li>
              ))} */}
            </ul>
          </div>
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
          {/* <ClusterUiSelect /> */}
          <ThemeSelect />
        </div>

        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[52px] bottom-0 bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-sm">
            <div className="flex flex-col p-4 gap-4 border-t dark:border-neutral-800">
              {/* <ul className="flex flex-col gap-4">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`hover:text-neutral-500 dark:hover:text-white block text-lg py-2  ${isActive(path) ? 'text-neutral-500 dark:text-white' : ''} `}
                      to={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul> */}
              <div className="flex flex-col gap-4">
                <WalletButton />
                <button
                  onClick={() => setLang(isKorean ? 'en' : 'ko')}
                  className="flex w-fit items-center gap-2 px-3 py-1.5 rounded-lg border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:dark:bg-input/50 dark:bg-input/30 dark:border-white/10 text-sm font-bold transition-all"
                >
                  <Globe size={22} />
                  {isKorean ? 'EN' : 'KO'}
                </button>
                {/* <ClusterUiSelect /> */}
                <ThemeSelect />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
