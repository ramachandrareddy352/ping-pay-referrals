import { AppProviders } from '@/components/app-providers.tsx'
import { AppLayout } from '@/components/app-layout.tsx'
import { RouteObject, useRoutes } from 'react-router'
import { lazy } from 'react'

// const links = [
  
//   { label: 'Home', path: '/' },
//   { label: 'Account', path: '/account' },
//   { label: 'Counter Program', path: '/counter' },
// ]

const LazyCounter = lazy(() => import('@/components/swap/swap-ui'))
const LazyAdmin = lazy(() => import('@/components/admin/admin-ui'))

const routes: RouteObject[] = [
  { index: true, element: <LazyCounter /> },
  // {
  //   path: 'account',
  //   children: [
  //     { index: true, element: <LazyAccountIndex /> },
  //     { path: ':address', element: <LazyAccountDetail /> },
  //   ],
  // },
  { path: 'admin', element: <LazyAdmin /> },
]

export function App() {
  const router = useRoutes(routes)
  return (
    <AppProviders>
      <AppLayout>{router}</AppLayout>
    </AppProviders>
  )
}
