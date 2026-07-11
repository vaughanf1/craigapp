import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import AppShell from './pages/app/AppShell'
import Today from './pages/app/Today'
import CoachChat from './pages/app/CoachChat'
import GoalPlan from './pages/app/GoalPlan'
import Settings from './pages/app/Settings'

// Single-file (artifact) builds have no server to handle path routing
const Router = import.meta.env.MODE === 'artifact' ? HashRouter : BrowserRouter

export default function App() {
  return (
    <StoreProvider>
      <Router basename={import.meta.env.MODE === 'artifact' ? undefined : import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/start" element={<Onboarding />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Today />} />
            <Route path="coach" element={<CoachChat />} />
            <Route path="goal" element={<GoalPlan />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </StoreProvider>
  )
}
