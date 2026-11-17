import React, { useState } from 'react'
import { Trophy, RotateCcw, Pencil } from 'lucide-react'
import api from '../../api'

/* ------------------------------------------------------------------ */
/* Layout constants                                                    */
/* ------------------------------------------------------------------ */
const CARD_WIDTH = 200
const ROUND_GAP = 56
const ROW_HEIGHT = 150
const HEADER = 40
const LINE_COLOR = '#1ba3c6'
const COLUMN = CARD_WIDTH + ROUND_GAP

// Highest score allowed in a match (same as the other formats)
const MAX_SCORE = 11

// Cleans what the user types into a score box (digits only, no leading
// zeros, capped at MAX_SCORE). Returns '' when empty.
const cleanScore = (value) => {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (digits === '') return ''
  return Number(digits) > MAX_SCORE ? String(MAX_SCORE) : digits
}

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
  if (roundIndex === totalRounds - 3) return 'Quarter-finals'
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

// The loser of a finished match (null while there is no winner yet).
function getLoser(match, winner) {
  if (!winner) return null
  return teamKey(winner) === teamKey(match.team1) ? match.team2 : match.team1
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

// Put saved scores back onto a freshly built bracket.
// The server may have stored the two teams in the opposite order, so the
// scores are swapped when needed (rows without pair ids are used as-is).
export function applyResults(bracket, matches) {
  bracket.forEach((round, r) => {
    matches
      .filter((saved) => saved.round === r + 1)
      .forEach((saved) => {
        const item = round[saved.matchNumber - 1]
        if (!item || item.kind !== 'match' || !item.team1 || !item.team2) return

        const same = saved.pair1Id == null || saved.pair1Id === teamKey(item.team1)
        item.score1 = String(same ? saved.score1 : saved.score2)
        item.score2 = String(same ? saved.score2 : saved.score1)
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
          type="text" inputMode="numeric" maxLength={2} aria-label="Score team 1"
          disabled={!canEnterScore} value={match.score1} placeholder="-"
          onChange={(e) => onScore('score1', cleanScore(e.target.value))}
          style={scoreBoxStyle}
        />
        <span style={{ color: '#666', fontSize: 12 }}>:</span>
        <input
          type="text" inputMode="numeric" maxLength={2} aria-label="Score team 2"
          disabled={!canEnterScore} value={match.score2} placeholder="-"
          onChange={(e) => onScore('score2', cleanScore(e.target.value))}
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

// Every card is w-full, so the champion card and the runner-up card
// always have the same width at any screen size.
function PlaceCard({ label, team, icon, featured = false }) {
  return (
    <div
      // RESPONSIVE: smaller padding on phones
      className={`w-full text-center space-y-1 ${
        featured ? 'p-3 sm:p-5' : 'p-2 sm:p-4'
      }`}
    >
      {icon}

      <p className={`font-medium text-yellow-800 ${featured ? 'text-sm' : 'text-xs'}`}>
        {label}
      </p>

      {/* RESPONSIVE: smaller text on phones + break-words so long names wrap */}
      <p
        className={`break-words font-bold capitalize text-black ${
          featured ? 'text-base sm:text-xl' : 'text-sm sm:text-base'
        }`}
      >
        {team ? pairLabel(team) : ''}
      </p>

      <p
        className={`mt-1 break-words ${
          featured ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
        } ${team ? 'text-gray-900' : 'text-gray-400'}`}
      >
        {team ? team.name : 'TBD'}
      </p>
    </div>
  )
}

function ChampionBanner({ champion, runnerUp, third, showThird = false }) {
  return (
    <div className="mx-auto w-full rounded-xl border border-yellow-300 bg-yellow-50 p-4 sm:p-6">
      <div className="flex items-end justify-center gap-2 sm:gap-4">


        {/* Champion */}
        <div className="flex flex-1 flex-col items-center min-w-0">
          <PlaceCard featured label="" team={champion} />

          <div className="flex h-36 w-full max-w-[200px] flex-col items-center justify-center rounded-t-lg border-2 border-yellow-500 bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-xl">
            <span className="text-5xl font-black text-yellow-900">1</span>
            <span className="text-sm font-black text-yellow-900">CHAMPION</span>
          </div>
        </div>
 
        {/* 2nd Place */}
        <div className="flex flex-1 flex-col items-center min-w-0">
          <PlaceCard label="" team={runnerUp} />

          <div className="relative flex h-24 w-full max-w-[200px] flex-col items-center justify-center rounded-t-lg border-2 border-gray-400 bg-gradient-to-b from-gray-200 to-gray-400 shadow-lg">
            <span className="text-3xl font-black text-gray-700">2</span>
            <span className="text-xs font-bold text-gray-700">SECOND</span>
          </div>
        </div>

        
        {/* 3rd Place */}
        {showThird && (
          <div className="flex flex-1 flex-col items-center min-w-0">
            <PlaceCard label="" team={third} />

            <div className="flex h-16 w-full max-w-[200px] flex-col items-center justify-center rounded-t-lg border-2 border-orange-500 bg-gradient-to-b from-orange-300 to-orange-500 shadow-lg">
              <span className="text-2xl font-black text-orange-900">3</span>
              <span className="text-xs font-bold text-orange-900">THIRD</span>
            </div>
          </div>
        )}

      </div>
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
  // Rebuild from the teams if the incoming bracket is from an older version
  const [bracket, setBracket] = useState(() =>
    isValidBracket(initialBracket) ? initialBracket : createBracket(teams)
  )
  const [champion, setChampion] = useState(
    () => bracket[bracket.length - 1]?.[0]?.winner ?? null
  )
  const [error, setError] = useState('')

  const hasWaiting = bracket.some((round, r) => r > 0 && round.some((i) => i.kind === 'wait'))

  // Runner-up = the loser of the final
  const finalMatch = bracket[bracket.length - 1]?.[0]
  const runnerUp = finalMatch ? getLoser(finalMatch, champion) : null

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
          onClick={"onReset"}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm theme-border theme-hover theme-accent"
          >
            <Pencil size={16} /> Edit Tournament
          </button>
      </div>

      {champion && <ChampionBanner champion={champion} runnerUp={runnerUp} />}

      <div className="overflow-x-auto rounded-xl p-6 theme-accent">
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