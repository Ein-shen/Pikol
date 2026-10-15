import React, { useState } from 'react'
import { Trophy, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import {ArrowLeft } from 'lucide-react'

/* =====================================================
   SETTINGS
===================================================== */

const TEAM_COUNT = 10

// Bracket layout
const CARD_WIDTH = 200 // width of one match card
const ROUND_GAP = 56 // space between rounds (where the lines are drawn)
const SLOT_HEIGHT = 120 // height of one match slot in round 1
const LINE_STYLE = '2px solid #1ba3c6'
const LINE_RADIUS = 8


/* =====================================================
   SMALL HELPERS
===================================================== */

// Matches in the next round take the winner of two matches.
// Even match index -> top slot, odd match index -> bottom slot.
const slotFor = (matchIndex) => (matchIndex % 2 === 0 ? 'team1' : 'team2')
// Shows a team as "Player1 & Player2"
const pairLabel = (team) => `${team.player1} & ${team.player2}`

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

// Returns an error message, or '' if everything is fine
function validateTournament(name, teams) {
  if (!name) return 'Please enter a tournament name.'

  const hasEmptyField = teams.some((t) => !t.name || !t.player1 || !t.player2)
  if (hasEmptyField) {
    return `Please complete all ${TEAM_COUNT} teams and their players.`
  }

  const players = teams.flatMap((t) => [
    t.player1.toLowerCase(),
    t.player2.toLowerCase(),
  ])
  if (new Set(players).size !== players.length) {
    return 'Each player must belong to only one team.'
  }

  return ''
}

function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function getRoundName(roundIndex, totalRounds) {
  if (roundIndex === totalRounds - 1) return 'Final'
  if (roundIndex === totalRounds - 2) return 'Semi-finals'
  if (roundIndex === totalRounds - 3) return 'Quarter-finals'
  return `Round ${roundIndex + 1}`
}


/* =====================================================
   BRACKET LOGIC
===================================================== */

function createMatch(team1 = null, team2 = null) {
  return {
    id: crypto.randomUUID(),
    team1,
    team2,
    score1: '',
    score2: '',
    winner: null,
  }
}

// Round 1: some matches have two teams, the rest have one team only
// (that team goes straight to round 2). They are spread evenly.
function buildFirstRound(teams) {
  const bracketSize = 2 ** Math.ceil(Math.log2(teams.length))
  const matchCount = bracketSize / 2
  const fullMatches = teams.length - matchCount

  const fullMatchIndexes = new Set(
    Array.from({ length: fullMatches }, (_, k) =>
      Math.floor(((k + 0.5) * matchCount) / fullMatches)
    )
  )

  let nextExtraTeam = matchCount
  return Array.from({ length: matchCount }, (_, i) => {
    const team2 = fullMatchIndexes.has(i) ? teams[nextExtraTeam++] : null
    return createMatch(teams[i], team2)
  })
}

// Adds the empty rounds after round 1 (each has half as many matches)
function buildAllRounds(firstRound) {
  const rounds = [firstRound]
  let matchCount = firstRound.length

  while (matchCount > 1) {
    matchCount /= 2
    rounds.push(Array.from({ length: matchCount }, () => createMatch()))
  }

  return rounds
}

// Teams without an opponent win automatically and move to round 2
function advanceSingles(rounds) {
  rounds[0].forEach((match, i) => {
    const hasNoOpponent = match.team1 && !match.team2
    if (!hasNoOpponent) return

    match.winner = match.team1
    rounds[1][i >> 1][slotFor(i)] = match.team1
  })
}

function createBracket(teams) {
  const rounds = buildAllRounds(buildFirstRound(shuffle(teams)))
  advanceSingles(rounds)
  return rounds
}

// Puts a team into a match, resets that match,
// and clears every later match that depended on it.
function putTeamInMatch(bracket, roundIndex, matchIndex, slot, team) {
  if (roundIndex >= bracket.length) return

  const match = bracket[roundIndex][matchIndex]
  match[slot] = team
  match.winner = null
  match.score1 = ''
  match.score2 = ''

  const isLastRound = roundIndex === bracket.length - 1
  if (!isLastRound) {
    putTeamInMatch(bracket, roundIndex + 1, matchIndex >> 1, slotFor(matchIndex), null)
  }
}

// The team with the higher score wins. No winner until both scores
// are filled in and they are different.
function getWinner(match) {
  if (match.score1 === '' || match.score2 === '') return null

  const score1 = Number(match.score1)
  const score2 = Number(match.score2)
  if (score1 === score2) return null

  return score1 > score2 ? match.team1 : match.team2
}


/* =====================================================
   SMALL COMPONENTS
===================================================== */

const scoreBoxStyle = {
  width: 50,
  height: 24,
  borderRadius: 4,
  background: '#f1c84b',
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 600,
  color: '#333',
  border: 'none',
  outline: 'none',
}

function nameStyle(team) {
  return {
    fontWeight: team ? 600 : 400,
    color: team ? '#222' : '#999',
  }
}

function MatchCard({ match, onScore }) {
  const { team1, team2 } = match
  const canEnterScore = team1 && team2

  return (
    <div
      style={{
        width: CARD_WIDTH,
        background: '#fff',
        padding: '10px 8px',
        textAlign: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      {/* Scores */}
      <div
        className="flex justify-center items-center gap-1.5"
        style={{ margin: '8px 0' }}
      >
        <input
          type="text"
          inputMode="numeric"
          aria-label="Score team 1"
          disabled={!canEnterScore}
          value={match.score1}
          onChange={(e) => onScore('score1', e.target.value.replace(/\D/g, ''))}
          placeholder="-"
          style={scoreBoxStyle}
        />

        <span style={{ color: '#666', fontSize: 12 }}>:</span>

        <input
          type="text"
          inputMode="numeric"
          aria-label="Score team 2"
          disabled={!canEnterScore}
          value={match.score2}
          onChange={(e) => onScore('score2', e.target.value.replace(/\D/g, ''))}
          placeholder="-"
          style={scoreBoxStyle}
        />
      </div>

      {/* Team names */}
      <div className="flex flex-row flex-wrap justify-center items-center gap-1 text-[13px]">
        <span style={nameStyle(team1)}>
          {team1 ? pairLabel(team1) : 'TBD'}
        </span>

        <span className="text-gray-500">vs</span>

        <span style={nameStyle(team2)}>
          {team2 ? pairLabel(team2) : 'TBD'}
        </span>
      </div>
    </div>
  )
}

// Short line that enters a card from the previous round
function LineIn() {
  return (
    <div
      style={{
        position: 'absolute',
        left: -ROUND_GAP / 2,
        width: ROUND_GAP / 2,
        top: '50%',
        borderTop: LINE_STYLE,
      }}
    />
  )
}

// Elbow line that leaves a card toward the next round.
// The top match curves down, the bottom match curves up, so they meet.
function LineOut({ isTopMatch }) {
  const base = {
    position: 'absolute',
    left: '100%',
    width: ROUND_GAP / 2,
    boxSizing: 'border-box',
    borderRight: LINE_STYLE,
  }

  if (isTopMatch) {
    return (
      <div
        style={{
          ...base,
          top: '50%',
          height: '50%',
          borderTop: LINE_STYLE,
          borderTopRightRadius: LINE_RADIUS,
        }}
      />
    )
  }

  return (
    <div
      style={{
        ...base,
        top: 0,
        height: 'calc(50% + 2px)',
        borderBottom: LINE_STYLE,
        borderBottomRightRadius: LINE_RADIUS,
      }}
    />
  )
}

// One column of the bracket
function Round({ round, roundIndex, totalRounds, onScore }) {
  // Each round is twice as tall per slot, so cards line up with the previous round
  const slotHeight = SLOT_HEIGHT * 2 ** roundIndex
  const isLastRound = roundIndex === totalRounds - 1

  return (
    <div style={{ width: CARD_WIDTH }}>
      <h3
        className="text-center text-xs font-semibold text-gray-500"
        style={{ marginBottom: 12 }}
      >
        {getRoundName(roundIndex, totalRounds)}
      </h3>

      {round.map((match, matchIndex) => {
        // A match with only one team is not shown (that team already moved on)
        const hasNoOpponent = match.team1 && !match.team2

        return (
          <div
            key={match.id}
            className="relative flex items-center"
            style={{ height: slotHeight }}
          >
            {roundIndex > 0 && <LineIn />}

            {!hasNoOpponent && (
              <MatchCard
                match={match}
                onScore={(key, value) => onScore(roundIndex, matchIndex, key, value)}
              />
            )}

            {!isLastRound && <LineOut isTopMatch={matchIndex % 2 === 0} />}
          </div>
        )
      })}
    </div>
  )
}

function ChampionBanner({ champion }) {
  return (
    <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6 text-center">
      <Trophy className="mx-auto mb-2 text-yellow-600" size={36} />
      <p className="text-sm font-medium text-yellow-800">Tournament champion</p>
      <h2 className="mt-1 text-2xl font-bold text-gray-900">{champion.name}</h2>
      <p className="mt-2 text-sm text-gray-600">
        {champion.player1} &amp; {champion.player2}
      </p>
    </div>
  )
}

// The card where you type the tournament name and the teams
function TeamsForm({
  tournamentName,
  onNameChange,
  teams,
  onTeamChange,
  error,
  onSubmit,
  onCancel,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Single elimination</h2>
        <p className="text-sm text-gray-500">
          Register {TEAM_COUNT} teams with 2 players each.
        </p>
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

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t p-5">
        <button
          type="button"
          onClick={onCancel}
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
  )
}


/* =====================================================
   MAIN PAGE
===================================================== */

export const SingleElilmination = () => {
  const navigate = useNavigate()

  // Form
  const [teams, setTeams] = useState(createEmptyTeams)
  const [tournamentName, setTournamentName] = useState('')

  // Tournament
  const [tournamentId, setTournamentId] = useState(null) // id from the database
  const [bracket, setBracket] = useState(null) // null = form is showing
  const [champion, setChampion] = useState(null)

  const [error, setError] = useState('')

  const updateTeam = (id, field, value) => {
    setTeams((prev) =>
      prev.map((team) => (team.id === id ? { ...team, [field]: value } : team))
    )
  }

  // "Generate bracket" button: validate, save to the database, build the bracket
  const generateBracket = async (e) => {
    e.preventDefault()

    const cleanTeams = teams.map(trimTeam)
    const problem = validateTournament(tournamentName.trim(), cleanTeams)
    if (problem) {
      setError(problem)
      return
    }

    try {
      const { data } = await api.post('/tournaments', {
        name: tournamentName.trim(),
        type: 'single',
        teams: cleanTeams,
      })

      // Give every team the id of its pair in the database
      const savedTeams = cleanTeams.map((team) => ({
        ...team,
        pairId: data.pairs[team.id],
      }))

      setTeams(savedTeams)
      setTournamentId(data.tournamentId)
      setBracket(createBracket(savedTeams))
      setChampion(null)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the tournament.')
    }
  }

  // Saves a match result, or removes it if the score was cleared / tied
  const saveResult = (roundIndex, matchIndex, match, winner, winnerChanged) => {
    const matchesUrl = `/tournaments/${tournamentId}/matches`
    const round = roundIndex + 1
    const matchNumber = matchIndex + 1

    if (winner) {
      api
        .put(matchesUrl, {
          round,
          matchNumber,
          pair1Id: match.team1.pairId,
          pair2Id: match.team2.pairId,
          score1: Number(match.score1),
          score2: Number(match.score2),
          winnerPairId: winner.pairId,
        })
        .catch(() => setError('Could not save the score.'))
    } else if (winnerChanged) {
      api
        .delete(`${matchesUrl}/${round}/${matchNumber}`)
        .catch(() => setError('Could not clear the score.'))
    }
  }

  // Runs every time a score box changes
  const updateScore = (roundIndex, matchIndex, key, value) => {
    if (!bracket) return

    // Copy the bracket so React sees a new object
    const newBracket = bracket.map((round) => round.map((m) => ({ ...m })))
    const match = newBracket[roundIndex][matchIndex]
    match[key] = value

    const newWinner = getWinner(match)
    const winnerChanged = (match.winner?.id ?? null) !== (newWinner?.id ?? null)
    match.winner = newWinner

    saveResult(roundIndex, matchIndex, match, newWinner, winnerChanged)

    // Move the winner into the next round
    const isLastRound = roundIndex === newBracket.length - 1
    if (winnerChanged && !isLastRound) {
      putTeamInMatch(
        newBracket,
        roundIndex + 1,
        matchIndex >> 1,
        slotFor(matchIndex),
        newWinner
      )
    }

    const finalMatch = newBracket[newBracket.length - 1][0]
    setChampion(finalMatch.winner || null)
    setBracket(newBracket)
  }

  // Clears the screen only. Saved matches stay in the database.
  const resetTournament = () => {
    setBracket(null)
    setChampion(null)
    setError('')
    setTeams(createEmptyTeams())
    setTournamentName('')
    setTournamentId(null)
  }

  return (
    <div className="w-full space-y-8">
      <div className='flex flex-row  gap-7 '>
        <button
        onClick={() => navigate(-1)}
        >
          <ArrowLeft />
        </button>
        <h1 className="text-lg font-bold">Single Elimination</h1>

      </div>
      

      {/* Step 1: register the teams */}
      {!bracket && (
        <TeamsForm
          tournamentName={tournamentName}
          onNameChange={setTournamentName}
          teams={teams}
          onTeamChange={updateTeam}
          error={error}
          onSubmit={generateBracket}
          onCancel={() => navigate('/dashboard/matching')}
        />
      )}

      {/* Step 2: play the bracket */}
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

          {champion && <ChampionBanner champion={champion} />}

          <div
            className="overflow-x-auto rounded-xl p-6"
            style={{ background: '#efefef' }}
          >
            <div className="flex min-w-max items-start" style={{ gap: ROUND_GAP }}>
              {bracket.map((round, roundIndex) => (
                <Round
                  key={roundIndex}
                  round={round}
                  roundIndex={roundIndex}
                  totalRounds={bracket.length}
                  onScore={updateScore}
                />
              ))}
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Enter the score in the yellow boxes. The team with the higher score
            advances to the next round.
          </p>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  )
}