import React from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export const Signout = ({ setUser }) => {
  const navigate = useNavigate()

  const handleSignout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout')
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
      className="w-full flex items-center gap-2 font-mono text-md rounded-md p-2 transition-colors theme-hover"
    >
      <LogOut className="w-4 h-4 shrink-0" />
      Sign out
    </button>
  )
}