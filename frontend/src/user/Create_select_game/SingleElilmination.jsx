import React, { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { createBracket } from '../bracket_lead/Single/Bracket_Single_VIew'

// Even numbers only, so every team has an opponent in round 1
const TEAM_COUNT_OPTIONS = [4, 6, 8, 10, 12, 14, 16, 20, 24, 32]
const DEFAULT_TEAM_COUNT = 10

function createEmptyTeam(id) {
  return { id, name: `Team ${id}`, player1: '', player2: '' }
}

function createEmptyTeams(count) {
  return Array.from({ length: count }, (_, i) => createEmptyTeam(i + 1))
}

// Grow or shrink the list while keeping what was already typed
function resizeTeams(prev, count) {
  if (count <= prev.length) return prev.slice(0, count)
  const extra = Array.from({ length: count - prev.length }, (_, i) =>
    createEmptyTeam(prev.length + i + 1)
  )
  return [...prev, ...extra]
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
    return `Please complete all ${teams.length} teams and their players.`
  }

  const players = teams.flatMap((t) => [t.player1.toLowerCase(), t.player2.toLowerCase()])
  if (new Set(players).size !== players.length) {
    return 'Each player must belong to only one team.'
  }
  return ''
}

function TeamsForm({
  tournamentName,
  onNameChange,
  teamCount,
  onCountChange,
  teams,
  onTeamChange,
  error,
  onSubmit,
  onCancel,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="theme-card theme-text rounded-xl border theme-border shadow-sm"
    >
      <div className="border-b theme-border p-5">
        <h2 className="text-lg font-bold capitalize">Single elimination</h2>
        <p className="text-sm theme-muted">Register {teamCount} teams with 2 players each.</p>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Tournament name</label>
          <input
            value={tournamentName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Doubles Championship"
            className="theme-input w-full rounded-lg p-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Number of teams</label>
          <div className="flex flex-wrap gap-2">
            {TEAM_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onCountChange(count)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  teamCount === count
                    ? 'theme-accent border-transparent'
                    : 'theme-text theme-hover theme-border'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs theme-muted">
            4, 8, 16 and 32 give a bracket where nobody ever waits a round. Other counts show a
            "Waiting" card for the team with no opponent.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {teams.map((team, index) => (
            <div key={team.id} className="space-y-3 rounded-lg border theme-border p-3">
              <label className="block text-sm font-bold">Team {index + 1}</label>
              <input
                value={team.name}
                onChange={(e) => onTeamChange(team.id, 'name', e.target.value)}
                placeholder="Team name"
                className="theme-input w-full rounded-md p-2 text-sm"
              />
              <input
                value={team.player1}
                onChange={(e) => onTeamChange(team.id, 'player1', e.target.value)}
                placeholder="Player 1"
                className="theme-input w-full rounded-md p-2 text-sm"
              />
              <input
                value={team.player2}
                onChange={(e) => onTeamChange(team.id, 'player2', e.target.value)}
                placeholder="Player 2"
                className="theme-input w-full rounded-md p-2 text-sm"
              />
            </div>
          ))}
        </div>

        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="flex justify-end gap-3 border-t theme-border p-5">
        <button
          type="button"
          onClick={onCancel}
          className="theme-text theme-hover rounded-lg border theme-border px-5 py-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="theme-accent rounded-lg border border-transparent px-5 py-2 font-semibold"
        >
          Generate bracket
        </button>
      </div>
    </form>
  )
}

export const SingleElilmination = () => {
  const navigate = useNavigate()
  const [teamCount, setTeamCount] = useState(DEFAULT_TEAM_COUNT)
  const [teams, setTeams] = useState(() => createEmptyTeams(DEFAULT_TEAM_COUNT))
  const [tournamentName, setTournamentName] = useState('')
  const [error, setError] = useState('')

  const changeTeamCount = (count) => {
    setTeamCount(count)
    setTeams((prev) => resizeTeams(prev, count))
    setError('')
  }

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
      navigate('/dashboard/singledashb', {
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
    <div className="w-full flex flex-col gap-10">
      <header className="flex justify-between flex-row items-center">
        <button
          className="theme-hover p-2 rounded-md"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft />
        </button>

        <h1 className="font-bold text-lg">Single Elimination</h1>

        {/* Empty spacer, same width as the back button, so the title stays centered */}
        <div className="w-10" />
      </header>

      <TeamsForm
        tournamentName={tournamentName}
        onNameChange={setTournamentName}
        teamCount={teamCount}
        onCountChange={changeTeamCount}
        teams={teams}
        onTeamChange={updateTeam}
        error={error}
        onSubmit={generateBracket}
        onCancel={() => navigate('/dashboard/matching')}
      />
    </div>
  )
}