import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import AppShell from './pages/app/AppShell'
import Today from './pages/app/Today'
import CoachChat from './pages/app/CoachChat'
import GoalPlan from './pages/app/GoalPlan'
import Settings from './pages/app/Settings'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </StoreProvider>
  )
}
