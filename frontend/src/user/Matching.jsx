import React, { useState, useEffect } from 'react'
import { Plus, X, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export const Matching = () => {
  const [show, setShow] = useState(false)
  const [dataTournament, setDataTournament] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/tournaments')
      .then((res) => setDataTournament(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  // { "single": 3, "double": 1 }
  const typeCounts = dataTournament.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1
    return acc
  }, {})

  const hasTournaments = dataTournament.length > 0

  return (
    <div className="w-full flex flex-col gap-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-lg font-bold">Matching brackets</h1>

        <button
          onClick={() => setShow(true)}
          className="flex items-center gap-2 rounded-md theme-hover theme-accent px-4 py-2 text-white "
        >
          <Plus size={18} />
          Create tournament
        </button>
      </header>

      {loading && <p className="text-gray-500">Loading...</p>}

      {/* NO DATA */}
      {!loading && !hasTournaments && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Trophy className="mx-auto mb-4 text-gray-400" size={40} />
          <h2 className="text-lg font-semibold">No tournament yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Create a tournament, register your teams, and start matching.
          </p>
          <button
            onClick={() => setShow(true)}
            className="mt-5 rounded-lg theme-muted px-5 py-3 text-white"
          >
            Create your first bracket
          </button>
        </div>
      )}

      {/* HAS DATA: one button per type that exists */}
      {!loading && hasTournaments && (
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-bold">Used match for tournaments</h2>

          <div className="flex flex-col w-full flex-wrap gap-4">
            {Object.entries(typeCounts).map(([type, count]) => (
              <button
                onClick={() => navigate('/dashboard/singledashb')}
                key={type}
                className="flex flex-col theme-border rounded-md border border-black/80 theme-hover p-6 text-md font-bold capitalize  text-input theme-accent"
              >
                <span>{type} Elimination</span>

                <span className="flex flex-row  right-0 items-center gap-1 pt-1 text-xs font-bold text-green-600">
                  <img
                    src="https://img.icons8.com/?size=100&id=kuU7I7uPlHfo&format=png&color=000000"
                    alt="trophy"
                    height={10}
                    width={15}
                  />
                  {count} {count === 1 ? 'tournament' : 'tournaments'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* POPUP */}
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="relative space-y-4 rounded-xl theme-bg p-10 shadow-lg">
            <button
              type="button"
              onClick={() => setShow(false)}
              className="absolute right-3 top-3 text-gray-500 hover:text-black"
            >
              <X size={20} />
            </button>

            <div className="flex items-center justify-center ">
              <h2 className="text-lg font-semibold">Select your game management</h2>
            </div>

            <div className=" flex flex-row items-center justify-center gap-3 pt-10">
              <button
                onClick={() => navigate('/dashboard/single')}
                className="h-24 w-44 rounded-md border border-black/80 p-6 text-center font-semibold  theme-hover theme-accent"
              >
                Single elimination
              </button>

              <button
                onClick={() => navigate('/dashboard/double')}
                className="h-24 w-44 rounded-md border border-black/80 p-6 text-center font-semibold  theme-hover theme-accent "
              >
                Double Elimination
              </button>

              <button
                onClick={() => navigate('/dashboard/quadro')}
                className="h-24 w-44 rounded-md border border-black/80 p-6 text-center font-semibold  theme-input"
              >
                Quadro Elimination
              </button>

              {/* <button
                onClick={() => navigate('/dashboard/openplay')}
                className="h-24 w-44 rounded-md border border-black/80 p-6 text-center font-semibold hover:bg-gray-100"
              >
                Open play
              </button> */}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}