import React, { useEffect, useState } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export const SingleDashb = () => {
  const [tournaments, setTournaments] = useState([])
  const navigate = useNavigate()

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments')
      setTournaments(res.data)
    } catch (err) {
      console.error('Get tournaments error:', err)
    }
  }

  useEffect(() => {
    fetchTournaments()
  }, [])

  return (
    <div className="w-full flex flex-col gap-20 ">
      <div className="flex justify-between flex-row items-center">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        <h1 className="font-bold text-lg">Single Elimination</h1>

        <button
          onClick={() => navigate('/dashboard/single')}
          className="flex flex-row rounded-md p-2 items-center space-x-3 text-md font-bold"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {tournaments.map(tournament => (
          <div 
          className='border border-black/80 p-4 rounded-md text-lg font-bold capitalize hover:bg-gray-100'
          key={tournament.id}>{tournament.name}</div>
        ))}
      </div>
    </div>
  )
}