import React from 'react'
import { Outlet } from 'react-router-dom'
import { Bottom_bar } from './Bottom_bar'

export const Dashboard = () => {
  return (
    <div className='bg-green-100 h-screen'>
      <Outlet />
      <Bottom_bar/>
    </div>
  )
}