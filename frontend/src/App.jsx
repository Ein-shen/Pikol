import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Home } from './Home.jsx'
import { Login } from './user/Login.jsx'
import { Signup } from './user/Signup.jsx'
import { Signout } from './user/Signout.jsx'
import { Dashboard } from './user/Dashboard.jsx'
import { Hero } from './user/Hero.jsx'
import { Settings_components } from './user/components/Settings_components.jsx'
import { About_components } from './user/components/About_components.jsx'
import { Support_components }  from './user/components/Support_components.jsx'
import { Matching } from './user/Matching.jsx'
import { Overview } from './user/Overview.jsx'
import { Leaderboards } from './user/Leaderboards.jsx'
import { SingleElilmination } from './user/Create_select_game/SingleElilmination.jsx'
import { DoubleElimination } from './user/Create_select_game/DoubleElimination.jsx'
import { QuadroEliminations } from './user/Create_select_game/QuadroEliminations.jsx'
import { OpenPlay } from './user/Create_select_game/OpenPlay.jsx'
import { SingleDashb } from './Tour_dashb/SingleDashb.jsx'
import { QuadroDashb } from './Tour_dashb/QuadroDashb.jsx'
import { OpenplayDashb } from './Tour_dashb/OpenplayDashb.jsx'
import { Lead_Single_e } from './user/bracket&lead/Single/Lead_Single_e.jsx'
import { Bracket_quadro_e } from './user/bracket&lead/quadro/Bracket_quadro_e.jsx'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-row gap-1 justify-center items-center text-2xl theme-bg h-screen">
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
        <Route path="/dashboard/single_lead" element={<Lead_Single_e />} />
        <Route path="/dashboard/matching" element={<Matching />} />
        <Route path="/dashboard/single" element={<SingleElilmination />} />
        <Route path="/dashboard/double" element={<DoubleElimination />} />
        <Route path="/dashboard/quadro" element={<QuadroEliminations />} />
        <Route path="/dashboard/openplay" element={<OpenPlay />} />
        <Route path="/dashboard/overview" element={<Overview />} />
        <Route path="/dashboard/quadrodashb" element={<QuadroDashb />} />
        <Route path="/dashboard/singledashb" element={<SingleDashb />} />
        <Route path="/dashboard/openplaydashb" element={<OpenplayDashb />} />
        <Route path="/dashboard/leaderboards" element={<Leaderboards />} />
        

        <Route path="/dashboard/settings_components" element={<Settings_components />} />
        <Route path="/dashboard/support_components" element={<Support_components />} />
        <Route path="/dashboard/about_components" element={<About_components />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App