import { Routes, Route, Navigate } from 'react-router-dom'
import { Home } from './Home.jsx'
import { Login } from './user/Login.jsx'
import { Signup } from './user/Signup.jsx'
import { Signout } from './user/Signout.jsx'
import { Dashboard } from './user/Dashboard.jsx'
import { Hero } from './user/Hero.jsx'
import { Settings } from './user/components/Settings.jsx'
function App() {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signout" element={<Signout />} />

      {/* USER DASHBOARD WITH NESTED ROUTES */}
      <Route path="/dashboard" element={<Dashboard />}>
        {/* Renders at /dashboard/hero inside Dashboard's <Outlet /> */}
        <Route path="hero" element={<Hero />} />
        <Route path="settings" element={<Hero />} />
      </Route>

      {/* FALLBACK ROUTE */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App