
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../api'

// =======================================
// 1. RECENT TOURNAMENT CACHE
// =======================================

// Cache key for the list of recent tournaments.
const CACHE_KEY = 'cachedRecentTournament'

// Read the saved recent tournament list.
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

// Save the recent tournament list.
const saveCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save the tournament cache:', error)
  }
}

// =======================================
// 2. FULL TOURNAMENT CACHE
// =======================================

// Give each tournament its own cache key.
// Example: cachedFullTournament_15
const getTournamentCacheKey = (id) =>
  `cachedFullTournament_${id}`

// Read the full tournament data.
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

// Save the full tournament data.
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

// =======================================
// 3. TOURNAMENT TYPE INFORMATION
// =======================================

const TYPE_INFO = {
  top2: {
    label: 'Standard tournament',
    icon: '🏆',
    route: '/dashboard/top2dashb',
    load: (id) => `/top2/${id}`,
  },

  single: {
    label: 'Single',
    icon: '🥊',
    route: '/dashboard/singledashb',
    load: (id) => `/tournaments/${id}`,
  },
}

// =======================================
// 4. RECENT TOURNAMENTS COMPONENT
// =======================================

export const RecentTournaments = ({ onNavigate }) => {

  // Read the saved recent tournament list on initialization.
  const [initialCache] = useState(() => readCache())

  // Display cached tournaments immediately if available.
  const [items, setItems] = useState(
    () => initialCache ?? []
  )

  const { pathname } = useLocation()
  const navigate = useNavigate()

  // =======================================
  // 5. FETCH RECENT TOURNAMENTS
  // =======================================

  useEffect(() => {
    let cancelled = false

    const fetchRecentTournaments = async () => {
      try {
        // Request the latest recent tournaments from the backend.
        const res = await api.get('/tournaments/recent')

        const recentItems = Array.isArray(res.data)
          ? res.data
          : []

        if (!cancelled) {
          // Update the displayed list.
          setItems(recentItems)

          // Save the latest list in localStorage.
          saveCache(recentItems)
        }

      } catch (error) {
        // Keep displaying cached data if the request fails.
        console.error('Failed to fetch recent tournaments:', error)
      }
    }

    fetchRecentTournaments()

    return () => {
      cancelled = true
    }

  }, [pathname])

  // =======================================
  // 6. NAVIGATE TO TOURNAMENT DASHBOARD
  // =======================================

  // Reusable function to navigate using tournament data.
  const navigateToTournament = (info, data) => {
    navigate(info.route, {
      state: {
        tournamentId: data.id,
        tournamentName: data.name,
        teams: data.teams,
        savedGroupMatches: data.groupMatches,
        savedKnockout: data.matches,
      },
    })

    // Close the mobile sidebar if the parent provided this function.
    onNavigate?.()
  }

  // =======================================
  // 7. OPEN SELECTED TOURNAMENT
  // =======================================

  const openTournament = async (t) => {

    // Find the correct configuration for the selected tournament type.
    const info = TYPE_INFO[t.type]

    // Stop if the tournament type is not supported.
    if (!info) return

    // Check whether the full tournament data is already cached.
    const cachedTournament = readFullTournamentCache(t.id)

    // If cached data exists, open the dashboard immediately.
    if (cachedTournament) {
      navigateToTournament(info, cachedTournament)
    }

    try {
      // Fetch the latest full tournament data from the backend.
      const { data } = await api.get(info.load(t.id))

      // Save the latest tournament data for the next visit.
      saveFullTournamentCache(t.id, data)

      // If there was no cached data, navigate after fetching.
      if (!cachedTournament) {
        navigateToTournament(info, data)
      }

    } catch (error) {
      // If there is no cache and the API fails, the dashboard cannot open.
      // If there is a cache, the already-opened dashboard remains visible.
      console.error('Failed to fetch tournament:', error)
    }
  }

  // =======================================
  // 8. DISPLAY RECENT TOURNAMENTS
  // =======================================

  // Don't render the section if there are no recent tournaments.
  if (!items.length) return null

  return (
    <div className="mt-20 pb-10 space-y-3 animate-fade-in animation-delay-100">

      {/* Section heading */}
      <p className="text-xs font-semibold text-left items-center flex flex-row gap-1 pb-5">
        <img
          src="https://img.icons8.com/?size=100&id=kuU7I7uPlHfo&format=png&color=000000"
          alt="trophy"
          height={10}
          width={15}
        />

        Recent matching:
      </p>

      {/* Display every recent tournament. */}
      {items.map((t) => {

        // Find the label and route for this tournament.
        const info = TYPE_INFO[t.type]

        // Skip unsupported tournament types.
        if (!info) return null

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => openTournament(t)}
            className="flex w-full flex-col items-center gap-2 border theme-border theme-hover rounded-lg px-3 py-2 text-sm opacity-80 hover:opacity-100"
          >

            {/* Tournament name */}
            <span className="text-xs font-semibold">
              {t.name}
            </span>

            {/* Tournament type */}
            <span className="text-xs opacity-60">
              {info.label}
            </span>

          </button>
        )
      })}

    </div>
  )
}
