import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Home } from './Home.jsx'
import { Login } from './user/Login.jsx'
import { Signup } from './user/Signup.jsx'
import { Signout } from './user/Signout.jsx'
import { Dashboard } from './user/Dashboard.jsx'
import { Hero } from './user/Hero.jsx'
import { Settings } from './user/components/Settings.jsx'
import { Matching } from './user/Matching.jsx'
import { Overview } from './user/Overview.jsx'
import { Leaderboards } from './user/Leaderboards.jsx'
function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard" replace /> : <Signup />}
      />
      <Route path="/signout" element={<Signout />} />

      {/* PROTECTED DASHBOARD */}
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/login" replace />}
      >
        <Route path="hero" element={<Hero />} />
        <Route path="settings" element={<Settings />} />
        <Route path="matching" element={<Matching />} />

        <Route path="overview" element={<Overview />} />
        <Route path="leaderboards" element={<Leaderboards />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App