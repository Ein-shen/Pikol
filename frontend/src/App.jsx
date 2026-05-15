import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import { Home } from './Home.jsx'
import { Login } from './user/Login.jsx'
import { Signup } from './user/Signup.jsx'
import { Signout } from './user/Signout.jsx'
import { Dashboard } from './user/Dashboard.jsx'
import { Hero } from './user/Hero.jsx'
import { Settings } from './user/components/Settings.jsx'

// Runs once, not on every render
axios.defaults.withCredentials = true

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/me')
        setUser(res.data)
      } catch (err) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login setUser={setUser} />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard" replace /> : <Signup setUser={setUser} />}
      />
      <Route path="/signout" element={<Signout setUser={setUser} />} />

      {/* PROTECTED DASHBOARD */}
      <Route
        path="/dashboard"
        element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />}
      >
        <Route path="hero" element={<Hero />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App