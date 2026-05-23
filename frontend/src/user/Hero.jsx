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
      <header className="flex flex-row items-center justify-between">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        <h1 className="font-bold text-lg">Hero section</h1>

        <div className="w-6" />
      </header>

      <div className='flex flex-row items-center justify-center gap-5'>

        {/* Circle */}
        <div className='rounded-xl w-23 h-23 border border-black/80 p-6'>
        </div>

        {/* text name */}
         <div className='flex flex-col items-left justify-top gap-1'>
          <span className='text-lg font-bold capitalize'>@{user?.username}</span>
          <span className='text-lg  text-gray-400'>{user?.email}</span>

        </div>

       
      </div>
    </div>
  )
}