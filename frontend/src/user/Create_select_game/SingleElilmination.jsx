import React, { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { createBracket } from '../bracket_lead/Bracket_Single_VIew'

// Any count works: when it is not 4, 8, 16 or 32, some teams get a bye
// (they skip round 1 and start in round 2). createBracket handles it.
const TEAM_COUNT_OPTIONS = [4, 6, 8, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 24, 32]
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

  // Two teams with the same name look identical in the bracket
  const names = teams.map((t) => t.name.toLowerCase())
  if (new Set(names).size !== names.length) {
    return 'Each team must have a different name.'
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
  submitting,
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
          <label htmlFor="tournament-name" className="mb-1 block text-sm font-medium">
            Tournament name
          </label>
          <input
            id="tournament-name"
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
            4, 8, 16 and 32 give a bracket where every team plays in round 1. Other counts give
            some teams a bye: they skip round 1 and start in round 2.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {teams.map((team, index) => (
            <div key={team.id} className="space-y-3 rounded-lg border theme-border p-3">
              <label htmlFor={`team-${team.id}-name`} className="block text-sm font-bold">
                Team {index + 1}
              </label>
              {/* <input
                id={`team-${team.id}-name`}
                value={team.name}
                onChange={(e) => onTeamChange(team.id, 'name', e.target.value)}
                placeholder="Team name"
                className="theme-input w-full rounded-md p-2 text-sm"
              /> */}
              <input
                aria-label={`Team ${index + 1} player 1`}
                value={team.player1}
                onChange={(e) => onTeamChange(team.id, 'player1', e.target.value)}
                placeholder="Player 1"
                className="theme-input w-full rounded-md p-2 text-sm"
              />
              <input
                aria-label={`Team ${index + 1} player 2`}
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
          disabled={submitting}
          className="theme-text theme-hover rounded-lg border theme-border px-5 py-2 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="theme-accent rounded-lg border border-transparent px-5 py-2 font-semibold disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Generate bracket'}
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
  const [submitting, setSubmitting] = useState(false)

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
    if (submitting) return // stops a double click from creating two tournaments

    const cleanTeams = teams.map(trimTeam)
    const name = tournamentName.trim()
    const problem = validateTournament(name, cleanTeams)
    if (problem) return setError(problem)

    setError('')
    setSubmitting(true)

    let data
    try {
      const res = await api.post('/tournaments', { name, type: 'single', teams: cleanTeams })
      data = res.data
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the tournament.')
      setSubmitting(false)
      return
    }

    // The tournament is saved now. If the server reply is missing the pair ids,
    // say so instead of the misleading "could not save".
    if (!data?.pairs) {
      setError('The tournament was saved, but the server did not return the team ids.')
      setSubmitting(false)
      return
    }

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
  }

  return (
    <div className="w-full flex flex-col gap-10">
      <header className="flex justify-between flex-row items-center">
        <button
          className="opacity-60 transition hover:opacity-100 p-2 rounded-md"
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
        submitting={submitting}
        onSubmit={generateBracket}
        onCancel={() => navigate('/dashboard/matching')}
      />
    </div>
  )
}