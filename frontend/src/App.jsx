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
import { SingleElilmination } from './user/Create_select_game/SingleElilmination.jsx'
import { DoubleElimination } from './user/Create_select_game/DoubleElimination.jsx'
import { QuadroEliminations } from './user/QuadroEliminations.jsx'
import { OpenPlay } from './user/Create_select_game/OpenPlay.jsx'
import { SingleDashb } from './Tour_dashb/SingleDashb.jsx'
import { QuadroDashb } from './Tour_dashb/QuadroDashb.jsx'
import { OpenplayDashb } from './Tour_dashb/OpenplayDashb.jsx'
import { Bracket_Single_VIew } from './user/bracket&lead/Single/Bracket_Single_VIew.jsx'


function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center   text-2xl items-center bg-gray-200 h-screen flex flex-row gap-1 items-center">
        Wait a sec
        <img src="/racket.png?v=5" alt="" className="h-5 w-5 animate-spin" />
        ...
      </div>
    )
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
        <Route path="/dashboard/hero" element={<Hero />} />
        <Route path="/dashboard/settings" element={<Settings />} />
        <Route path="/dashboard/matching" element={<Matching />} />
        <Route path="/dashboard/single" element={<SingleElilmination />} />
        <Route path="/dashboard/bracketsingleview" element={<Bracket_Single_VIew />} />
        <Route path="/dashboard/double" element={<DoubleElimination />} />
        <Route path="/dashboard/quadro" element={<QuadroEliminations />} />
        <Route path="/dashboard/openplay" element={<OpenPlay />} />
        <Route path="/dashboard/overview" element={<Overview />} />
        <Route path="/dashboard/quadrodashb" element={<QuadroDashb />} />
        <Route path="/dashboard/singledashb" element={<SingleDashb />} />
        <Route path="/dashboard/openplaydashb" element={<OpenplayDashb />} />
        <Route path="/dashboard/leaderboards" element={<Leaderboards />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App