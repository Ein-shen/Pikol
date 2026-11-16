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

import { SingleElilmination } from './user/Create_select_game/SingleElilmination.jsx'
import { DoubleElimination } from './user/Create_select_game/DoubleElimination.jsx'
import { Top2_Brackets } from './user/Create_select_game/Top2_Brackets.jsx'
import { Top3_Brackets } from './user/Create_select_game/Top3_Brackets.jsx'
import { OpenPlay } from './user/Create_select_game/OpenPlay.jsx'
import { SingleDashb } from './user/Tour_dashb/SingleDashb.jsx'
import { Top2_Dashb } from './user/Tour_dashb/Top2_Dashb.jsx'
import { Top3_Dashb } from './user/Tour_dashb/Top3_Dashb.jsx'
import { OpenplayDashb } from './user/Tour_dashb/OpenplayDashb.jsx'

 
import { PulseLoader } from 'react-spinners'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        role='status'
        aria-live='polite'
        className='flex flex-col items-center justify-center gap-6 theme-bg h-screen'
      >
        <h1 className='font-bold italic theme-text text-xl sm:text-2xl md:text-3xl tracking-wide whitespace-nowrap'>
          Pikol <span className='text-[#A8D38D]'>League</span>
        </h1>

        <PulseLoader color='#A8D38D' size={12} margin={4} />
      </div>
    )
  }

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard/overview" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard/overview" replace /> : <Signup />}
      />
            <Route path="/signout" element={<Signout />} />

      {/* PROTECTED DASHBOARD */}
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/login" replace />}
      >
        <Route path="/dashboard/hero" element={<Hero />} />
 
        <Route path="/dashboard/matching" element={<Matching />} />
        <Route path="/dashboard/single" element={<SingleElilmination />} />
        <Route path="/dashboard/double" element={<DoubleElimination />} />
        <Route path="/dashboard/top2" element={<Top2_Brackets />} />
        <Route path="/dashboard/top3" element={<Top3_Brackets />} />
        <Route path="/dashboard/openplay" element={<OpenPlay />} />
        <Route path="/dashboard/overview" element={<Overview />} />
        <Route path="/dashboard/top2dashb" element={<Top2_Dashb />} />
        <Route path="/dashboard/top3dashb" element={<Top3_Dashb />} />
        <Route path="/dashboard/singledashb" element={<SingleDashb />} />
        <Route path="/dashboard/openplaydashb" element={<OpenplayDashb />} />
       

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