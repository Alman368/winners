import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'

import { appRoutes } from '@/lib/routes'
import { queryClient } from '@/lib/queryClient'
import { FireReportPage } from '@/pages/FireReportPage'
import { LandingPage } from '@/pages/LandingPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path={appRoutes.landing} element={<LandingPage />} />
          <Route path={appRoutes.app} element={<FireReportPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
