import React, { useEffect, useState } from 'react'
import { Plus, ArrowLeft, MoreHorizontal } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../api'
import { Quadro_View } from '../bracket_lead/Top2_bracketing_e'

// These two MUST match the paths in your router.
// DASH_ROUTE = this page (list of tournaments + bracket view)
// NEW_ROUTE  = the registration page (Top2_Brackets.jsx)
const DASH_ROUTE = '/dashboard/top2dashb'
const NEW_ROUTE = '/dashboard/top2'

export const Top2_Dashb = () => {
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
      const res = await api.get('/top2')
      setTournaments(res.data)
    } catch (err) {
      console.error('Get top2 tournaments error:', err)
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
      const res = await api.get(`/top2/${id}`)
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
      await api.delete(`/top2/${id}`)
      setTournaments((prev) => prev.filter((t) => t.id !== id))
      if (current?.tournamentId === id) {
        navigate(DASH_ROUTE, { replace: true, state: null })
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
      await api.put(`/top2/${id}`, { name: renameValue.trim() })
      setTournaments((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: renameValue.trim() } : t))
      )
      if (current?.tournamentId === id) {
        navigate(DASH_ROUTE, {
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

  const getTeamCount = (t) => t.teams?.length ?? t.teamCount ?? null

  return (
    // min-w-0 so wide children (like the bracket view) can't
    // stretch this flex child past the screen width
    <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">
      {/* gap-3 between title and button so they never touch on small screens */}
      <header className="flex items-center justify-between gap-3">
        {/* min-w-0 lets the title truncate instead of pushing the button off-screen */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            className="opacity-60 transition hover:opacity-100 shrink-0 rounded-md p-2" // shrink-0 keeps the back button from squishing
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft />
          </button>
          {/* text-lg on mobile, text-xl from sm up; truncate for long titles */}
          <h1 className="truncate text-lg font-bold sm:text-xl">Top 2 Bracketing</h1>
        </div>
        <button
          onClick={() => navigate(NEW_ROUTE)}
          // shrink-0 + whitespace-nowrap so the label never wraps to 2 lines;
          // smaller padding on mobile
          className="theme-accent flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold sm:gap-2 sm:px-4"
        >
          <Plus size={16} />
          {/* short label on phones, full label from sm up */}
          <span className="sm:hidden">New</span>
          <span className="hidden sm:inline">New Tournament</span>
        </button>
      </header>

      {openError && <p role="alert" className="text-sm text-red-500">{openError}</p>}

      {current ? (
        <Quadro_View
          key={current.tournamentId}
          tournamentId={current.tournamentId}
          tournamentName={current.tournamentName}
          teams={current.teams}
          savedGroupMatches={current.groupMatches || current.savedGroupMatches || []}
          savedKnockout={current.matches || current.savedKnockout || []}
          onReset={() => navigate(DASH_ROUTE, { replace: true, state: null })}
        />
      ) : (
        // smaller gap on mobile, and an xl:grid-cols-4 step for wide screens
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {tournaments.map((t) => {
            const teamCount = getTeamCount(t)
            return (
              <div
                key={t.id}
                onClick={() => openTournament(t.id)}
                // min-w-0 (stops long names from stretching the grid cell),
                // p-4 on mobile / p-5 from sm up
                className="theme-card theme-hover theme-border relative flex min-w-0 cursor-pointer flex-col justify-between rounded-xl border p-4 shadow-sm sm:p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {/* Row 1: img + name, aligned on the same line */}
                      <div className="flex items-center gap-3">
                        <img
                          src="https://img.icons8.com/?size=100&id=zbygTShAC2X2&format=png&color=000000"
                          alt="pikol"
                          height={24}
                          width={24}
                          className="theme-icon shrink-0"
                        />
                        <h3 className="truncate text-base font-bold capitalize">{t.name}</h3>
                      </div>

                      {/* Row 2: team count below the name.
                          pl-9 = 24px image + 12px gap (gap-3), so it lines up under the name */}
                      {teamCount !== null && (
                        <p className="theme-muted mt-0.5 pl-9 text-xs">
                          {teamCount} {teamCount === 1 ? 'team' : 'teams'}
                        </p>
                      )}
                    </div>

                    {/* shrink-0 so the menu button never gets squished */}
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        // p-2 on mobile for a bigger touch target (~32px), p-1.5 on desktop
                        className="theme-hover rounded-md p-2 sm:p-1.5"
                        onClick={() => setMenuId(menuId === t.id ? null : t.id)}
                        aria-label="Options"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {menuId === t.id && (
                        // top-9 (matches the bigger button), larger items on mobile
                        <div className="theme-border theme-card absolute right-0 top-9 z-10 flex w-40 flex-col rounded-lg border py-1 shadow-lg sm:w-36">
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingId(t.id)
                              setRenameValue(t.name)
                              setMenuId(null)
                            }}
                            // py-3 on mobile for easier tapping, text-sm on mobile
                            className="theme-hover theme-border w-full border-b px-4 py-3 text-left text-sm sm:py-2 sm:text-xs"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmId(t.id)
                              setMenuId(null)
                            }}
                            className="theme-hover w-full px-4 py-3 text-left text-sm text-red-500 sm:py-2 sm:text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
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
                      // text-base on mobile (iOS Safari zooms the page when an
                      // input is under 16px), text-xs from sm up; more padding on mobile
                      className="theme-input mb-2 w-full rounded-md p-2 text-base sm:p-1.5 sm:text-xs"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        // bigger tap area on mobile
                        className="theme-border rounded border px-3 py-2 text-sm sm:px-2 sm:py-1 sm:text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="theme-accent rounded px-3 py-2 text-sm font-semibold sm:px-2 sm:py-1 sm:text-xs"
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
                        // flex-1 on mobile = two equal wide buttons that are easy to hit;
                        // sm:flex-none goes back to compact buttons on desktop
                        className="flex-1 rounded bg-red-500 px-3 py-2 text-sm font-semibold text-white sm:flex-none sm:py-1 sm:text-xs"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="theme-border flex-1 rounded border px-3 py-2 text-sm sm:flex-none sm:py-1 sm:text-xs"
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
            <p className="theme-muted col-span-full py-10 text-center text-sm">
              No tournaments found. Create one to get started!
            </p>
          )}
        </div>
      )}
    </div>
  )
}