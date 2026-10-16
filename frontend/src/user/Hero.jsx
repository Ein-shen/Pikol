import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export const Hero = () => {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  const fetchUser = async () => {
    try {
      const res = await api.get('/me')   // -> http://localhost:5000/api/me
      setUser(res.data)
    } catch (err) {
      console.error('Get User error:', err)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return (
    <div className="flex flex-col w-full gap-20">
      <div className="flex flex-row items-center justify-between">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        <h1 className="font-bold text-lg">Hero section</h1>

        <div className="w-6" />
      </div>

      <div>@{user?.username}</div>
      <div>{user?.email}</div>
    </div>
  )
}