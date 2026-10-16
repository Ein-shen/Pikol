import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { createBracket } from '../bracket&lead/Single/BracketUtils'

const TEAM_COUNT = 10

function createEmptyTeams() {
  return Array.from({ length: TEAM_COUNT }, (_, i) => ({
    id: i + 1,
    name: `Team ${i + 1}`,
    player1: '',
    player2: '',
  }))
}

function trimTeam(team) {
  return {
    ...team,
    name: team.name.trim(),
    player1: team.player1.trim(),
    player2: team.player2.trim(),
  }
}

function validateTournament(name, teams) {
  if (!name) return 'Please enter a tournament name.'

  if (teams.some((t) => !t.name || !t.player1 || !t.player2)) {
    return `Please complete all ${TEAM_COUNT} teams and their players.`
  }

  const players = teams.flatMap((t) => [t.player1.toLowerCase(), t.player2.toLowerCase()])
  if (new Set(players).size !== players.length) {
    return 'Each player must belong to only one team.'
  }
  return ''
}

function TeamsForm({ tournamentName, onNameChange, teams, onTeamChange, error, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Single elimination</h2>
        <p className="text-sm text-gray-500">Register {TEAM_COUNT} teams with 2 players each.</p>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Tournament name</label>
          <input
            value={tournamentName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Doubles Championship"
            className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {teams.map((team, index) => (
            <div key={team.id} className="space-y-3 rounded-lg border p-3">
              <label className="block text-sm font-bold">Team {index + 1}</label>
              <input
                value={team.name}
                onChange={(e) => onTeamChange(team.id, 'name', e.target.value)}
                placeholder="Team name"
                className="w-full rounded-md border p-2 text-sm"
              />
              <input
                value={team.player1}
                onChange={(e) => onTeamChange(team.id, 'player1', e.target.value)}
                placeholder="Player 1"
                className="w-full rounded-md border p-2 text-sm"
              />
              <input
                value={team.player2}
                onChange={(e) => onTeamChange(team.id, 'player2', e.target.value)}
                placeholder="Player 2"
                className="w-full rounded-md border p-2 text-sm"
              />
            </div>
          ))}
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex justify-end gap-3 border-t p-5">
        <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2">
          Cancel
        </button>
        <button 
        
        
        type="submit" className="rounded-lg bg-black px-5 py-2 text-white hover:bg-gray-800">
          Generate bracket
        </button>
      </div>
    </form>
  )
}

export const SingleElilmination = () => {
  const navigate = useNavigate()
  const [teams, setTeams] = useState(createEmptyTeams)
  const [tournamentName, setTournamentName] = useState('')
  const [error, setError] = useState('')

  const updateTeam = (id, field, value) => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  const generateBracket = async (e) => {
    e.preventDefault()

    const cleanTeams = teams.map(trimTeam)
    const name = tournamentName.trim()
    const problem = validateTournament(name, cleanTeams)
    if (problem) return setError(problem)

    try {
      const { data } = await api.post('/tournaments', { name, type: 'single', teams: cleanTeams })

      const savedTeams = cleanTeams.map((team) => ({ ...team, pairId: data.pairs[team.id] }))

      // Go to the dashboard and hand it the new bracket
      navigate('/dashboard/singledashbb', {   // <-- use your real SingleDashb route
        state: {
          tournamentId: data.tournamentId,
          tournamentName: name,
          teams: savedTeams,
          bracket: createBracket(savedTeams),
        },
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the tournament.')
    }
  }

  return (
    <div className="w-full">
      <TeamsForm
        tournamentName={tournamentName}
        onNameChange={setTournamentName}
        teams={teams}
        onTeamChange={updateTeam}
        error={error}
        onSubmit={generateBracket}
        onCancel={() => navigate('/dashboard/matching')}
      />
    </div>
  )
}