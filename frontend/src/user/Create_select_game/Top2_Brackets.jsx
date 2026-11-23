import React, { useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../api'
// getFormatSummary: one-line text describing the format for a team count
// getGroupLabel:    which group (A-D) a team falls in, from its position in the list
import { getFormatSummary, getGroupLabel } from '../bracket_lead/Top2_bracketing_e'

// Team counts the user can pick.
const TEAM_COUNT_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 24, 28, 32]
const DEFAULT_TEAM_COUNT = 8

// Route of the Top 2 dashboard (list + bracket view). MUST match your router.
const DASH_ROUTE = '/dashboard/top2dashb'

// Form rows get their own local id (1, 2, 3 ...). Teams loaded from the server also
// keep their database `pairId`; a row WITHOUT a pairId is a new team.
function createEmptyTeam(id) {
  return { id, name: `Team ${id}`, player1: '', player2: '' }
}

function createEmptyTeams(count) {
  return Array.from({ length: count }, (_, i) => createEmptyTeam(i + 1))
}

// Grow or shrink the list while keeping what was already typed.
// New ids start after the biggest id in use, so they never clash.
function resizeTeams(prev, count) {
  if (count <= prev.length) return prev.slice(0, count)
  const start = Math.max(0, ...prev.map((t) => t.id))
  const extra = Array.from({ length: count - prev.length }, (_, i) =>
    createEmptyTeam(start + i + 1)
  )
  return [...prev, ...extra]
}

// Team names are hidden in the form and always follow the position ("Team 1", "Team 2" ...)
const autoName = (team, index) =>
  /^team\s*\d+$/i.test((team.name || '').trim()) ? { ...team, name: `Team ${index + 1}` } : team

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

  if (!TEAM_COUNT_OPTIONS.includes(teams.length)) {
    return `Please choose a valid number of teams (${TEAM_COUNT_OPTIONS.join(', ')}).`
  }

  if (teams.some((t) => !t.name || !t.player1 || !t.player2)) {
    return `Please complete all ${teams.length} teams and their players.`
  }

  const names = teams.map((t) => t.name.toLowerCase())
  if (new Set(names).size !== names.length) {
    return 'Each team name must be unique.'
  }

  const players = teams.flatMap((t) => [t.player1.toLowerCase(), t.player2.toLowerCase()])
  if (new Set(players).size !== players.length) {
    return 'Each player must belong to only one team.'
  }
  return ''
}

function TeamsForm({
  isEdit,
  tournamentName,
  onNameChange,
  teamCount,
  onCountChange,
  teams,
  onTeamChange,
  onRemoveTeam,
  error,
  onSubmit,
  onCancel,
  saving,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="theme-card theme-text rounded-xl border theme-border shadow-sm"
    >
      <div className="border-b theme-border p-5">
        <h2 className="text-lg font-bold capitalize">
          {isEdit ? 'Edit tournament' : 'Standard Tournament'}
        </h2>
        <p className="text-sm theme-muted">
          {isEdit
            ? `Change players, or add / remove teams. Now: ${teamCount} teams.`
            : `Register ${teamCount} teams with 2 players each.`}
        </p>
      </div>

      <div className="space-y-4 p-5">
        {isEdit && (
          <p className="rounded-lg border theme-border space-y-2 p-3 text-xs theme-muted">
            <span className='text-red-500 text-md font-bold'>Note:</span>  Changing only player names keeps all scores. Adding or removing a team rebuilds the
            groups, so <strong>all group and playoff scores will be cleared</strong>.
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Tournament name</label>
          <input
            value={tournamentName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Doubles Championship"
            className="theme-input w-full rounded-lg p-3"
            disabled={saving}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Number of teams</label>
          <div className="flex flex-wrap gap-2">
            {TEAM_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                disabled={saving}
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
            {getFormatSummary(teamCount)} Everyone plays everyone in their group first.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {teams.map((team, index) => (
            <div key={team.id} className="space-y-3 rounded-lg border theme-border p-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold">
                  Team {index + 1}
                  <span className="ml-2 text-xs font-normal theme-muted">
                    Group {getGroupLabel(index, teamCount)}
                  </span>
                </label>

                {/* Edit mode only: remove this team (the list closes the gap) */}
                {isEdit && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onRemoveTeam(team.id)}
                    aria-label={`Remove team ${index + 1}`}
                    className="opacity-60 transition hover:opacity-100 p-1 rounded-md disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <input
                value={team.player1}
                disabled={saving}
                onChange={(e) => onTeamChange(team.id, 'player1', e.target.value)}
                placeholder="Player 1"
                className="theme-input w-full rounded-md p-2 text-sm"
              />
              <input
                value={team.player2}
                disabled={saving}
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
          disabled={saving}
          className="theme-text theme-hover rounded-lg border theme-border px-5 py-2 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="theme-accent rounded-lg border border-transparent px-5 py-2 font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Generate groups'}
        </button>
      </div>
    </form>
  )
}

export const Top2_Brackets = () => {
  const navigate = useNavigate()

  // EDIT MODE: the bracket page sends { edit: true, tournamentId, tournamentName, teams }
  // through the router state. Without it (or after a page refresh) this is the normal
  // "create" form.
  const { state } = useLocation()
  const isEdit = !!(state?.edit && state.tournamentId && state.teams?.length)
  const tournamentId = isEdit ? state.tournamentId : null

  const [teams, setTeams] = useState(() =>
    isEdit
      ? state.teams.map((t, i) => ({
          id: i + 1, // local form id
          pairId: t.pairId ?? t.id, // database id (kept so scores stay linked)
          name: `Team ${i + 1}`,
          player1: t.player1 || '',
          player2: t.player2 || '',
        }))
      : createEmptyTeams(DEFAULT_TEAM_COUNT)
  )
  const [teamCount, setTeamCount] = useState(teams.length)
  const [tournamentName, setTournamentName] = useState(isEdit ? state.tournamentName || '' : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const changeTeamCount = (count) => {
    setTeamCount(count)
    setTeams((prev) => resizeTeams(prev, count))
    setError('')
  }

  const updateTeam = (id, field, value) => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  // Edit mode: remove one team, wherever it is in the list
  const removeTeam = (id) => {
    const next = teams.filter((t) => t.id !== id)
    setTeams(next)
    setTeamCount(next.length)
    setError('')
  }

  // ---- CREATE: new tournament ----
  const createTournament = async (name, cleanTeams) => {
    const { data } = await api.post('/tournaments', { name, type: 'top2', teams: cleanTeams })

    const savedTeams = cleanTeams.map((team) => ({
      ...team,
      id: data.pairs?.[team.id] ?? team.id,
      pairId: data.pairs?.[team.id] ?? team.id,
    }))

    navigate(DASH_ROUTE, {
      state: {
        tournamentId: data.tournamentId,
        tournamentName: name,
        teams: savedTeams,
        groupMatches: [],
        matches: [],
      },
    })
  }

  // ---- EDIT: update the existing tournament ----
  const updateTournament = async (name, cleanTeams) => {
    // Does this change the group structure? (a team was added or removed)
    const oldIds = state.teams.map((t) => String(t.pairId ?? t.id))
    const keptIds = cleanTeams.filter((t) => t.pairId != null).map((t) => String(t.pairId))
    const structureChanged =
      cleanTeams.some((t) => t.pairId == null) || oldIds.some((id) => !keptIds.includes(id))

    if (
      structureChanged &&
      !window.confirm('Adding or removing teams rebuilds the groups and clears ALL scores. Continue?')
    ) {
      return false
    }

    await api.put(`/top2/${tournamentId}/teams`, {
      name,
      teams: cleanTeams.map((t) => ({
        pairId: t.pairId ?? null, // null = new team
        player1: t.player1,
        player2: t.player2,
      })),
    })

    // Reload the saved tournament so new teams get their real ids and the
    // scores that were kept (or cleared) are exactly what the server has
    const { data } = await api.get(`/top2/${tournamentId}`)

    navigate(DASH_ROUTE, {
      state: {
        tournamentId: data.id,
        tournamentName: data.name,
        teams: data.teams,
        groupMatches: data.groupMatches ?? [],
        matches: data.matches ?? [],
      },
    })
    return true
  }

  const generateBracket = async (e) => {
    e.preventDefault()
    if (saving) return

    const cleanTeams = teams.map((t, i) => trimTeam(autoName(t, i)))
    const name = tournamentName.trim()
    const problem = validateTournament(name, cleanTeams)
    if (problem) return setError(problem)

    setError('')
    setSaving(true)
    try {
      const done = isEdit
        ? await updateTournament(name, cleanTeams)
        : (await createTournament(name, cleanTeams), true)
      if (!done) setSaving(false) // user cancelled the confirm
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isEdit ? 'Could not update the tournament.' : 'Could not save the tournament.')
      )
      setSaving(false)
    }
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

        <h1 className="font-bold text-lg">{isEdit ? 'Edit Tournament' : 'Standard Tournament'}</h1>

        {/* Empty spacer, same width as the back button, so the title stays centered */}
        <div className="w-10" />
      </header>

      <TeamsForm
        isEdit={isEdit}
        tournamentName={tournamentName}
        onNameChange={setTournamentName}
        teamCount={teamCount}
        onCountChange={changeTeamCount}
        teams={teams}
        onTeamChange={updateTeam}
        onRemoveTeam={removeTeam}
        error={error}
        onSubmit={generateBracket}
        onCancel={() => (isEdit ? navigate(-1) : navigate(DASH_ROUTE))}
        saving={saving}
      />
    </div>
  )
}