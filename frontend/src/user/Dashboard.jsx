import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { useAuth } from '../context/AuthContext'

export const Dashboard = () => {
  const { setUser } = useAuth()
  return (
    <div className='bg-green-100 min-h-screen flex flex-col'>
      {/* Top Navigation (fixed) */}
      <Navbar />

      {/* Left Sidebar (fixed) */}
      <Sidebar setUser={setUser} />

      {/* Content: pt-16 clears the navbar, md:ml-56 clears the sidebar */}
      <main className='flex-1 pt-24 md:ml-56'>
        <div className='p-6'>
          <Outlet />
        </div>
      </main>
    </div>
  )
}