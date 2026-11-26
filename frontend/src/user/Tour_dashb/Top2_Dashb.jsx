
import React, { useEffect, useState } from 'react'
import { Plus, ArrowLeft, MoreHorizontal } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../api'
import { Quadro_View } from '../bracket_lead/Top2_bracketing_e'

// These two MUST match the paths in your router.
const DASH_ROUTE = '/dashboard/top2dashb'
const NEW_ROUTE = '/dashboard/top2'

// =======================================
// 1. TOURNAMENT LIST CACHE
// =======================================

const CACHE_KEY = 'cachedTop2Tournaments'

const readCache = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)

    if (cached === null) return null

    const parsed = JSON.parse(cached)

    return Array.isArray(parsed) ? parsed : null

  } catch (error) {
    console.error('Failed to read tournament cache:', error)
    return null
  }
}

const saveCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save tournament cache:', error)
  }
}

// =======================================
// 2. FULL TOURNAMENT CACHE
// =======================================

// Each tournament gets its own cache.
// Example: cachedFullTop2Tournament_15

const getTournamentCacheKey = (id) =>
  `cachedFullTop2Tournament_${id}`

const readFullTournamentCache = (id) => {
  try {
    const cached = localStorage.getItem(getTournamentCacheKey(id))

    if (cached === null) return null

    return JSON.parse(cached)

  } catch (error) {
    console.error('Failed to read full tournament cache:', error)
    return null
  }
}

const saveFullTournamentCache = (id, data) => {
  try {
    localStorage.setItem(
      getTournamentCacheKey(id),
      JSON.stringify(data)
    )
  } catch (error) {
    console.error('Failed to save full tournament cache:', error)
  }
}

const clearFullTournamentCache = (id) => {
  try {
    localStorage.removeItem(getTournamentCacheKey(id))
  } catch (error) {
    console.error('Failed to clear full tournament cache:', error)
  }
}

// =======================================
// 3. MAIN COMPONENT
// =======================================

export const Top2_Dashb = () => {

  // Read the tournament list from localStorage immediately.
  const [initialCache] = useState(() => readCache())

  // Display cached tournaments before the backend responds.
  const [tournaments, setTournaments] = useState(
    () => initialCache ?? []
  )

  const [openError, setOpenError] = useState('')
  const [menuId, setMenuId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const navigate = useNavigate()
  const location = useLocation()
  const current = location.state

  // =======================================
  // 4. FETCH RECENT TOURNAMENT LIST
  // =======================================

  useEffect(() => {
    let cancelled = false

    const fetchTournaments = async () => {
      try {
        const res = await api.get('/top2')

        const latestTournaments = Array.isArray(res.data)
          ? res.data
          : []

        if (!cancelled) {
          // Update the visible tournament list.
          setTournaments(latestTournaments)

          // Save the latest list for the next visit.
          saveCache(latestTournaments)
        }

      } catch (error) {
        // If the request fails, keep displaying cached data.
        console.error('Get top2 tournaments error:', error)
      }
    }

    fetchTournaments()

    return () => {
      cancelled = true
    }

  }, [])

  // =======================================
  // 5. CLOSE MENU WHEN CLICKING OUTSIDE
  // =======================================

  useEffect(() => {
    const close = () => {
      setMenuId(null)
    }

    window.addEventListener('click', close)

    return () => window.removeEventListener('click', close)
  }, [])

  // =======================================
  // 6. NAVIGATE TO TOURNAMENT
  // =======================================

  const navigateToTournament = (data) => {
    navigate('', {
      state: {
        tournamentId: data.id,
        tournamentName: data.name,
        teams: data.teams,
        savedGroupMatches: data.groupMatches || [],
        savedKnockout: data.matches || [],
      },
    })
  }

  // =======================================
  // 7. OPEN TOURNAMENT WITH FULL CACHE
  // =======================================

  const openTournament = async (id) => {
    setOpenError('')

    // Check whether this tournament was opened before.
    const cachedTournament = readFullTournamentCache(id)

    // If cached data exists, open it immediately.
    if (cachedTournament) {
      navigateToTournament(cachedTournament)
    }

    try {
      // Fetch the latest tournament from the backend.
      const { data } = await api.get(`/top2/${id}`)

      // Update the full tournament cache.
      saveFullTournamentCache(id, data)

      // If there was no cache, navigate after fetching.
      // If there was a cache, the bracket is already open.
      if (!cachedTournament) {
        navigateToTournament(data)
      } else {
        // Refresh the currently displayed bracket with fresh data.
        navigateToTournament(data)
      }

    } catch (error) {
      console.error('Failed to open tournament:', error)

      // Only show an error if there was no cached data to display.
      if (!cachedTournament) {
        setOpenError('Could not open tournament.')
      }
    }
  }

  // =======================================
  // 8. DELETE TOURNAMENT
  // =======================================

  const deleteTournament = async (id, e) => {
    e.stopPropagation()

    try {
      await api.delete(`/top2/${id}`)

      // Remove the tournament from the displayed list.
      setTournaments((prev) => {
        const updated = prev.filter((t) => t.id !== id)

        // Save the updated list immediately.
        saveCache(updated)

        return updated
      })

      // Remove the full tournament cache too.
      clearFullTournamentCache(id)

      if (current?.tournamentId === id) {
        navigate(DASH_ROUTE, { replace: true, state: null })
      }

    } catch (error) {
      console.error('Delete tournament error:', error)
    }

    setConfirmId(null)
    setMenuId(null)
  }

  // =======================================
  // 9. RENAME TOURNAMENT
  // =======================================

  const renameTournament = async (id, e) => {
    e.preventDefault()

    if (!renameValue.trim()) return

    try {
      const newName = renameValue.trim()

      await api.put(`/top2/${id}`, {
        name: newName,
      })

      // Update the tournament list.
      setTournaments((prev) => {
        const updated = prev.map((t) =>
          t.id === id
            ? { ...t, name: newName }
            : t
        )

        // Save the updated list.
        saveCache(updated)

        return updated
      })

      // Update the cached full tournament name too.
      const cachedTournament = readFullTournamentCache(id)

      if (cachedTournament) {
        saveFullTournamentCache(id, {
          ...cachedTournament,
          name: newName,
        })
      }

      if (current?.tournamentId === id) {
        navigate(DASH_ROUTE, {
          replace: true,
          state: {
            ...current,
            tournamentName: newName,
          },
        })
      }

    } catch (error) {
      console.error('Rename tournament error:', error)
    }

    setRenamingId(null)
    setRenameValue('')
  }

  // =======================================
  // 10. GET TEAM COUNT
  // =======================================

  const getTeamCount = (t) =>
    t.teams?.length ?? t.teamCount ?? null

  // =======================================
  // 11. UI
  // =======================================

  // =======================================
  // 11. UI
  // =======================================

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">

      {/* FIXED HEADER: stays visible while the content scrolls */}
      <header className="flex shrink-0 items-center justify-between gap-3 pb-6 pt-2 sm:pb-8">

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">

          <button
            className="opacity-60 transition hover:opacity-100 shrink-0 rounded-md p-2"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft />
          </button>

          <h1 className="truncate text-lg font-bold sm:text-xl">
            Standard Tournament
          </h1>

        </div>

        <button
          onClick={() => navigate(NEW_ROUTE)}
          className="theme-accent flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold sm:gap-2 sm:px-4"
        >
          <Plus size={16} />
          <span className="sm:hidden">New</span>
          <span className="hidden sm:inline">New Tournament</span>
        </button>

      </header>

      {/* SCROLLABLE CONTENT: everything inside this container scrolls */}
      <div className="min-h-0 flex-1 overflow-y-auto -mr-3.5">

        {openError && (
          <p role="alert" className="text-sm text-red-500">
            {openError}
          </p>
        )}

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

          <div className="grid grid-cols-1 pt-10 gap-3 sm:grid-cols-2 sm:gap-4 animate-fade-in animation-delay-100 lg:grid-cols-3 xl:grid-cols-4">

            {tournaments.map((t) => {

              const teamCount = getTeamCount(t)

              return (

                <div
                  key={t.id}
                  onClick={() => openTournament(t.id)}
                  className="theme-card theme-hover theme-border relative flex min-w-0 cursor-pointer flex-col justify-between rounded-xl border p-4 shadow-sm sm:p-5"
                >

                  <div>

                    <div className="flex items-start justify-between gap-2">

                      <div className="min-w-0">

                        <div className="flex items-center gap-3">

                          <img
                            src="https://img.icons8.com/?size=100&id=zbygTShAC2X2&format=png&color=000000"
                            alt="pikol"
                            height={24}
                            width={24}
                            className="theme-icon shrink-0"
                          />

                          <h3 className="truncate text-base font-bold capitalize">
                            {t.name}
                          </h3>

                        </div>

                        {teamCount !== null && (
                          <p className="theme-muted mt-0.5 pl-9 text-xs">
                            {teamCount} {teamCount === 1 ? 'team' : 'teams'}
                          </p>
                        )}

                      </div>

                      <div
                        className="relative shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >

                        <button
                          className="theme-hover rounded-md p-2 sm:p-1.5"
                          onClick={() => setMenuId(menuId === t.id ? null : t.id)}
                          aria-label="Options"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {menuId === t.id && (

                          <div className="theme-border theme-card absolute right-0 top-9 z-10 flex w-40 flex-col rounded-lg border py-1 shadow-lg sm:w-36">

                            <button
                              type="button"
                              onClick={() => {
                                setRenamingId(t.id)
                                setRenameValue(t.name)
                                setMenuId(null)
                              }}
                              className="theme-hover theme-border w-full border-b px-4 py-3 text-left text-sm sm:py-2 sm:text-xs"
                            >
                              Edit
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
                        className="theme-input mb-2 w-full rounded-md p-2 text-base sm:p-1.5 sm:text-xs"
                        autoFocus
                      />

                      <div className="flex justify-end gap-2">

                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
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

                    <div
                      className="mt-4 flex flex-col gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >

                      <p className="text-xs font-medium text-red-500">
                        Delete this tournament?
                      </p>

                      <div className="flex gap-2">

                        <button
                          onClick={(e) => deleteTournament(t.id, e)}
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

    </div>
  )
}