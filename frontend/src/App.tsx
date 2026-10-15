import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/lib/queryClient'
import { FireReportPage } from '@/pages/FireReportPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FireReportPage />
    </QueryClientProvider>
  )
}
