import React, { useState, useEffect } from 'react'
import { Plus, X, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export const Matching = () => {
  const [show, setShow] = useState(false)
  const [dataTournament, setDataTournament] = useState([])   // [] not false
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const navigate = useNavigate()

  const pickType = (name) => {
    setSelected(name)
    setShow(false)
  }

  useEffect(() => {
    api.get('/tournaments')
      .then(res => setDataTournament(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  // { "single elimination": 3, "double elimination": 1 }
  const typeCounts = dataTournament.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1
    return acc
  }, {})

  const hasTournaments = dataTournament.length > 0

  return (
    <div className="min-h-screen w-full bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Matching brackets</h1>
            <p className="mt-1 text-sm text-gray-500">20 players · 10 teams</p>
          </div>

          <button
            onClick={() => setShow(true)}
            className="flex items-center gap-2 rounded-lg bg-black px-4 py-3 text-white hover:bg-gray-800"
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
              Create a tournament, register 10 teams, and start matching.
            </p>
            <button
              onClick={() => setShow(true)}
              className="mt-5 rounded-lg bg-black px-5 py-3 text-white"
            >
              Create your first bracket
            </button>
          </div>
        )}

        {/* HAS DATA: one button per type that exists */}
        {!loading && hasTournaments && (
          <div className="flex flex-col space-y-6">
            <h1 className="font-bold text-lg">Used match for tournaments</h1>

            <div className="flex flex-row flex-wrap gap-4">
              {Object.entries(typeCounts).map(([type, count]) => (
                <button
                  onClick={() => navigate('/dashboard/singledashb')}
                  key={type}
                  className="p-6 border border-black/80 font-bold text-lg rounded-md capitalize"
                >
                  <span>
                    {type} Elimination
                  </span>
                  
                  <span className="font-bold text-md ml-2">
                    {count} {count === 1 ? 'tournament' : 'tournaments'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* POPUP (unchanged) */}
        {show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="relative rounded-xl bg-white p-10 shadow-lg space-y-4">
              <button
                type="button"
                onClick={() => setShow(false)}
                className="absolute right-3 top-3 text-gray-500 hover:text-black"
              >
                <X size={20} />
              </button>

              <div className="flex items-center justify-center">
                <h1 className="font-semibold text-lg">Select your game management</h1>
              </div>

              <div className="grid grid-cols-2 items-center justify-center gap-x-3 gap-y-3">
                <button
                  onClick={() => navigate('/dashboard/single')}
                  className="font-semibold w-44 h-24 rounded-md border border-black/80 p-6 text-center hover:bg-gray-100"
                >
                  Single elimination
                </button>

                <button
                  onClick={() => navigate('/dashboard/double')}
                  className="font-semibold w-44 h-24 rounded-md  border border-black/80 p-6 text-center hover:bg-gray-100"
                >
                  Double Elimination
                </button>

                <button
                  onClick={() => navigate('/dashboard/quadro')}
                  className="font-semibold w-44 h-24 rounded-md  border border-black/80 p-6 text-center hover:bg-gray-100"
                >
                  Quadro Elimination
                </button>

                <button
                  onClick={() => navigate('/dashboard/openplay')}
                  className="font-semibold w-44 h-24 rounded-md border border-black/80 p-6 text-center hover:bg-gray-100"
                >
                  Open play
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}