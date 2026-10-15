import React from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
export const Signout = () => {
  const {setUser} = useAuth()
  const navigate = useNavigate()

  const handleSignout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.error('Logout request failed', err)
    } finally {
      // Clear the user even if the request failed, so the UI logs out
      setUser(null)
      navigate('/login', { replace: true })
    }
  }

  return (
    <button
      onClick={handleSignout}
      className=""
    >
      
      Sign out
    </button>
  )
}