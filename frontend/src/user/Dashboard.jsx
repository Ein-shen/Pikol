import React from 'react'
import { Outlet } from 'react-router-dom'
import { Bottom_bar } from './Bottom_bar'

export const Dashboard = () => {
  return (
    <div>
      <Outlet />
      <Bottom_bar/>
    </div>
  )
}