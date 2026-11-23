
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../api'

// One row per matching type: label, icon, the dashboard page, and the GET route that loads it.
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

export const RecentTournaments = ({ onNavigate }) => {
  const [items, setItems] = useState([])
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Load on first render, and again when the page changes
  // (so a tournament you just created shows up)
  useEffect(() => {
    let cancelled = false

    api
      .get('/tournaments/recent')
      .then((res) => !cancelled && setItems(res.data))
      .catch(() => !cancelled && setItems([]))

    return () => {
      cancelled = true
    }
  }, [pathname])

  // Load the full tournament, then open its dashboard with the data in router state
  const openTournament = async (t) => {
    const info = TYPE_INFO[t.type]

    try {
      const { data } = await api.get(info.load(t.id))

      navigate(info.route, {
        state: {
          tournamentId: data.id,
          tournamentName: data.name,
          teams: data.teams,
          savedGroupMatches: data.groupMatches,
          savedKnockout: data.matches,
        },
      })

      // Close the mobile sidebar after successful navigation
      onNavigate?.()

    } catch {
      // ignore: the item just doesn't open
    }
  }

  if (!items.length) return null

  // Getting the recent tournament used for matching the player
  return (
    <div className="mt-20 pb-10 space-y-3">
      <p className="text-xs font-semibold text-left items-center flex flex-row gap-1 pb-5">
        <img
          src="https://img.icons8.com/?size=100&id=kuU7I7uPlHfo&format=png&color=000000"
          alt="trophy"
          height={10}
          width={15}
        />
        Recent matching:
      </p>

      {items.map((t) => {
        const info = TYPE_INFO[t.type]
        if (!info) return null

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => openTournament(t)}
            className="flex w-full flex-col items-center gap-2 border theme-border theme-hover rounded-lg px-3 py-2 text-sm opacity-80 hover:opacity-100"
          >
            <span className="text-xs font-semibold">{t.name}</span>
            <span className="text-xs opacity-60">{info.label}</span>
          </button>
        )
      })}
    </div>
  )
}
