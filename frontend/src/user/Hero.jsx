import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export const Hero = () => {
  const [showEdit, setShowEdit] =  useState(false)
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
        <button 
          className='theme-hover p-2 rounded-md'
          onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        <h1 className="font-bold text-lg"><span className='text-lg font-bold  '>@{user?.username}</span></h1>

        <div className="w-6" />
      </header>

      
      <div className='flex flex-row items-center justify-center gap-5'>


        
        {/* Circle */}
        <div
         onClick={() => navigate()}
         className='rounded-xl items-center w-23 h-23 theme-border theme-accent border border-black/80 p-6'>
        <img src="https://img.icons8.com/?size=100&id=12438&format=png&color=000000" alt="default" height={52}  width={52} className='theme-icon'/>
        </div>

        {/* text name */}
         <div className='flex flex-col items-left justify-top gap-2'>
           
       
          <span className='text-xl flex flex-row gap-1 font-bold'> {user?.fullname} Shen Sarsale

            <span className="flex flex-row items-center justify-center   rounded p-2 theme-hover">
              <img
                src="https://img.icons8.com/?size=100&id=11737&format=png&color=000000"
                alt="edit"
                height={18}
                width={18}
                className="theme-icon"
              />
            </span>

          </span>
          <span className='text-xs  text-gray-400'>{user?.email}</span>
          

         
        </div>



         
          
       
       

       
      </div>
      


       

    </div>
  )
}