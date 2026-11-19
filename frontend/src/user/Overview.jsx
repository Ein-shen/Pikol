import React, { useState, useEffect } from 'react'
import api from '../api' // adjust to your axios instance path

export const Overview = () => {
  const [tournaments, setTournaments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/tournaments')
      .then((res) => {
        setTournaments(res.data.tournaments)
        setTotal(res.data.total)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  // Count tournaments per type (change `type` to your real column name)
  const typeCounts = tournaments.reduce((acc, t) => {
    const key = t.type || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  // Already sorted newest first by the API (ORDER BY id DESC)
  const recent = tournaments.slice(0, 5)

  if (loading) return <p>Loading...</p>

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Overview</h1>

      {/* Total */}
      <div className="border theme-border p-6 rounded-md">
        <p className="text-sm text-gray-500">Total tournaments</p>
        <p className="text-3xl font-black">{total}</p>
      </div>

      {/* Count by type */}
      <div className=" gap-4 w-full flex flex-row   ">
        
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type} className="flex flex-row justify-between w-full rounded-md p-4 space-y-3 border theme-border">
           
           <div className='flex flex-col gap-5'>
            <span className="capitalize text-gray-500 ">{type} 
             
            </span>
             <span className="font-bold text-3xl text-center">{count}</span>
            

           </div>
            
          </div>
        ))}
      </div>

    </div>
  )
}