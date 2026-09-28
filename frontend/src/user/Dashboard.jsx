import React from 'react'
import { Outlet } from 'react-router-dom'
import { Bottom_bar } from './Bottom_bar'
import { Upperbar } from './Upperbar'

export const Dashboard = () => {
  return (
    <div className='bg-green-100 h-screen overflow-y-auto'>
      <Upperbar />

      <main className='pt-16 pb-20'>
        <Outlet />
      </main>

      <Bottom_bar />
    </div>
  )
}