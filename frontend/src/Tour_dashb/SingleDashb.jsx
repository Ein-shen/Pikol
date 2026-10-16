import React, { useEffect, useState } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import { Bracket_Single_VIew } from '../user/bracket&lead/Single/Bracket_Single_VIew'
import { createBracket, applyResults } from '../user/bracket&lead/Single/BracketUtils'

export const SingleDashb = () => {
  const [tournaments, setTournaments] = useState([])
  const [openError, setOpenError] = useState('')
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

  // Clears the screen only. Saved matches stay in the database.
  const resetTournament = () => {
    navigate(location.pathname, { replace: true, state: null })
    fetchTournaments()
  }

  const openTournament = async (id) => {
    setOpenError('')
    try {
      const { data } = await api.get(`/tournaments/${id}`)

      if (data.teams.length === 0) {
        return setOpenError('This tournament has no saved teams, so the bracket cannot be rebuilt.')
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

  return (
    <div className="w-full flex flex-col gap-10">
      <div className="flex justify-between flex-row items-center">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        <h1 className="font-bold text-lg">Single Elimination</h1>

        <button
          onClick={() => navigate('/dashboard/single')}
          className="flex flex-row rounded-md p-2 items-center space-x-3 text-md font-bold"
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

      {openError && <p role="alert" className="text-sm text-red-600">{openError}</p>}

      <div className="grid grid-cols-3 gap-4">
        {tournaments.map((tournament) => (
          <div
            key={tournament.id}
            onClick={() => openTournament(tournament.id)}
            className="cursor-pointer border border-black/80 p-4 rounded-md text-lg font-bold capitalize hover:bg-gray-100"
          >
            {tournament.name}
          </div>
        ))}
      </div>
    </div>
  )
}