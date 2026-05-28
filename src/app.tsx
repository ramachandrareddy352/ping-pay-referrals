import { AppProviders } from '@/components/app-providers.tsx'
import { AppLayout } from '@/components/app-layout.tsx'
import { RouteObject, useRoutes } from 'react-router'
import { lazy } from 'react'

const LazyReferral = lazy(() => import('@/components/referrals/referral-ui'))
const LazyWithdraw = lazy(() => import('@/components/referrals/withdraw-ui'))

const routes: RouteObject[] = [
  { index: true, element: <LazyReferral /> },
  { path: 'withdrawals', element: <LazyWithdraw /> },
]

export function App() {
  const router = useRoutes(routes)
  return (
    <AppProviders>
      <AppLayout>{router}</AppLayout>
    </AppProviders>
  )
}
