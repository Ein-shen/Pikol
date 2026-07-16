import React, { useEffect, useState } from 'react'
import { Plus, ArrowLeft, MoreHorizontal } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import {
  Bracket_Single_VIew,
  createBracket,
  applyResults,
} from '../user/bracket&lead/Single/Bracket_Single_VIew'

export const SingleDashb = () => {
  const [tournaments, setTournaments] = useState([])
  const [openError, setOpenError] = useState('')
  const [menuId, setMenuId] = useState(null) // id of the tournament whose menu is open
  const navigate = useNavigate()
  const location = useLocation()
  const current = location.state // set by the form page or by openTournament

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

  // Close the card menu when clicking anywhere else
  useEffect(() => {
    const close = () => setMenuId(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  // Clears the screen only. Saved matches stay in the database.
  const resetTournament = () => {
    navigate(location.pathname, { replace: true, state: null })
    fetchTournaments()
  }

  const deleteTournament = async (id) => {
    if (!window.confirm('Delete this tournament?')) return
    try {
      await api.delete(`/tournaments/${id}`)
      setTournaments((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      console.error('Delete tournament error:', err)
    }
  }

  const renameTournament = async (id, oldName) => {
    const name = window.prompt('New name', oldName)?.trim()
    if (!name || name === oldName) return
    try {
      await api.patch(`/tournaments/${id}`, { name })
      setTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)))
    } catch (err) {
      console.error('Rename tournament error:', err)
    }
  }

  const openTournament = async (id) => {
    setOpenError('')
    try {
      const { data } = await api.get(`/tournaments/${id}`)

      if (data.teams.length < 2) {
        return setOpenError('This tournament needs at least 2 saved teams to build a bracket.')
      }

      const bracket = applyResults(createBracket(data.teams), data.matches)
      navigate(location.pathname, {
        state: {
          tournamentId: data.id,
          tournamentName: data.name,
          teams: data.teams,
          bracket,
        },
      })
    } catch (err) {
      console.error('Open tournament error:', err)
      setOpenError('Could not open the tournament.')
    }
  }

  const showList = !current?.bracket

  return (
    <div className="w-full flex flex-col gap-10">
      <div className="flex justify-between flex-row items-center">
        <button
          className="theme-hover p-2 rounded-md"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft />
        </button>

        <h1 className="font-bold text-lg">Single Elimination</h1>

        <button
          onClick={() => navigate('/dashboard/single')}
          className="theme-hover flex flex-row p-2 rounded-md items-center space-x-3 font-bold"
          aria-label="New tournament"
        >
          <Plus size={20} />
        </button>
      </div>

      {current?.bracket && (
        <Bracket_Single_VIew
          key={current.tournamentId}
          tournamentId={current.tournamentId}
          tournamentName={current.tournamentName}
          teams={current.teams}
          initialBracket={current.bracket}
          onReset={resetTournament}
        />
      )}

      {showList && openError && (
        <p role="alert" className="text-sm text-red-600">{openError}</p>
      )}

      {showList && (
        // 1 column on phones, 2 on small tablets, 3 on large screens
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              onClick={() => openTournament(tournament.id)}
              className="relative min-w-0 cursor-pointer flex flex-row items-center gap-2 border border-black/80 p-3 pr-10 sm:p-4 sm:pr-10 rounded-md text-sm sm:text-base font-bold capitalize theme-hover theme-accent"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuId((prev) => (prev === tournament.id ? null : tournament.id))
                }}
                className="absolute top-1 right-1 p-1 rounded"
                aria-label="More options"
              >
                <MoreHorizontal size={20} />
              </button>

              <img
                src="https://img.icons8.com/?size=100&id=zbygTShAC2X2&format=png&color=000000"
                alt="pikol"
                height={24}
                width={24}
                className="shrink-0"
              />

              {/* min-w-0 + break-words: a long name wraps inside the card instead of overflowing */}
              <span className="min-w-0 flex-1 break-words">{tournament.name}</span>

              {menuId === tournament.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-1 top-9 w-36 theme-bg theme-hover border border-black/80 rounded-md shadow-md z-50 flex flex-col font-normal normal-case"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuId(null)
                      renameTournament(tournament.id, tournament.name)
                    }}
                    className="text-left text-xs px-4 py-2 border-b border-black/80 rounded-t-md theme-hover theme-input theme-accent"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuId(null)
                      deleteTournament(tournament.id)
                    }}
                    className="text-left text-xs px-4 py-2 rounded-b-md text-red-600 theme-hover theme-input theme-accent"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}