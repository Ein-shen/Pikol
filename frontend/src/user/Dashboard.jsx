import React from 'react'
import { Outlet } from 'react-router-dom'

import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
export const Dashboard = () => {
  return (
    <div className='bg-green-100 h-screen overflow-y-auto'>
      <Navbar />

      <Sidebar />
      <main className='pt-16 pb-20'>
        <Outlet />
      </main>

      
      
    </div>
  )
}