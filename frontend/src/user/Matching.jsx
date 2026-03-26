import React, { useState, useEffect } from 'react'
import { Plus, X, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

// Where each tournament type's list page lives
const TYPE_ROUTES = {
  single: '/dashboard/singledashb',
  double: '/dashboard/double',
  top2: '/dashboard/quadrodashb',
  top3: '/dashboard/top3dashb',
}

// Name shown on each card (types not listed here show "<type> Elimination")
const TYPE_LABELS = {
  single: 'Single Elimination',
  double: 'Double Elimination',
  quadro: 'Top 2 Bracketing',
  top3: 'Top 3 Brackets',
  
}

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

  const typeCounts = dataTournament.reduce((acc, t) => {
    const key = t.type || 'single'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const hasTournaments = dataTournament.length > 0

  return (
    <div className="w-full flex flex-col gap-10">
      {/* Header */}
      <header className="flex flex-row items-center justify-between">
        {/* Left spacer */}
        <div className="w-10 shrink-0" />

        {/* Centered heading */}
        <h1 className="text-lg font-bold">Matching brackets</h1>

        {/* Create tournament button */}
        <button
          type="button"
          onClick={() => setShow(true)}
          className="theme-hover rounded-md p-2"
          aria-label="Create tournament"
        >
          <Plus size={24} />
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
            className="mt-5 rounded-lg theme-muted px-4 py-2 text-white"
          >
            Create your first bracket
          </button>
        </div>
      )}

      {/* HAS DATA */}
      {!loading && hasTournaments && (
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-bold">Used match for tournaments</h2>

          <div className="flex w-full flex-col flex-wrap gap-4">
            {Object.entries(typeCounts).map(([type, count]) => (
              <button
                onClick={() =>
                  navigate(TYPE_ROUTES[type] || '/dashboard/singledashb')
                }
                key={type}
                className="flex flex-col rounded-md border theme-border theme-card theme-hover p-6 text-left text-md font-bold capitalize text-input"
              >
                <span>{TYPE_LABELS[type] || `${type} Elimination`}</span>

                <span className="flex flex-row items-center gap-1 pt-1 text-xs font-bold">
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
        <div className="fixed inset-0 z-50 flex overflow-y-auto bg-black/75 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select your game management"
            className="relative m-auto w-full max-w-sm space-y-4 rounded-xl theme-bg theme-text p-5 shadow-lg sm:max-w-2xl sm:p-8 lg:max-w-3xl lg:p-10"
          >
            <button
              type="button"
              onClick={() => setShow(false)}
              aria-label="Close"
              className="absolute right-3 top-3 theme-muted hover:opacity-70"
            >
              <X size={20} />
            </button>

            <div className="flex items-center justify-center">
              <h2 className="pr-6 text-center text-base font-semibold sm:pr-0 sm:text-lg">
                Select your game management
              </h2>
            </div>

            <div className="flex flex-col items-stretch gap-3 pt-4 sm:flex-row sm:pt-8">
              <button
                onClick={() => navigate('/dashboard/single')}
                className="h-16 w-full rounded-md border theme-border theme-card theme-hover text/30 p-3 text-center text-sm font-semibold sm:h-24 sm:flex-1 sm:p-6 sm:text-base"
              >
                Single Elimination
              </button>

              

              <button
                onClick={() => navigate('/dashboard/quadro')}
                className="h-16 w-full rounded-md border theme-border theme-card theme-hover p-3 text-center text-sm font-semibold  sm:h-24 sm:flex-1 sm:p-6 sm:text-base"
              >
                Top 2 Bracketing
              </button>

              <button
                onClick={() => navigate('/dashboard/top3')}
                className="h-16 w-full rounded-md border theme-border theme-card theme-hover p-3 text-center text-sm font-semibold  sm:h-24 sm:flex-1 sm:p-6 sm:text-base"
              >
                Top 3 Bracketing
              </button>

              <button
                onClick={() => navigate('/dashboard/double')}
                className="h-16 w-full rounded-md border theme-border theme-card theme-hover p-3 text-center text-sm font-semibold   sm:h-24 sm:flex-1 sm:p-6 sm:text-base"
              >
                Open Play to All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}