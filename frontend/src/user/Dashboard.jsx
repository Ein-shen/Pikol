import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

export const Dashboard = ({ user, setUser }) => {
 
  return (
    <div className='bg-green-100 min-h-screen flex flex-col'>
      {/* Top Navigation */}
      <Navbar />

      {/* Left Sidebar (fixed, so it sits outside the normal layout flow) */}
      <Sidebar setUser={setUser}  />

      {/* Dynamic Nested Content */}
      <main className='flex-1 p-6 pt-16 md:pt-6 md:ml-64'>
        <Outlet />
      </main>
    </div>
  )
}