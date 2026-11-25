
import React, { useState, useEffect } from 'react'
import api from '../api'
import { PulseLoader } from 'react-spinners'

// =======================================
// 1. LOCAL STORAGE CACHE
// =======================================

// This is the name used to identify the saved Overview data.
const CACHE_KEY = 'cachedOverview'

// READ CACHE: Retrieve previously saved Overview data.
const readCache = () => {
  try {
    // Get the saved string from localStorage.
    const cached = localStorage.getItem(CACHE_KEY)

    // No saved data? Return null.
    if (cached === null) return null

    // Convert the saved JSON string back into JavaScript data.
    const parsed = JSON.parse(cached)

    // Only accept an object containing the expected data.
    if (
      parsed &&
      Array.isArray(parsed.tournaments) &&
      typeof parsed.total === 'number'
    ) {
      return parsed
    }

    return null

  } catch (error) {
    // Prevent invalid cache data from crashing the component.
    console.error('Failed to read tournaments cache:', error)
    return null
  }
}

// SAVE CACHE: Store the latest Overview data.
const saveCache = (data) => {
  try {
    // Convert the data into a string before saving.
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))

  } catch (error) {
    console.error('Failed to save Overview cache:', error)
  }
}

// =======================================
// 2. OVERVIEW COMPONENT
// =======================================

export const Overview = () => {

  // Read the cache once when the component initializes.
  const [initialCache] = useState(() => readCache())

  // If cached tournaments exist, display them immediately.
  // Otherwise, start with an empty array.
  const [tournaments, setTournaments] = useState(
    () => initialCache?.tournaments ?? []
  )

  // Restore the cached total or use zero if no cache exists.
  const [total, setTotal] = useState(
    () => initialCache?.total ?? 0
  )

  // Show the loading indicator only when no cache exists.
  const [loading, setLoading] = useState(
    () => initialCache === null
  )

  // =======================================
  // 3. FETCH LATEST TOURNAMENT DATA
  // =======================================

  useEffect(() => {

    // Prevent state updates if the component unmounts
    // before the API request finishes.
    let cancelled = false

    const fetchTournaments = async () => {
      try {
        // Request the latest tournament information from the backend.
        const res = await api.get('/tournaments')

        // Extract the tournament array and total from the API response.
        const latestTournaments = Array.isArray(res.data.tournaments)
          ? res.data.tournaments
          : []

        const latestTotal = Number(res.data.total) || 0

        if (!cancelled) {

          // Update React state so the latest information appears.
          setTournaments(latestTournaments)
          setTotal(latestTotal)

          // Save the latest information for the next visit.
          saveCache({
            tournaments: latestTournaments,
            total: latestTotal,
          })
        }

      } catch (error) {
        // If the API fails, keep displaying cached information.
        console.error('Failed to fetch Overview data:', error)

      } finally {
        // Stop showing the loading indicator after the request finishes.
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    // Execute the API request.
    fetchTournaments()

    // Cleanup when the component unmounts.
    return () => {
      cancelled = true
    }

  }, [])

  // =======================================
  // 4. COUNT TOURNAMENTS PER TYPE
  // =======================================

  // reduce() loops through the tournament array
  // and counts how many tournaments belong to each type.
  const typeCounts = tournaments.reduce((acc, t) => {

    // Use 'unknown' if a tournament has no type.
    const key = t.type || 'unknown'

    // Increase the count for the matching tournament type.
    acc[key] = (acc[key] || 0) + 1

    return acc
  }, {})

  // Get the first five tournaments.
  // This assumes the API already sorts them newest first.
  const recent = tournaments.slice(0, 5)

  // =======================================
  // 5. LOADING INDICATOR
  // =======================================

  // Only show the loading screen if there is no cached data.
  if (loading) {
    return (
      <div className="flex flex-row items-center gap-2">

        <h1 className="text-lg font-semibold">
          Loading Overview
        </h1>

        <PulseLoader
          color="#A8D38D"
          size={12}
          margin={4}
        />

      </div>
    )
  }

  // =======================================
  // 6. DISPLAY OVERVIEW
  // =======================================

  return (
    <div className="flex flex-col gap-4">

      <h1 className="text-lg animate-fade-in animation-delay-100 font-bold">
        Overview
      </h1>

      {/* TOTAL TOURNAMENTS */}
      <div className="border animate-fade-in animation-delay-300 theme-border p-6 rounded-md theme-hover theme-card">

        <p className="text-sm text-gray-500">
          Total tournaments
        </p>

        <p className="text-3xl font-black">
          {total}
        </p>

      </div>

      {/* COUNT BY TOURNAMENT TYPE */}
      <div className="gap-4 w-full flex flex-row animate-fade-in animation-delay-400">

        {Object.entries(typeCounts).map(([type, count]) => (

          <div
            key={type}
            className="flex flex-row justify-between w-full theme-hover theme-card rounded-md p-4 space-y-3 border theme-border"
          >

            <div className="flex flex-col gap-5">

              <span className="capitalize text-gray-500">
                {type}
              </span>

              <span className="font-bold text-3xl text-center">
                {count}
              </span>

            </div>

          </div>

        ))}

      </div>

      {/* RECENT TOURNAMENTS */}
      <div className="flex flex-col gap-3 pt-5">

        <h2 className="font-semibold">
          Recent tournaments
        </h2>

        
      </div>

      {/* REMINDERS */}
      <div className="flex flex-col pt-5">

        <h1 className="flex flex-col gap-2">

          Reminder:

          <span>- Show tournament analytics</span>
          <span>- Show AI chatbot</span>
          <span>- Add more precise explanation of the tournament</span>
          <span>- Add confirmation popup in the delete and signout buttons</span>
          <span>- Add loading components</span>
          <span>- Implement Open Play backend and frontend</span>
          <span>- Add delay animation to this website</span>

        </h1>

      </div>

    </div>
  )
}
