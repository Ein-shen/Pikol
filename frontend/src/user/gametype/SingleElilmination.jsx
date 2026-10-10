import React, { useState } from 'react'
import { Trophy, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TEAM_COUNT = 10

// ---- Layout constants (these control how the bracket looks) ----
const CARD_W = 200 // width of each match card
const GAP = 56 // horizontal space between rounds (connector area)
const BASE_H = 120 // height of one slot in round 1
const LINE = '2px solid #1ba3c6' // connector line style
const RADIUS = 8 // rounded corner of the connectors

function createTeams() {
  return Array.from({ length: TEAM_COUNT }, (_, i) => ({
    id: i + 1,
    name: `Team ${i + 1}`,
    player1: '',
    player2: '',
  }))
}

const emptyMatch = (team1 = null, team2 = null) => ({
  id: crypto.randomUUID(),
  team1,
  team2,
  score1: '',
  score2: '',
  winner: null,
})

// Put `team` into a slot of a match, reset that match,
// and clear everything that depended on it (recursively).
function setSlot(bracket, r, m, slot, team) {
  if (r >= bracket.length) return
  const match = bracket[r][m]
  match[slot] = team
  match.winner = null
  match.score1 = ''
  match.score2 = ''
  if (r < bracket.length - 1) {
    setSlot(bracket, r + 1, m >> 1, m % 2 === 0 ? 'team1' : 'team2', null)
  }
}

// Build a single-elimination bracket. Byes are spread evenly,
// and teams with a bye are moved to round 2 automatically.
function createBracket(teams) {
  const shuffled = [...teams]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const size = 2 ** Math.ceil(Math.log2(shuffled.length))
  const matchCount = size / 2
  const realMatches = shuffled.length - matchCount // matches with 2 teams

  // Choose which first-round matches get two teams (spread out evenly)
  const doubleSet = new Set(
    Array.from({ length: realMatches }, (_, k) =>
      Math.floor(((k + 0.5) * matchCount) / realMatches)
    )
  )

  const first = Array.from({ length: matchCount }, (_, i) =>
    emptyMatch(shuffled[i], null)
  )
  let extra = matchCount
  first.forEach((match, i) => {
    if (doubleSet.has(i)) match.team2 = shuffled[extra++]
  })

  const rounds = [first]
  let count = matchCount
  while (count > 1) {
    count /= 2
    rounds.push(Array.from({ length: count }, () => emptyMatch()))
  }

  // Auto-advance bye teams
  first.forEach((match, i) => {
    if (match.team1 && !match.team2) {
      match.winner = match.team1
      rounds[1][i >> 1][i % 2 === 0 ? 'team1' : 'team2'] = match.team1
    }
  })

  return rounds
}

function getRoundName(index, total) {
  if (index === total - 1) return 'Final'
  if (index === total - 2) return 'Semi-finals'
  if (index === total - 3) return 'Quarter-finals'
  return `Round ${index + 1}`
}

/* ---------------- Match card ---------------- */

function MatchCard({ match, date, onScore }) {
  const isBye = match.team1 && !match.team2 && match.winner
  const w = match.winner

  const badge = {
    width: 24,
    height: 24,
    borderRadius: 4,
    background: '#f1c84b',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    border: 'none',
    outline: 'none',
    MozAppearance: 'textfield',
  }

  const nameStyle = (team) => ({
    color: '#3f3f9f',
    fontWeight: 700,
    fontSize: 13,
    textDecoration: team && w?.id === team.id ? 'underline' : 'none',
    opacity: team && w && w.id !== team.id ? 0.45 : 1,
  })

  const canScore = match.team1 && match.team2

  return (
    <div
      style={{
        width: CARD_W,
        background: '#fff',
        padding: '10px 8px',
        textAlign: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        opacity: isBye ? 0.6 : 1,
      }}
    >
      <div style={{ fontSize: 12, color: '#9a9a9a' }}>{date}</div>

      <div
        style={{
          margin: '8px 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <input
          type="number"
          min="0"
          aria-label="Score team 1"
          disabled={!canScore}
          value={match.score1}
          onChange={(e) => onScore('score1', e.target.value)}
          placeholder="-"
          style={badge}
        />
        <span style={{ color: '#666', fontSize: 12 }}>:</span>
        <input
          type="number"
          min="0"
          aria-label="Score team 2"
          disabled={!canScore}
          value={match.score2}
          onChange={(e) => onScore('score2', e.target.value)}
          placeholder="-"
          style={badge}
        />
      </div>

      <div
        style={{
          fontSize: 13,
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
          flexWrap: 'wrap',
        }}
      >
        <span style={nameStyle(match.team1)}>
          {match.team1 ? match.team1.name : 'TBD'}
        </span>
        <span style={{ color: '#777' }}>vs</span>
        <span style={nameStyle(match.team2)}>
          {match.team2 ? match.team2.name : isBye ? 'BYE' : 'TBD'}
        </span>
      </div>
    </div>
  )
}

/* ---------------- Main component ---------------- */

export const SingleElilmination = () => {
  const navigate = useNavigate()
  const [teams, setTeams] = useState(createTeams)
  const [tournamentName, setTournamentName] = useState('')
  const [tournamentDate, setTournamentDate] = useState('')
  const [bracket, setBracket] = useState(null)
  const [error, setError] = useState('')
  const [champion, setChampion] = useState(null)

  const updateTeam = (id, field, value) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === id ? { ...team, [field]: value } : team
      )
    )
  }

  const createTournament = (e) => {
    e.preventDefault()

    const validTeams = teams.map((team) => ({
      ...team,
      name: team.name.trim(),
      player1: team.player1.trim(),
      player2: team.player2.trim(),
    }))

    if (!tournamentName.trim()) {
      setError('Please enter a tournament name.')
      return
    }

    if (validTeams.some((t) => !t.player1 || !t.player2 || !t.name)) {
      setError('Please complete all 10 teams and their players.')
      return
    }

    const players = validTeams.flatMap((t) => [
      t.player1.toLowerCase(),
      t.player2.toLowerCase(),
    ])

    if (new Set(players).size !== players.length) {
      setError('Each player must belong to only one team.')
      return
    }

    setTeams(validTeams)
    setBracket(createBracket(validTeams))
    setTournamentDate(new Date().toISOString().slice(0, 10))
    setChampion(null)
    setError('')
  }

  // Called when a score changes. The higher score wins and advances.
  const updateScore = (roundIndex, matchIndex, key, value) => {
    if (!bracket) return

    const next = bracket.map((round) => round.map((m) => ({ ...m })))
    const match = next[roundIndex][matchIndex]
    match[key] = value

    const hasBoth = match.score1 !== '' && match.score2 !== ''
    const s1 = Number(match.score1)
    const s2 = Number(match.score2)
    const newWinner =
      hasBoth && s1 !== s2 ? (s1 > s2 ? match.team1 : match.team2) : null

    const changed = (match.winner?.id ?? null) !== (newWinner?.id ?? null)
    match.winner = newWinner

    if (changed && roundIndex < next.length - 1) {
      setSlot(
        next,
        roundIndex + 1,
        matchIndex >> 1,
        matchIndex % 2 === 0 ? 'team1' : 'team2',
        newWinner
      )
    }

    const finalMatch = next[next.length - 1][0]
    setChampion(finalMatch.winner || null)
    setBracket(next)
  }

  const resetTournament = () => {
    setBracket(null)
    setChampion(null)
    setError('')
    setTeams(createTeams())
    setTournamentName('')
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-lg font-bold">Single Elimination</h1>
      </div>

      {/* Players card */}
      {!bracket && (
        <form
          onSubmit={createTournament}
          className="rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">Single elimination</h2>
            <p className="text-sm text-gray-500">
              Register 10 teams with 2 players each.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Tournament name
              </label>
              <input
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g. Doubles Championship"
                className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {teams.map((team, index) => (
                <div
                  key={team.id}
                  className="space-y-3 rounded-lg border p-3"
                >
                  <label className="block text-sm font-bold">
                    Team {index + 1}
                  </label>

                  <input
                    value={team.name}
                    onChange={(e) =>
                      updateTeam(team.id, 'name', e.target.value)
                    }
                    placeholder="Team name"
                    className="w-full rounded-md border p-2 text-sm"
                  />
                  <input
                    value={team.player1}
                    onChange={(e) =>
                      updateTeam(team.id, 'player1', e.target.value)
                    }
                    placeholder="Player 1"
                    className="w-full rounded-md border p-2 text-sm"
                  />
                  <input
                    value={team.player2}
                    onChange={(e) =>
                      updateTeam(team.id, 'player2', e.target.value)
                    }
                    placeholder="Player 2"
                    className="w-full rounded-md border p-2 text-sm"
                  />
                </div>
              ))}
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t p-5">
            <button
              type="button"
              onClick={() => navigate('/dashboard/matching')}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-black px-5 py-2 text-white hover:bg-gray-800"
            >
              Generate bracket
            </button>
          </div>
        </form>
      )}

      {/* Bracket */}
      {bracket && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5">
            <div>
              <h2 className="text-xl font-bold">{tournamentName}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {teams.length} teams registered
              </p>
            </div>

            <button
              onClick={resetTournament}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
              <RotateCcw size={16} />
              Reset tournament
            </button>
          </div>

          {champion && (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6 text-center">
              <Trophy className="mx-auto mb-2 text-yellow-600" size={36} />
              <p className="text-sm font-medium text-yellow-800">
                Tournament champion
              </p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                {champion.name}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {champion.player1} &amp; {champion.player2}
              </p>
            </div>
          )}

          <div
            className="overflow-x-auto rounded-xl p-6"
            style={{ background: '#efefef' }}
          >
            <div
              className="flex min-w-max items-start"
              style={{ gap: GAP }}
            >
              {bracket.map((round, roundIndex) => {
                const slotH = BASE_H * 2 ** roundIndex
                const isLast = roundIndex === bracket.length - 1

                return (
                  <div key={roundIndex} style={{ width: CARD_W }}>
                    <h3
                      className="text-center text-xs font-semibold text-gray-500"
                      style={{ marginBottom: 12 }}
                    >
                      {getRoundName(roundIndex, bracket.length)}
                    </h3>

                    {round.map((match, matchIndex) => (
                      <div
                        key={match.id}
                        className="relative flex items-center"
                        style={{ height: slotH }}
                      >
                        {roundIndex > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: -GAP / 2,
                              width: GAP / 2,
                              top: '50%',
                              borderTop: LINE,
                            }}
                          />
                        )}

                        <MatchCard
                          match={match}
                          date={tournamentDate}
                          onScore={(key, value) =>
                            updateScore(roundIndex, matchIndex, key, value)
                          }
                        />

                        {!isLast &&
                          (matchIndex % 2 === 0 ? (
                            <div
                              style={{
                                position: 'absolute',
                                left: '100%',
                                width: GAP / 2,
                                top: '50%',
                                height: '50%',
                                boxSizing: 'border-box',
                                borderTop: LINE,
                                borderRight: LINE,
                                borderTopRightRadius: RADIUS,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                position: 'absolute',
                                left: '100%',
                                width: GAP / 2,
                                top: 0,
                                height: 'calc(50% + 2px)',
                                boxSizing: 'border-box',
                                borderBottom: LINE,
                                borderRight: LINE,
                                borderBottomRightRadius: RADIUS,
                              }}
                            />
                          ))}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Enter the score in the yellow boxes. The team with the higher
            score advances to the next round. Teams with a bye advance
            automatically.
          </p>
        </section>
      )}
    </div>
  )
}