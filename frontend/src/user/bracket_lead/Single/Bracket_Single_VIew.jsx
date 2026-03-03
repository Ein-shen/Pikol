import React, { useState } from 'react'
import { Trophy, RotateCcw } from 'lucide-react'
import api from '../../../api'
import { useNavigate } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/* Layout constants                                                    */
/* ------------------------------------------------------------------ */
const CARD_WIDTH = 200
const ROUND_GAP = 56
const ROW_HEIGHT = 150
const HEADER = 40
const LINE_COLOR = '#1ba3c6'
const COLUMN = CARD_WIDTH + ROUND_GAP

/* ------------------------------------------------------------------ */
/* Bracket logic                                                       */
/* Every team plays in round 1. If a round has an odd number of        */
/* winners, one team gets a visible "waiting" card and plays next round.*/
/* ------------------------------------------------------------------ */
const teamKey = (t) => (t ? t.pairId ?? t.id : null)
const pairLabel = (team) => `${team.player1} & ${team.player2}`

export const isPowerOfTwo = (n) => n >= 2 && (n & (n - 1)) === 0

const matchItem = (team1, team2, feeds) => ({
  id: crypto.randomUUID(), kind: 'match',
  team1, team2, score1: '', score2: '', winner: null, feeds,
})

const waitItem = (team1, feed) => ({
  id: crypto.randomUUID(), kind: 'wait',
  team1, team2: null, score1: '', score2: '', winner: team1,
  feeds: feed ? [feed] : [],
})

function getRoundName(roundIndex, totalRounds) {
  if (roundIndex === totalRounds - 1) return 'Final'
  if (roundIndex === totalRounds - 2) return 'Semi-finals'
  return `Round ${roundIndex + 1}`
}

function getWinner(match) {
  if (!match.team1 || !match.team2) return null
  if (match.score1 === '' || match.score2 === '') return null
  const s1 = Number(match.score1)
  const s2 = Number(match.score2)
  if (s1 === s2) return null
  return s1 > s2 ? match.team1 : match.team2
}

// Recompute who plays who from the scores. Returns matches whose
// scores were cleared because their teams changed.
function propagate(bracket) {
  const cleared = []

  bracket.forEach((round, r) => {
    round.forEach((item, m) => {
      if (r > 0) {
        const from = (f) => (f ? bracket[f.r][f.m].winner : null)

        if (item.kind === 'wait') {
          item.team1 = from(item.feeds[0])
        } else {
          const t1 = from(item.feeds[0])
          const t2 = from(item.feeds[1])
          const changed =
            teamKey(t1) !== teamKey(item.team1) || teamKey(t2) !== teamKey(item.team2)

          if (changed) {
            if (item.score1 !== '' || item.score2 !== '') {
              cleared.push({ round: r + 1, matchNumber: m + 1 })
            }
            item.score1 = ''
            item.score2 = ''
          }
          item.team1 = t1
          item.team2 = t2
        }
      }

      item.winner = item.kind === 'wait' ? item.team1 : getWinner(item)
    })
  })

  return cleared
}

// Same teams in the same order = same bracket, every time
export function createBracket(teams) {
  if (!teams || teams.length < 2) return []

  // Round 1: pair everyone in order
  const first = []
  for (let i = 0; i < teams.length; i += 2) {
    first.push(
      teams[i + 1] ? matchItem(teams[i], teams[i + 1], []) : waitItem(teams[i], null)
    )
  }

  const rounds = [first]

  while (rounds[rounds.length - 1].length > 1) {
    const r = rounds.length - 1
    const prev = rounds[r]
    const n = prev.length
    const ref = (i) => ({ r, m: i })

    // Odd number of winners: one of them waits a round
    let waiter = -1
    if (n % 2 === 1) {
      waiter = r % 2 === 1 ? 0 : n - 1 // alternate top / bottom
      const other = n - 1 - waiter
      // don't make the same team wait twice in a row
      if (prev[waiter].kind === 'wait' && prev[other].kind !== 'wait') waiter = other
    }

    const rest = prev.map((_, i) => i).filter((i) => i !== waiter)
    const next = []

    if (waiter === 0) next.push(waitItem(null, ref(0)))
    for (let k = 0; k < rest.length; k += 2) {
      next.push(matchItem(null, null, [ref(rest[k]), ref(rest[k + 1])]))
    }
    if (waiter === n - 1) next.push(waitItem(null, ref(waiter)))

    rounds.push(next)
  }

  propagate(rounds)
  return rounds
}

// Put saved scores back onto a freshly built bracket
export function applyResults(bracket, matches) {
  bracket.forEach((round, r) => {
    matches
      .filter((saved) => saved.round === r + 1)
      .forEach((saved) => {
        const item = round[saved.matchNumber - 1]
        if (!item || item.kind !== 'match' || !item.team1 || !item.team2) return
        item.score1 = String(saved.score1)
        item.score2 = String(saved.score2)
      })
    propagate(bracket)
  })
  return bracket
}

// A bracket made by an older version has no `feeds`. Detect it.
const isValidBracket = (b) =>
  Array.isArray(b) &&
  b.length > 0 &&
  b.every((round) => round.every((item) => Array.isArray(item.feeds)))

// Vertical position of every item: first round is evenly spaced,
// later items sit at the average height of the items feeding them.
function computeLayout(bracket) {
  const ys = bracket.map(() => [])
  bracket.forEach((round, r) => {
    round.forEach((item, m) => {
      if (r === 0) {
        ys[r][m] = HEADER + m * ROW_HEIGHT + ROW_HEIGHT / 2
      } else {
        const feederYs = item.feeds.map((f) => ys[f.r][f.m])
        ys[r][m] = feederYs.reduce((a, b) => a + b, 0) / feederYs.length
      }
    })
  })
  return ys
}

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
const scoreBoxStyle = {
  width: 50, height: 24, borderRadius: 4, background: '#f1c84b',
  textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#333',
  border: 'none', outline: 'none',
}

const nameStyle = (team) => ({
  fontWeight: team ? 600 : 400,
  color: team ? '#222' : '#999',
})

function MatchCard({ match, onScore }) {
  const { team1, team2 } = match
  const canEnterScore = team1 && team2

  return (
    <div
      style={{
        width: CARD_WIDTH, background: '#fff', padding: '10px 8px',
        textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex justify-center items-center gap-1.5" style={{ margin: '8px 0' }}>
        <input
          type="text" inputMode="numeric" aria-label="Score team 1"
          disabled={!canEnterScore} value={match.score1} placeholder="-"
          onChange={(e) => onScore('score1', e.target.value.replace(/\D/g, ''))}
          style={scoreBoxStyle}
        />
        <span style={{ color: '#666', fontSize: 12 }}>:</span>
        <input
          type="text" inputMode="numeric" aria-label="Score team 2"
          disabled={!canEnterScore} value={match.score2} placeholder="-"
          onChange={(e) => onScore('score2', e.target.value.replace(/\D/g, ''))}
          style={scoreBoxStyle}
        />
      </div>

      <div className="flex flex-row flex-wrap justify-center items-center gap-1 text-[13px]">
        <span style={nameStyle(team1)}>{team1 ? pairLabel(team1) : 'TBD'}</span>
        <span className="text-gray-500">vs</span>
        <span style={nameStyle(team2)}>{team2 ? pairLabel(team2) : 'TBD'}</span>
      </div>
    </div>
  )
}

function WaitCard({ item }) {
  return (
    <div
      style={{
        width: CARD_WIDTH, background: '#fafafa', padding: '8px',
        textAlign: 'center', border: '1px dashed #bbb',
      }}
    >
      <p className="text-[11px] uppercase tracking-wide text-gray-500">
        Waiting for next round
      </p>
      <p className="mt-1 text-[13px]" style={nameStyle(item.team1)}>
        {item.team1 ? pairLabel(item.team1) : 'TBD'}
      </p>
    </div>
  )
}

function BracketTree({ bracket, onScore }) {
  if (!bracket.length) return null

  const ys = computeLayout(bracket)
  const width = bracket.length * COLUMN - ROUND_GAP
  const height = Math.max(...ys.flat()) + ROW_HEIGHT / 2

  return (
    <div className="relative" style={{ width, height }}>
      {/* Titles */}
      {bracket.map((_, r) => (
        <h3
          key={r}
          className="absolute text-center text-xs font-semibold text-gray-500"
          style={{ left: r * COLUMN, top: 0, width: CARD_WIDTH }}
        >
          {getRoundName(r, bracket.length)}
        </h3>
      ))}

      {/* Connector lines */}
      <svg
        width={width}
        height={height}
        className="absolute left-0 top-0"
        style={{ pointerEvents: 'none' }}
      >
        {bracket.flatMap((round, r) =>
          round.flatMap((item, m) =>
            item.feeds.map((f, k) => {
              const x1 = f.r * COLUMN + CARD_WIDTH
              const y1 = ys[f.r][f.m]
              const x2 = r * COLUMN
              const y2 = ys[r][m]
              const midX = x2 - ROUND_GAP / 2
              return (
                <path
                  key={`${item.id}-${k}`}
                  d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
                  fill="none"
                  stroke={LINE_COLOR}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              )
            })
          )
        )}
      </svg>

      {/* Cards */}
      {bracket.flatMap((round, r) =>
        round.map((item, m) => (
          <div
            key={item.id}
            className="absolute"
            style={{ left: r * COLUMN, top: ys[r][m], transform: 'translateY(-50%)' }}
          >
            {item.kind === 'wait' ? (
              <WaitCard item={item} />
            ) : (
              <MatchCard match={item} onScore={(key, value) => onScore(r, m, key, value)} />
            )}
          </div>
        ))
      )}
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

export const Bracket_Single_VIew = ({
  tournamentId,
  tournamentName,
  teams,
  initialBracket,
  onReset,
}) => {
  const navigate = useNavigate()

  // Rebuild from the teams if the incoming bracket is from an older version
  const [bracket, setBracket] = useState(() =>
    isValidBracket(initialBracket) ? initialBracket : createBracket(teams)
  )
  const [champion, setChampion] = useState(
    () => bracket[bracket.length - 1]?.[0]?.winner ?? null
  )
  const [error, setError] = useState('')

  const hasWaiting = bracket.some((round, r) => r > 0 && round.some((i) => i.kind === 'wait'))

  const saveResult = (roundIndex, matchIndex, match, winnerChanged, cleared) => {
    const matchesUrl = `/tournaments/${tournamentId}/matches`
    const round = roundIndex + 1
    const matchNumber = matchIndex + 1

    if (match.winner) {
      api
        .put(matchesUrl, {
          round,
          matchNumber,
          pair1Id: match.team1.pairId,
          pair2Id: match.team2.pairId,
          score1: Number(match.score1),
          score2: Number(match.score2),
          winnerPairId: match.winner.pairId,
        })
        .catch(() => setError('Could not save the score.'))
    } else if (winnerChanged) {
      api
        .delete(`${matchesUrl}/${round}/${matchNumber}`)
        .catch(() => setError('Could not clear the score.'))
    }

    // Later matches whose teams changed lose their scores too
    cleared.forEach((c) => {
      api
        .delete(`${matchesUrl}/${c.round}/${c.matchNumber}`)
        .catch(() => setError('Could not clear a later score.'))
    })
  }

  const updateScore = (roundIndex, matchIndex, key, value) => {
    const next = bracket.map((round) => round.map((item) => ({ ...item })))
    const item = next[roundIndex][matchIndex]

    const before = teamKey(item.winner)
    item[key] = value
    const cleared = propagate(next)
    const after = teamKey(item.winner)

    setBracket(next)
    setChampion(next[next.length - 1][0].winner || null)
    saveResult(roundIndex, matchIndex, item, before !== after, cleared)
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border theme-muted p-5">
        <div>
          <h2 className="text-xl font-bold capitalize">{tournamentName}</h2>
          <p className="mt-1 text-sm text-gray-500">{teams.length} teams registered</p>
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-lg   px-3 py-2 text-sm  theme-border theme-hover theme-accent"
        >
          <RotateCcw size={16} />
          Reset tournament
        </button>

        
      </div>

      {champion && <ChampionBanner champion={champion} />}

      <div className="overflow-x-auto rounded-xl p-6 theme-accent"  >
        <BracketTree bracket={bracket} onScore={updateScore} />
      </div>

      <p className="text-sm theme-text font-bold">
        Enter the score in the yellow boxes. The team with the higher score advances to the next round.
        {hasWaiting &&
          ` With ${teams.length} teams, the winners can't always pair evenly. A team in a dashed "Waiting" card has no opponent that round and plays in the next one.`}
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      )}
    </section>
  )
}