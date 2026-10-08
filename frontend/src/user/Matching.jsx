import React from 'react'
import { Plus } from 'lucide-react'
export const Matching = () => {
  return (
    <div className='flex flex-col  h-screen w-full'>
        <div className='space-y-10'>
             <div className='flex flex-row '>
                <h1 className='font-bold text-lg'>
                    Matching brackets
                </h1>

                
            </div>

            <div className='border border-black/80 p-5 w-20 flex justify-center items-center'>
                <Plus />

            </div>

        </div>
       




    </div>
  )
}
