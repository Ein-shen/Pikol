import React, { useState, useEffect } from 'react'
import api from '../api' // adjust to your axios instance path
import { PulseLoader } from 'react-spinners'


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

  if (loading) return (

    <div className='flex flex-row items-center gap-2'>

      <h1 className='text-lg font-semibold'>
          Loading Overview
      </h1>
        <PulseLoader color='#A8D38D' size={12} margin={4} />
    
    </div>
  
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg  animate-fade-in animation-delay-100  font-bold">Overview</h1>

      {/* Total */}
      <div className="border animate-fade-in animation-delay-300  theme-border p-6 rounded-md theme-hover theme-card">
        <p className="text-sm text-gray-500">Total tournaments</p>
        <p className="text-3xl font-black">{total}</p>
      </div>

      {/* Count by type */}
      <div className=" gap-4 w-full flex flex-row animate-fade-in animation-delay-400   ">
        
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type} className="flex flex-row justify-between w-full theme-hover theme-card rounded-md p-4 space-y-3 border theme-border">
           
           <div className='flex flex-col gap-5'>
            <span className="capitalize text-gray-500 ">{type} 
             
            </span>
             <span className="font-bold text-3xl text-center">{count}</span>
            

           </div>

           
            
          </div>
        ))}
      </div>
      <div className='flex flex-col pt-5'>
              <h1 className='flex flex-col gap-2'>

                Reminder:
                 
                  
                  <span> - show tournament anlytics</span>
                  <span> - show AI chatbot</span>
                  <span> - Add more precise Explaination of the tournament</span>
                   <span> - Add Confirmation popup in the delete and signout buttons</span>
                    <span> - add loacal storage each and fix the multer in the hero pic</span>
                     <span> - Implement Openplay backend andfrontend</span>
                      <span> - Add delay animation this web</span>
              </h1>
           </div>

    </div>
  )
}