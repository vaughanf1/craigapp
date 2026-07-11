import { Suspense, lazy } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import ErrorBoundary from './components/ErrorBoundary'
import Landing from './pages/Landing'

const Onboarding = lazy(() => import('./pages/Onboarding'))
const AppShell = lazy(() => import('./pages/app/AppShell'))
const Today = lazy(() => import('./pages/app/Today'))
const CoachChat = lazy(() => import('./pages/app/CoachChat'))
const GoalPlan = lazy(() => import('./pages/app/GoalPlan'))
const Settings = lazy(() => import('./pages/app/Settings'))
const Legal = lazy(() => import('./pages/Legal'))

// Single-file (artifact) builds have no server to handle path routing
const Router = import.meta.env.MODE === 'artifact' ? HashRouter : BrowserRouter

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fog">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <Router basename={import.meta.env.MODE === 'artifact' ? undefined : import.meta.env.BASE_URL}>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/start" element={<Onboarding />} />
              <Route path="/privacy" element={<Legal section="privacy" />} />
              <Route path="/terms" element={<Legal section="terms" />} />
              <Route path="/app" element={<AppShell />}>
                <Route index element={<Today />} />
                <Route path="coach" element={<CoachChat />} />
                <Route path="goal" element={<GoalPlan />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Landing />} />
            </Routes>
          </Suspense>
        </Router>
      </StoreProvider>
    </ErrorBoundary>
  )
}
