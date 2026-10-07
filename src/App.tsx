import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AppLayout } from './components/layout/AppLayout'
import { DecisionsPage } from './pages/DecisionsPage'
import { ScenariosPage } from './pages/ScenariosPage'
import { PathwayPage } from './pages/PathwayPage'
import { RiskWorklistPage } from './pages/RiskWorklistPage'
import { SegmentsPage } from './pages/SegmentsPage'
import { OverviewPage } from './pages/OverviewPage'
import { ForecastPage } from './pages/ForecastPage'
import { LongStayPage } from './pages/LongStayPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { CustomScenarioPage } from './pages/CustomScenarioPage'
import { BaselinePage } from './pages/BaselinePage'
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Default entrypoint directs to Executive Decision Suite per Spec Priority */}
          <Route index element={<Navigate to="/decisions" replace />} />
          <Route path="decisions" element={<DecisionsPage />} />
          <Route path="scenarios" element={<ScenariosPage />} />
          <Route path="scenarios/custom" element={<CustomScenarioPage />} />
          <Route path="pathway" element={<PathwayPage />} />
          <Route path="risk-worklist" element={<RiskWorklistPage />} />
          <Route path="segments" element={<SegmentsPage />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="long-stay" element={<LongStayPage />} />
          <Route path="baseline" element={<BaselinePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
  )
}

export default App
