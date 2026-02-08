import React, { useEffect, useState } from 'react'
import { Plus, ArrowLeft, MoreHorizontal } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import { Quadro_View } from '../user/bracket_lead/quadro/Bracket_quadro_e'

export const QuadroDashb = () => {
  const [tournaments, setTournaments] = useState([])
  const [openError, setOpenError] = useState('')
  const [menuId, setMenuId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const current = location.state

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/quadro')
      setTournaments(res.data)
    } catch (err) {
      console.error('Get quadro tournaments error:', err)
    }
  }

  useEffect(() => {
    fetchTournaments()
  }, [])

  useEffect(() => {
    const close = () => {
      setMenuId(null)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const openTournament = async (id) => {
    try {
      setOpenError('')
      const res = await api.get(`/quadro/${id}`)
      navigate('', {
        state: {
          tournamentId: res.data.id,
          tournamentName: res.data.name,
          teams: res.data.teams,
          savedGroupMatches: res.data.groupMatches,
          savedKnockout: res.data.matches,
        },
      })
    } catch (err) {
      setOpenError('Could not open tournament.')
    }
  }

  const deleteTournament = async (id, e) => {
    e.stopPropagation()
    try {
      await api.delete(`/quadro/${id}`)
      setTournaments((prev) => prev.filter((t) => t.id !== id))
      if (current?.tournamentId === id) {
        navigate('/dashboard/quadrodashb', { replace: true, state: null })
      }
    } catch (err) {
      console.error('Delete tournament error:', err)
    }
    setConfirmId(null)
    setMenuId(null)
  }

  const renameTournament = async (id, e) => {
    e.preventDefault()
    if (!renameValue.trim()) return
    try {
      await api.put(`/quadro/${id}`, { name: renameValue.trim() })
      setTournaments((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: renameValue.trim() } : t))
      )
      if (current?.tournamentId === id) {
        navigate('/dashboard/quadrodashb', {
          replace: true,
          state: { ...current, tournamentName: renameValue.trim() },
        })
      }
    } catch (err) {
      console.error('Rename tournament error:', err)
    }
    setRenamingId(null)
    setRenameValue('')
  }

  // Number of teams to show on a tournament card.
  // FIX: the old code showed "20" whenever `teams` was missing from the list response,
  // so a 6-pair tournament looked like a 20-pair one.
  // Order: the real teams array -> a count field from the server -> unknown.
  // NOTE: `teamCount` is a guess at the field name - rename it to whatever your
  // GET /quadro endpoint returns (or make the endpoint return one).
  const getTeamCount = (t) => t.teams?.length ?? t.teamCount ?? null

  return (
    <div className="w-full flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="theme-hover p-2 rounded-md"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft />
          </button>
          <h1 className="text-xl font-bold">Quadro Tournaments</h1>
        </div>
        <button
          onClick={() => navigate('/dashboard/quadro')}
          className="theme-accent flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
        >
          <Plus size={16} /> New Tournament
        </button>
      </header>

      {openError && <p role="alert" className="text-sm text-red-500">{openError}</p>}

      {current ? (
        <Quadro_View
          // FIX: key makes React rebuild the view (and its scores/bracket state)
          // if a different tournament is opened without going back to the list first
          key={current.tournamentId}
          tournamentId={current.tournamentId}
          tournamentName={current.tournamentName}
          teams={current.teams}
          savedGroupMatches={current.groupMatches || current.savedGroupMatches || []}
          savedKnockout={current.matches || current.savedKnockout || []}
          onReset={() => navigate('/dashboard/quadrodashb', { replace: true, state: null })}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => {
            const teamCount = getTeamCount(t)
            return (
              <div
                key={t.id}
                onClick={() => openTournament(t.id)}
                className="theme-card theme-hover relative flex flex-col justify-between rounded-xl border theme-border p-5 cursor-pointer shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src="https://img.icons8.com/?size=100&id=zbygTShAC2X2&format=png&color=000000"
                        alt="pikol"
                        height={24}
                        width={24}
                        className="shrink-0 theme-icon"
                      />
                      
                      <h3 className="text-base capitalize font-bold truncate pr-6"> {t.name}

                        <p className="mt-1 text-xs theme-muted">{t.teams?.length || 20} teams</p>
                      </h3>
                      
                    </div>

                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="theme-hover p-1.5 rounded-md"
                        onClick={() => setMenuId(menuId === t.id ? null : t.id)}
                        aria-label="Options"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {menuId === t.id && (
                        <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border theme-border theme-card shadow-lg py-1 flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingId(t.id)
                              setRenameValue(t.name)
                              setMenuId(null)
                            }}
                            className="w-full text-left px-4 py-2 text-xs theme-hover border-b theme-border"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmId(t.id)
                              setMenuId(null)
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-red-500 theme-hover"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Shows the real count; hides the line if the server doesn't send one */}
                  {teamCount !== null && (
                    <p className="mt-1 text-xs theme-muted">
                      {teamCount} {teamCount === 1 ? 'team' : 'teams'}
                    </p>
                  )}
                </div>

                {renamingId === t.id ? (
                  <form
                    onSubmit={(e) => renameTournament(t.id, e)}
                    className="mt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="theme-input w-full rounded-md p-1.5 text-xs mb-2"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="px-2 py-1 text-xs border theme-border rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2 py-1 text-xs theme-accent rounded font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                ) : confirmId === t.id ? (
                  <div className="mt-4 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs font-medium text-red-500">Delete this tournament?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => deleteTournament(t.id, e)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-xs font-semibold"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-3 py-1 border theme-border rounded text-xs"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
          {tournaments.length === 0 && (
            <p className="col-span-full text-center text-sm theme-muted py-10">
              No tournaments found. Create one to get started!
            </p>
          )}
        </div>
      )}
    </div>
  )
}