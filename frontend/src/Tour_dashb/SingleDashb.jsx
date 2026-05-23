import React, { useEffect, useState } from 'react'
import { Plus, ArrowLeft, MoreHorizontal, Trophy } from 'lucide-react'
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
    <div className="w-full flex flex-col gap-10 theme-text">
      <div className="flex justify-between flex-row items-center">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="theme-hover rounded-md p-2"
        >
          <ArrowLeft />
        </button>

        <h1 className="font-bold text-lg">Single Elimination</h1>

        <button
          onClick={() => navigate('/dashboard/single')}
          aria-label="New tournament"
          className="theme-hover flex flex-row rounded-md p-2 items-center space-x-3 text-md font-bold"
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
        <p role="alert" className="text-sm text-red-500">{openError}</p>
      )}

      {showList && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              onClick={() => openTournament(tournament.id)}
              className="theme-accent relative cursor-pointer text-md flex flex-row items-center gap-2 border border-theme-accent-text/30 p-4 pr-10 rounded-md font-bold capitalize"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuId((prev) => (prev === tournament.id ? null : tournament.id))
                }}
                className="absolute top-1 right-1 p-1 rounded hover:bg-black/10"
                aria-label="More options"
              >
                <MoreHorizontal size={20} />
              </button>

              {/* Lucide icon follows the text color in both themes */}
              <Trophy size={24} className="shrink-0" />

              {tournament.name}

              {menuId === tournament.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-1 top-9 w-36 theme-card theme-text border theme-border rounded-md shadow-md z-50 flex flex-col font-normal normal-case"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuId(null)
                      renameTournament(tournament.id, tournament.name)
                    }}
                    className="theme-hover text-left text-xs px-4 py-2 border-b theme-border rounded-t-md"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuId(null)
                      deleteTournament(tournament.id)
                    }}
                    className="theme-hover text-left text-xs px-4 py-2 rounded-b-md text-red-500"
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