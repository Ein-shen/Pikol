/*
 * ====================================================================
 * OVERVIEW
 * ====================================================================
 * Two-stage tournament for pairs of players:
 *
 *   STAGE 1 - "Brackets" (round robin groups)
 *     Teams are split into 1, 2, 3 or 4 groups (see FORMATS). Inside each
 *     group every team plays every other team once. Standings are live.
 *
 *   STAGE 2 - "Playoffs" (single elimination)
 *     When all group matches are scored, the user locks the groups.
 *     The top 2 of each group are seeded into a knockout tree.
 *     The two semi-final LOSERS also play a 3rd-place match.
 *
 *   12 PAIRS = 3 GROUPS (A, B, C) of 4: top 2 of each = 6 teams, seeds 1-2
 *   get a BYE, 2 quarter-finals, then 4 teams in the semi-finals.
 *
 * Scores are saved to the backend through `api` on every change.
 *
 * NEW IN THIS VERSION:
 *   - "Edit Tournament" opens the registration form (Top2_Brackets) in EDIT
 *     mode, pre-filled, so players can be changed and teams added or removed.
 *   - FIX: "Team N" label in GroupCard was wrong for group D and for
 *     2 groups of 5. It now counts from the real position in the list.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Lock, Unlock, Pencil } from 'lucide-react'
import api from '../../api'
// createBracket: builds an empty knockout tree from a list of seeded teams
// applyResults:  fills that tree with scores that were saved earlier
import { createBracket, applyResults } from './Bracket_Single_VIew'

// Route to go back to the list of tournaments
const LIST_ROUTE = '/dashboard/top2dashb'

// Route of the registration form (Top2_Brackets). MUST match your router.
// TODO: change this to the real path of the page that renders <Top2_Brackets />.
const CREATE_ROUTE = '/dashboard/top2'

/* ------------------------------------------------------------------ */
/* Score input helpers                                                 */
/* ------------------------------------------------------------------ */

// Highest score allowed in a match (games are played to 11)
const MAX_SCORE = 11

// Keeps digits only, removes leading zeros, caps at MAX_SCORE.
// Returns '' when empty so the placeholder "-" shows again.
const cleanScore = (value) => {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (digits === '') return ''
  return Number(digits) > MAX_SCORE ? String(MAX_SCORE) : digits
}

/* ------------------------------------------------------------------ */
/* Layout constants for the knockout tree (all values are pixels)      */
/* ------------------------------------------------------------------ */
const CARD_WIDTH = 200
const ROUND_GAP = 56
const ROW_HEIGHT = 150
const HEADER = 40
const LINE_COLOR = '#1ba3c6'
const COLUMN = CARD_WIDTH + ROUND_GAP

// A team's unique id. Saved teams use `pairId`; fall back to `id`.
const teamKey = (t) => (t ? t.pairId ?? t.id : null)

// Shows the two players of a team, e.g. "Ana & Bia"
const pairLabel = (t) => `${t.player1} & ${t.player2}`

// Title above each round column (counted from the END)
function getRoundName(roundIndex, totalRounds) {
  if (roundIndex === totalRounds - 1) return 'Final'
  if (roundIndex === totalRounds - 2) return 'Semi-finals'
  if (roundIndex === totalRounds - 3) return 'Quarter-finals'
  return `Round ${roundIndex + 1}`
}

/* ------------------------------------------------------------------ */
/* Knockout logic                                                      */
/* ------------------------------------------------------------------ */

// Winner of a knockout match, or null if not decided yet.
function getWinner(match) {
  if (!match.team1 || !match.team2) return null
  if (match.score1 === '' || match.score2 === '') return null
  const s1 = Number(match.score1)
  const s2 = Number(match.score2)
  if (s1 === s2) return null
  return s1 > s2 ? match.team1 : match.team2
}

// Recalculates the WHOLE bracket after a score changed (MUTATES the copy it gets).
// Returns `cleared`: matches whose old scores were erased because their teams
// changed, so the caller can delete them on the server too.
function propagate(bracket) {
  const cleared = []
  bracket.forEach((round, r) => {
    round.forEach((item, m) => {
      if (r > 0) {
        const from = (f) => (f ? bracket[f.r][f.m].winner : null)

        if (item.kind === 'wait') {
          // "wait" item = a bye: one feeder, the team just waits
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

// Vertical (y) center of every card in the tree.
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

// The loser of a finished match. Null while there is no winner yet.
function getLoser(match, winner) {
  if (!winner) return null
  return teamKey(winner) === teamKey(match.team1) ? match.team2 : match.team1
}

// A 3rd-place match only exists when the round before the final has 2 real matches.
function hasThirdPlace(bracket) {
  if (bracket.length < 2) return false
  const semis = bracket[bracket.length - 2]
  return semis.length === 2 && semis.every((m) => m.kind !== 'wait')
}

// 3rd-place teams = losers of the two semi-finals (never stored, always derived).
function getThirdPlaceTeams(bracket) {
  if (!hasThirdPlace(bracket)) return [null, null]
  const semis = bracket[bracket.length - 2]
  return semis.map((match) => getLoser(match, match.winner))
}

/* ------------------------------------------------------------------ */
/* Inline styles for the score inputs and names                        */
/* ------------------------------------------------------------------ */

const knockoutScoreBox = {
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

const groupScoreBox = {
  width: 44,
  height: 28,
  borderRadius: 4,
  background: '#f1c84b',
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 600,
  color: '#333',
  border: 'none',
  flexShrink: 0,
}

const nameStyle = (team) => ({
  fontWeight: team ? 600 : 400,
  color: team ? '#222' : '#999',
  borderRadius: 6,
})

/* ------------------------------------------------------------------ */
/* Knockout UI components                                              */
/* ------------------------------------------------------------------ */

// One playoff match: two score inputs on top, team names below.
function MatchCard({ match, onScore }) {
  const { team1, team2 } = match
  const canEnterScore = team1 && team2

  return (
    <div
      className="rounded-md"
      style={{
        width: CARD_WIDTH,
        background: '#fff',
        padding: '10px 8px',
        textAlign: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex justify-center items-center gap-1.5" style={{ margin: '8px 0' }}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          aria-label="Score team 1"
          disabled={!canEnterScore}
          value={match.score1}
          placeholder="-"
          onChange={(e) => onScore('score1', cleanScore(e.target.value))}
          style={knockoutScoreBox}
        />
        <span style={{ color: '#666', fontSize: 12 }}>:</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          aria-label="Score team 2"
          disabled={!canEnterScore}
          value={match.score2}
          placeholder="-"
          onChange={(e) => onScore('score2', cleanScore(e.target.value))}
          style={knockoutScoreBox}
        />
      </div>

      <div className="flex flex-row flex-wrap justify-center rounded-md items-center gap-1 text-[13px]">
        <span style={nameStyle(team1)}>{team1 ? pairLabel(team1) : 'TBD'}</span>
        <span className="text-gray-500">vs</span>
        <span style={nameStyle(team2)}>{team2 ? pairLabel(team2) : 'TBD'}</span>
      </div>
    </div>
  )
}

// Dashed card for a "bye": a team with no opponent this round.
function WaitCard({ item }) {
  return (
    <div
      style={{
        width: CARD_WIDTH,
        background: '#fafafa',
        padding: '8px',
        textAlign: 'center',
        border: '1px dashed #bbb',
        borderRadius: 6,
      }}
    >
      <p className="text-[11px] uppercase tracking-wide text-gray-500">
        (BYE) team waiting for next round
      </p>
      <p className="mt-1 text-[13px]" style={nameStyle(item.team1)}>
        {item.team1 ? pairLabel(item.team1) : 'TBD'}
      </p>
    </div>
  )
}

// Full knockout tree: round titles, connecting lines, cards.
// `thirdPlace` (optional) = { match, onScore } for the 3rd-place match.
function BracketTree({ bracket, onScore, thirdPlace }) {
  if (!bracket.length) return null

  const ys = computeLayout(bracket)
  const width = bracket.length * COLUMN - ROUND_GAP

  const lastCol = (bracket.length - 1) * COLUMN
  const finalY = ys[bracket.length - 1][0]
  const thirdY = finalY + ROW_HEIGHT
  const treeHeight = Math.max(...ys.flat()) + ROW_HEIGHT / 2
  const height = thirdPlace ? Math.max(treeHeight, thirdY + ROW_HEIGHT / 2) : treeHeight

  return (
    <div className="relative shrink-0 rounded-md" style={{ width, height }}>
      {bracket.map((_, r) => (
        <h3
          key={r}
          className="absolute text-center text-xs font-semibold"
          style={{ left: r * COLUMN, top: 0, width: CARD_WIDTH }}
        >
          {getRoundName(r, bracket.length)}
        </h3>
      ))}

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

      <h3
        className="absolute text-center text-xs font-semibold"
        style={{ left: lastCol, top: finalY - 70, width: CARD_WIDTH }}
      >
        Championship
      </h3>

      {thirdPlace && (
        <>
          <h3
            className="absolute text-center text-xs font-semibold"
            style={{ left: lastCol, top: thirdY - 70, width: CARD_WIDTH }}
          >
            Fighting for 3rd
          </h3>
          <div
            className="absolute"
            style={{ left: lastCol, top: thirdY, transform: 'translateY(-50%)' }}
          >
            <MatchCard match={thirdPlace.match} onScore={thirdPlace.onScore} />
          </div>
        </>
      )}
    </div>
  )
}

function PlaceCard({ label, team, icon, featured = false }) {
  return (
    <div className={`w-full text-center space-y-1 ${featured ? 'p-3 sm:p-5' : 'p-2 sm:p-4'}`}>
      {icon}

      <p className={`font-medium text-yellow-800 ${featured ? 'text-sm' : 'text-xs'}`}>
        {label}
      </p>

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

function ChampionBanner({ champion, second, third, showThird }) {
  return (
    <div className="mx-auto w-full rounded-xl border border-yellow-300 bg-yellow-50 p-4 sm:p-6">
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {/* 2nd Place */}
        <div className="flex flex-1 flex-col items-center min-w-0">
          <PlaceCard label="" team={second} />
          <div className="relative flex h-24 w-full max-w-[200px] flex-col items-center justify-center rounded-t-lg border-2 border-gray-400 bg-gradient-to-b from-gray-200 to-gray-400 shadow-lg">
            <span className="text-3xl font-black text-gray-700">2</span>
            <span className="text-xs font-bold text-gray-700">SECOND</span>
          </div>
        </div>

        {/* Champion */}
        <div className="flex flex-1 flex-col items-center min-w-0">
          <PlaceCard featured label="" team={champion} />
          <div className="flex h-36 w-full max-w-[200px]  flex-col items-center justify-center rounded-t-lg border-2 border-yellow-500 bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-xl">
            <span className="text-5xl font-black text-yellow-900">1</span>
            <span className="text-xs sm:text-ms font-black text-yellow-900">CHAMPION</span>
          </div>
        </div>

        {/* 3rd Place */}
        {showThird && (
          <div className="flex flex-1 flex-col items-center min-w-0">
            <PlaceCard label=" " team={third} />
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

/* ------------------------------------------------------------------ */
/* Group stage: splitting teams into groups                            */
/* ------------------------------------------------------------------ */

// The tournament format for each size. The FIRST row that fits is used:
//   - a row with `exact` fits only those pair counts
//   - any other row fits when the pairs are <= `maxPairs`
const FORMATS = [
  // 12 pairs  : 3 groups of 4, top 2 each = 6 teams (2 byes) -> semi-finals
  { exact: [12], groups: ['A', 'B', 'C'], advance: 2 },
  // 2-3 pairs : 1 group, top 2 play the Final
  { maxPairs: 3, groups: ['A'], advance: 2 },
  // 4-5 pairs : 1 group, top 4 -> Semi-finals
  { maxPairs: 5, groups: ['A'], advance: 4 },
  // 6-10 pairs: 2 groups, top 2 each = 4 teams -> Semi-finals
  { maxPairs: 10, groups: ['A', 'B'], advance: 2 },
  // 11+ pairs : 4 groups, top 2 each = 8 teams -> Quarter-finals
  { maxPairs: Infinity, groups: ['A', 'B', 'C', 'D'], advance: 2 },
]

const getFormat = (teamsCount) =>
  FORMATS.find((f) => (f.exact ? f.exact.includes(teamsCount) : teamsCount <= f.maxPairs))

// One-line description of the format (used by the "new tournament" page).
export function getFormatSummary(teamsCount) {
  const f = getFormat(teamsCount)
  const perGroup = Math.ceil(teamsCount / f.groups.length)
  const groupText =
    f.groups.length === 1
      ? 'one group'
      : `${f.groups.length} groups (${f.groups[0]}-${f.groups[f.groups.length - 1]})`
  const qualifiers = f.groups.length * f.advance
  const roundText = {
    2: 'Final',
    4: 'semi-finals',
    6: 'quarter-finals (the 2 best seeds get a bye, so 4 teams reach the semi-finals)',
    8: 'quarter-finals',
  }[qualifiers]
  return `${teamsCount} teams are split into ${groupText}, up to ${perGroup} per group. The top ${qualifiers} qualify for the ${roundText}.`
}

function getGroupNamesForTeams(teamsCount) {
  return getFormat(teamsCount).groups
}

// Which group a team ends up in, from its position in the list (0 = first team).
export function getGroupLabel(index, teamsCount) {
  const names = getGroupNamesForTeams(teamsCount)
  const size = Math.ceil(teamsCount / names.length)
  return names[Math.floor(index / size)]
}

// Cuts the team list into equal slices, one per group.
function splitIntoGroups(teams) {
  const groupNames = getGroupNamesForTeams(teams.length)
  const size = Math.ceil(teams.length / groupNames.length)

  return groupNames.map((name, g) => ({
    name,
    teams: teams.slice(g * size, (g + 1) * size),
  }))
}

// Circle-method round robin: every team plays every other team once.
function roundRobin(teams) {
  const list = [...teams]
  if (list.length % 2) list.push(null)
  const n = list.length
  const rounds = []
  for (let r = 0; r < n - 1; r++) {
    const games = []
    for (let i = 0; i < n / 2; i++) {
      const a = list[i]
      const b = list[n - 1 - i]
      if (a && b) games.push([a, b])
    }
    rounds.push(games)
    list.splice(1, 0, list.pop())
  }
  return rounds
}

// Turns a group into a flat list of match objects with unique ids
function buildGroupMatches(group) {
  return roundRobin(group.teams).flatMap((games, r) =>
    games.map(([team1, team2]) => ({
      id: `${group.name}-${team1.id}-${team2.id}`,
      group: group.name,
      round: r + 1,
      team1,
      team2,
    }))
  )
}

// Result of a group match, or null if not finished (empty box or a tie).
function getResult(match, scores) {
  const s = scores[match.id]
  if (!s || s.score1 === '' || s.score2 === '') return null
  const score1 = Number(s.score1)
  const score2 = Number(s.score2)
  if (score1 === score2) return null
  return { score1, score2, winner: score1 > score2 ? match.team1 : match.team2 }
}

// Ranking rule (also used to rank teams ACROSS groups for playoff seeds):
//  1. most wins  2. best point difference  3. most points  4. team name A-Z
const compareRows = (x, y) =>
  y.wins - x.wins ||
  y.pf - y.pa - (x.pf - x.pa) ||
  y.pf - x.pf ||
  x.team.name.localeCompare(y.team.name, undefined, { numeric: true })

// Standings table of ONE group.
function computeStandings(group, matches, scores) {
  const rows = Object.fromEntries(
    group.teams.map((t) => [t.id, { team: t, played: 0, wins: 0, losses: 0, pf: 0, pa: 0 }])
  )

  matches.forEach((m) => {
    const res = getResult(m, scores)
    if (!res) return
    const a = rows[m.team1.id]
    const b = rows[m.team2.id]
    a.played++
    b.played++
    a.pf += res.score1
    a.pa += res.score2
    b.pf += res.score2
    b.pa += res.score1
    if (res.winner.id === m.team1.id) {
      a.wins++
      b.losses++
    } else {
      b.wins++
      a.losses++
    }
  })

  return Object.values(rows).sort(compareRows)
}

// Standings for ALL groups: { A: [...rows], B: [...rows], ... }
const standingsFor = (groups, matchesByGroup, scores) =>
  Object.fromEntries(
    groups.map((g) => [g.name, computeStandings(g, matchesByGroup[g.name], scores)])
  )

// Picks the playoff teams and puts them in bracket order.
// (Only for 1, 2 and 4 groups. 3 groups use createThreeGroupBracket.)
function seedQualifiers(standingsByGroup) {
  const groupNames = Object.keys(standingsByGroup)

  if (groupNames.length === 1) {
    const T = standingsByGroup['A'].map((r) => r.team)
    if (T.length >= 4) return [T[0], T[3], T[1], T[2]]
    return [T[0], T[1]]
  }

  if (groupNames.length === 2) {
    const A = standingsByGroup['A'].map((r) => r.team)
    const B = standingsByGroup['B'].map((r) => r.team)
    return [A[0] || null, B[1] || null, B[0] || null, A[1] || null]
  }

  const A = standingsByGroup['A'].map((r) => r.team)
  const B = standingsByGroup['B'].map((r) => r.team)
  const C = standingsByGroup['C'].map((r) => r.team)
  const D = standingsByGroup['D'].map((r) => r.team)

  return [
    A[0] || null, B[1] || null, C[0] || null, D[1] || null,
    B[0] || null, A[1] || null, D[0] || null, C[1] || null,
  ]
}

/* ------------------------------------------------------------------ */
/* 3-group playoff (12 pairs): 6 teams, seeds 1-2 have a bye          */
/* ------------------------------------------------------------------ */

// Seeds 1-3 = group winners, seeds 4-6 = runners-up (ranked with compareRows).
//   Upper:  seed 1 (bye) + 4 vs 5  -> Semi 1
//   Lower:  seed 2 (bye) + 3 vs 6  -> Semi 2
// If 3 vs 6 / 4 vs 5 would be two teams of the same group, seeds 5 and 6 swap.
function createThreeGroupBracket(standingsByGroup) {
  const names = Object.keys(standingsByGroup)
  const tier = (rank) =>
    names
      .map((n) => standingsByGroup[n][rank])
      .filter(Boolean)
      .sort(compareRows)
      .map((row) => row.team)
  const seeds = [...tier(0), ...tier(1)]

  const groupOf = {}
  names.forEach((n) => standingsByGroup[n].forEach((r) => (groupOf[r.team.id] = n)))
  const sameGroup = (a, b) => !!a && !!b && groupOf[a.id] === groupOf[b.id]
  const clashes = (q) =>
    [[3, 6], [4, 5]].filter(([x, y]) => sameGroup(q[x - 1], q[y - 1])).length
  const swapped = seeds.slice()
  ;[swapped[4], swapped[5]] = [swapped[5], swapped[4]]
  const order = [seeds, swapped].find((q) => clashes(q) === 0) || seeds
  const S = (n) => order[n - 1] || null

  const blank = { team1: null, team2: null, score1: '', score2: '', winner: null }
  const bye = (id, team) => ({ ...blank, id, kind: 'wait', feeds: [], team1: team, winner: team })
  const match = (id, feeds, team1 = null, team2 = null) => ({
    ...blank,
    id,
    kind: 'match',
    feeds,
    team1,
    team2,
  })

  const bracket = [
    [
      bye('r0-m0', S(1)),
      match('r0-m1', [], S(4), S(5)),
      bye('r0-m2', S(2)),
      match('r0-m3', [], S(3), S(6)),
    ],
    [
      match('r1-m0', [{ r: 0, m: 0 }, { r: 0, m: 1 }]),
      match('r1-m1', [{ r: 0, m: 2 }, { r: 0, m: 3 }]),
    ],
    [match('r2-m0', [{ r: 1, m: 0 }, { r: 1, m: 1 }])],
  ]

  propagate(bracket)
  return bracket
}

// Fills a fresh 3-group tree with scores saved on the server.
function applyThreeGroupResults(bracket, results) {
  const next = bracket.map((round) => round.map((item) => ({ ...item })))
  next.forEach((round, r) => {
    propagate(next)
    results
      .filter((x) => x.round === r + 1)
      .forEach((x) => {
        const item = round[x.matchNumber - 1]
        if (!item || item.kind === 'wait' || !item.team1 || !item.team2) return
        const same = x.pair1Id === teamKey(item.team1)
        item.score1 = String(same ? x.score1 : x.score2)
        item.score2 = String(same ? x.score2 : x.score1)
      })
  })
  propagate(next)
  return next
}

// Builds the right empty knockout tree for the number of groups
function createPlayoffBracket(standingsByGroup) {
  return Object.keys(standingsByGroup).length === 3
    ? createThreeGroupBracket(standingsByGroup)
    : createBracket(seedQualifiers(standingsByGroup))
}

// Rebuilds the knockout tree and refills it with the scores saved earlier
function restorePlayoffBracket(standingsByGroup, savedKnockout) {
  const fresh = createPlayoffBracket(standingsByGroup)
  // The saved 3rd-place match is stored as round = (number of rounds + 1)
  const treeResults = savedKnockout.filter((x) => x.round <= fresh.length)
  return Object.keys(standingsByGroup).length === 3
    ? applyThreeGroupResults(fresh, treeResults)
    : applyResults(fresh, treeResults)
}

// Converts saved group scores to the local `scores` format.
function restoreScores(matchesByGroup, saved) {
  const out = {}
  Object.values(matchesByGroup)
    .flat()
    .forEach((m) => {
      const s = saved.find(
        (x) =>
          x.group === m.group &&
          ((x.pair1Id === m.team1.pairId && x.pair2Id === m.team2.pairId) ||
            (x.pair1Id === m.team2.pairId && x.pair2Id === m.team1.pairId))
      )
      if (!s) return
      const same = s.pair1Id === m.team1.pairId
      out[m.id] = {
        score1: String(same ? s.score1 : s.score2),
        score2: String(same ? s.score2 : s.score1),
      }
    })
  return out
}

/* ------------------------------------------------------------------ */
/* Standings legend                                                    */
/* ------------------------------------------------------------------ */
const STANDINGS_LEGEND = [
  { abbr: 'W', label: 'Wins', text: 'Matches won.' },
  { abbr: 'L', label: 'Losses', text: 'Matches lost.' },
  { abbr: 'GP', label: 'Game Played', text: 'Total matches completed.' },
  { abbr: 'TP', label: 'Total Points', text: 'Total points scored.' },
  { abbr: 'PA', label: 'Points Against', text: 'Total points scored by opponents.' },
  { abbr: '+/-', label: 'Difference', text: 'Points For minus Points Against.' },
]

/* ------------------------------------------------------------------ */
/* GroupCard: UI for one group (standings table + list of matches)     */
/* ------------------------------------------------------------------ */
// `advance`    = how many teams of this group go to the playoffs (bold rows)
// `teamOffset` = how many teams are in the groups before this one (for "Team N")
function GroupCard({ group, matches, standings, scores, locked, onScore, advance, teamOffset }) {
  return (
    <div className="theme-card rounded-xl border theme-border p-4 space-y-4">
      <h3 className="text-lg font-bold flex flex-wrap gap-2 justify-between items-center w-full">
        Bracket {group.name}
        <p className="text-xs text-right theme-muted">Top {advance} (bold) advance to the playoffs.</p>
      </h3>

      {/* Standings table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-sm">
          <thead>
            <tr className="text-left text-xs theme-muted">
              <th className="py-1">Rank</th>
              <th>Team</th>
              {/* W = Wins */}
              <th className="text-center">W</th>
              {/* L = Losses */}
              <th className="text-center">L</th>
              {/* GP = Games Played */}
              <th className="text-center">GP</th>
              {/* TP = Total Points */}
              <th className="text-center">TP</th>
              {/* PA = Points Against */}
              <th className="text-center">PA</th>
              {/* +/- = Point difference */}
              <th className="text-center">+/-</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr
                key={row.team.id}
                className={`border-b border-t theme-border space-y-1 ${
                  i < advance ? 'font-semibold' : 'opacity-70'
                }`}
              >
                <td className="py-3 pr-3 align-top text-sm">{i + 1}</td>
                <td className="py-3 align-top border-b zzzzzzborder-white/10 theme-border">
                  <div className="text-sm capitalize">{pairLabel(row.team)}</div>
                  <div className="mt-0.5 text-xs font-normal capitalize theme-muted">
                    {row.team.name} 
                  </div>
                </td>
                <td className="text-center">{row.wins}</td>
                <td className="text-center">{row.losses}</td>
                <td className="text-center">{row.played}</td>
                <td className="text-center">{row.pf}</td>
                <td className="text-center">{row.pa}</td>
                <td className="text-center">{row.pf - row.pa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Teams list + round robin matches */}
      <div className="flex flex-col sm:flex-row w-full gap-4 sm:gap-2">
        <div className="flex flex-col items-center w-full sm:w-auto min-w-[120px]">
          <h1 className="font-bold mb-1">List of teams</h1>

          <span className="text-xs theme-muted mb-4">Bracket {group.name}</span>

          {group.teams.map((team, index) => (
            <div key={team.id} className="w-full py-1">
              <div className="font-semibold text-center text-sm">{pairLabel(team)}</div>
              {/* FIXED: counts from the real position (old code broke for group D) */}
              <div className="text-xs text-center theme-muted mt-1">
                Team  {teamOffset + index + 1}
              </div>
            </div>
          ))}
        </div>

        <span className="hidden sm:block border-r border-white/10"> </span>

        <div className="w-full min-w-0 flex flex-col space-y-2 items-center">
          <span className="flex items-center text-center font-bold pb-2">Round Robin</span>

          {matches.map((m) => {
            const s = scores[m.id] || { score1: '', score2: '' }

            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-1 sm:gap-2 w-full text-[13px]"
              >
                {/* Team 1 */}
                <span className="min-w-0 flex-1 text-right break-words leading-tight">
                  <span className="flex flex-row flex-wrap items-baseline justify-end gap-x-1 sm:flex-col sm:items-end">
                    <span className="font-semibold">{m.team1.name}</span>
                    <span className="text-xs capitalize theme-muted">
                      ({pairLabel(m.team1)})
                    </span>
                  </span>
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  disabled={locked}
                  placeholder="-"
                  value={s.score1}
                  style={groupScoreBox}
                  aria-label={`${m.team1.name} score`}
                  onChange={(e) => onScore(m, 'score1', cleanScore(e.target.value))}
                />

                <span className="font-bold">:</span>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  disabled={locked}
                  placeholder="-"
                  value={s.score2}
                  style={groupScoreBox}
                  aria-label={`${m.team2.name} score`}
                  onChange={(e) => onScore(m, 'score2', cleanScore(e.target.value))}
                />

                {/* Team 2 */}
                <span className="min-w-0 flex-1 break-words leading-tight">
                  <span className="flex flex-row flex-wrap items-baseline gap-x-1 sm:flex-col sm:items-start">
                    <span className="font-semibold">{m.team2.name}</span>
                    <span className="text-xs capitalize theme-muted">
                      ({pairLabel(m.team2)})
                    </span>
                  </span>
                </span>
                
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Top2_View: the main component. Holds all the state and logic.       */
/* ------------------------------------------------------------------ */
export function Top2_View({
  tournamentId,
  tournamentName,
  teams,
  savedGroupMatches = [],
  savedKnockout = [],
  onReset,
}) {
  const navigate = useNavigate()

  // ---- Derived data ----
  // A team still carrying an auto name ("Team 2") is renamed from its position,
  // so groups always show Team 1-4, Team 5-8 ... Custom names are kept.
  const numberedTeams = useMemo(
    () =>
      teams.map((t, i) =>
        /^team\s*\d+$/i.test((t.name || '').trim()) ? { ...t, name: `Team ${i + 1}` } : t
      ),
    [teams]
  )
  const groups = useMemo(() => splitIntoGroups(numberedTeams), [numberedTeams])
  const groupMatches = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.name, buildGroupMatches(g)])),
    [groups]
  )
  const initialScores = useMemo(
    () => restoreScores(groupMatches, savedGroupMatches),
    [groupMatches, savedGroupMatches]
  )

  // ---- State ----
  const [scores, setScores] = useState(initialScores)

  const [bracket, setBracket] = useState(() => {
    if (!savedKnockout.length) return null
    const st = standingsFor(groups, groupMatches, initialScores)
    return restorePlayoffBracket(st, savedKnockout)
  })

  const [champion, setChampion] = useState(
    () => bracket?.[bracket.length - 1]?.[0]?.winner ?? null
  )

  const [thirdScores, setThirdScores] = useState(() => {
    const empty = { score1: '', score2: '' }
    if (!bracket) return empty
    const saved = savedKnockout.find((x) => x.round === bracket.length + 1)
    if (!saved) return empty
    const [t1] = getThirdPlaceTeams(bracket)
    const same = saved.pair1Id === teamKey(t1)
    return {
      score1: String(same ? saved.score1 : saved.score2),
      score2: String(same ? saved.score2 : saved.score1),
    }
  })

  const [error, setError] = useState('')

  const base = `/top2/${tournamentId}`

  const standings = useMemo(
    () => standingsFor(groups, groupMatches, scores),
    [groups, groupMatches, scores]
  )

  // ---- Progress info ----
  const allMatches = Object.values(groupMatches).flat()
  const doneCount = allMatches.filter((m) => getResult(m, scores)).length
  const groupsDone = doneCount === allMatches.length
  const locked = !!bracket
  const advance = getFormat(teams.length).advance

  // ---- 3rd place match (derived from the bracket) ----
  const showThird = !!bracket && hasThirdPlace(bracket)
  const thirdTeams = useMemo(
    () => (bracket ? getThirdPlaceTeams(bracket) : [null, null]),
    [bracket]
  )
  const thirdMatch = { team1: thirdTeams[0], team2: thirdTeams[1], ...thirdScores }
  const thirdWinner = getWinner(thirdMatch)

  // ---- Final ranking ----
  const finalMatch = bracket ? bracket[bracket.length - 1][0] : null
  const runnerUp = finalMatch ? getLoser(finalMatch, champion) : null

  // ---- Handlers ----

  // A score box in a GROUP match changed
  const updateGroupScore = (match, key, value) => {
    const hadResult = !!getResult(match, scores)

    const next = {
      ...scores,
      [match.id]: { ...(scores[match.id] || { score1: '', score2: '' }), [key]: value },
    }
    setScores(next)

    const res = getResult(match, next)
    const ids = { group: match.group, pair1Id: match.team1.pairId, pair2Id: match.team2.pairId }

    if (res) {
      api
        .put(`${base}/group-matches`, {
          ...ids,
          score1: res.score1,
          score2: res.score2,
          winnerPairId: res.winner.pairId,
        })
        .catch(() => setError('Could not save the score.'))
    } else if (hadResult) {
      api
        .delete(`${base}/group-matches`, { data: ids })
        .catch(() => setError('Could not clear the score.'))
    }
  }

  // "Lock brackets" button
  const startKnockout = () => {
    setBracket(createPlayoffBracket(standings))
    setChampion(null)
    setThirdScores({ score1: '', score2: '' })
  }

  // "Unlock brackets" button
  const unlockGroups = () => {
    if (!window.confirm('Unlock the brackets? Playoff scores will be cleared.')) return
    api.delete(`${base}/matches`).catch(() => setError('Could not clear playoff scores.'))
    setBracket(null)
    setChampion(null)
    setThirdScores({ score1: '', score2: '' })
  }

  // A score box in a PLAYOFF match changed (r = round index, m = match index)
  const updateKnockoutScore = (r, m, key, value) => {
    const next = bracket.map((round) => round.map((item) => ({ ...item })))
    const item = next[r][m]

    const before = teamKey(item.winner)
    item[key] = value
    const cleared = propagate(next)
    const after = teamKey(item.winner)

    // If a semi-final result changed, the 3rd-place teams may have changed too
    const newThird = getThirdPlaceTeams(next)
    const thirdChanged =
      teamKey(newThird[0]) !== teamKey(thirdTeams[0]) ||
      teamKey(newThird[1]) !== teamKey(thirdTeams[1])
    if (thirdChanged && (thirdScores.score1 !== '' || thirdScores.score2 !== '')) {
      setThirdScores({ score1: '', score2: '' })
      api
        .delete(`${base}/matches/${bracket.length + 1}/1`)
        .catch(() => setError('Could not clear the 3rd place score.'))
    }

    setBracket(next)
    setChampion(next[next.length - 1][0].winner || null)

    if (item.winner) {
      api
        .put(`${base}/matches`, {
          round: r + 1,
          matchNumber: m + 1,
          pair1Id: item.team1.pairId,
          pair2Id: item.team2.pairId,
          score1: Number(item.score1),
          score2: Number(item.score2),
          winnerPairId: item.winner.pairId,
        })
        .catch(() => setError('Could not save the score.'))
    } else if (before !== after) {
      api
        .delete(`${base}/matches/${r + 1}/${m + 1}`)
        .catch(() => setError('Could not clear the score.'))
    }

    cleared.forEach((c) =>
      api
        .delete(`${base}/matches/${c.round}/${c.matchNumber}`)
        .catch(() => setError('Could not clear a later score.'))
    )
  }

  // A score box in the 3rd-place match changed
  const updateThirdScore = (key, value) => {
    const nextScores = { ...thirdScores, [key]: value }
    setThirdScores(nextScores)

    const hadWinner = !!getWinner(thirdMatch)
    const match = { ...thirdMatch, ...nextScores }
    const winner = getWinner(match)
    const round = bracket.length + 1

    if (winner) {
      api
        .put(`${base}/matches`, {
          round,
          matchNumber: 1,
          pair1Id: match.team1.pairId,
          pair2Id: match.team2.pairId,
          score1: Number(match.score1),
          score2: Number(match.score2),
          winnerPairId: winner.pairId,
        })
        .catch(() => setError('Could not save the 3rd place score.'))
    } else if (hadWinner) {
      api
        .delete(`${base}/matches/${round}/1`)
        .catch(() => setError('Could not clear the 3rd place score.'))
    }
  }

  // ---- Render ----
  return (
    <section className="space-y-5  animate-fade-in animation-delay-100">
      {/* Header: tournament name, summary line and edit button */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border theme-muted p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="break-words text-xl font-bold capitalize">{tournamentName}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {teams.length} teams · {groups.length} {groups.length === 1 ? 'Bracket' : 'Brackets'} of{' '}
            {Math.ceil(teams.length / groups.length)} · Group matches {doneCount}/{allMatches.length}
          </p>
        </div>

        <div className="flex w-full flex-row flex-wrap justify-end gap-2">
          {/* Opens the registration form, pre-filled, so teams can be changed, added or removed */}
          <button
            onClick={() =>
              navigate(CREATE_ROUTE, {
                state: { edit: true, tournamentId, tournamentName, teams },
              })
            }
            className="flex items-center gap-2   rounded-lg px-3 py-2 font-semibold text-sm theme-border theme-hover theme-accent"
          >
            <Pencil size={16} /> Edit Tournament
          </button>
        </div>
      </div>

      {/* Champion banner (only when the final is decided) */}
      {champion && (
        <ChampionBanner
          champion={champion}
          second={runnerUp}
          third={thirdWinner}
          showThird={showThird}
        />
      )}

      {/* Legend */}
      <div className="border theme-border rounded-xl w-full">
        <h3 className="px-4 pt-3 font-bold text-sm sm:text-base">Standings key</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 justify-items-center">
          {STANDINGS_LEGEND.map(({ abbr, label }) => (
            <div key={abbr} className="min-w-0 flex flex-col items-center gap-1 text-center">
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-mono font-bold text-[#A8D38D]">{abbr}</span>
                <span>-</span>
                <span className="font-bold text-xs sm:text-sm">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Bracket Stage (Round Robin)</h3>
      </div>

      {/* One card per group */}
      <div
        className={`grid gap-4 ${groups.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}
      >
        {groups.map((g, gi) => (
          <GroupCard
            key={g.name}
            group={g}
            matches={groupMatches[g.name]}
            standings={standings[g.name]}
            scores={scores}
            locked={locked}
            onScore={updateGroupScore}
            advance={advance}
            teamOffset={groups.slice(0, gi).reduce((n, x) => n + x.teams.length, 0)}
          />
        ))}
      </div>

      {/* Lock / Unlock + hint */}
      <div className="flex items-center gap-3 py-4">
        {!locked ? (
          <>
            <button
              disabled={!groupsDone}
              onClick={startKnockout}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold theme-accent disabled:opacity-40"
            >
              <Lock size={16} /> Lock brackets
            </button>

            {groupsDone ? (
              <span className="text-sm text-green-600">
                Playoff is now ready. Click "Lock brackets".
              </span>
            ) : (
              <span className="text-sm opacity-70">
                Complete the scoring to proceed to the playoffs.
              </span>
            )}
          </>
        ) : (
          <button
            onClick={unlockGroups}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm theme-border theme-hover"
          >
            <Unlock size={16} /> Unlock brackets
          </button>
        )}
      </div>

      {/* Playoff tree (only after the groups were locked) */}
      {bracket && (
        <>
          <h3 className="text-lg pt-6 sm:pt-10 font-bold">Playoffs (Single Elimination)</h3>
          {groups.length === 3 && (
            <p className="text-md theme-muted flex flex-col gap-3">
              Playoffs Format:
              <span>- The top 2 teams from each bracket A, B, & C (6 teams total) advance to the playoffs.</span>
              <span>- The 4 lower-ranked qualifiers compete in the Quarterfinals ( Lower Brackets ).</span>
              <span>
                - The top-ranked teams from Brackets A, B, and C will be compared (Point system) based on their group-stage performance. The two best-performing teams will be awarded BYEs in the bracket below (Semi-final).
              </span>
            </p>
          )}
          <div className="overflow-x-auto rounded-xl p-3 sm:p-6 theme-accent">
            <BracketTree
              bracket={bracket}
              onScore={updateKnockoutScore}
              thirdPlace={showThird ? { match: thirdMatch, onScore: updateThirdScore } : null}
            />
          </div>
        </>
      )}

      {/* API error message */}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Top2_bracketing_e: the page component (used by the router).         */
/* Loads the tournament from the API and hands it to Top2_View.        */
/* ------------------------------------------------------------------ */
export const Top2_bracketing_e = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    api
      .get(`/top2/${id}`)
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [id])

  // Deletes the whole tournament (after confirmation) and goes back to the list
  const handleReset = async () => {
    if (!window.confirm('Reset this tournament? All scores will be lost.')) return
    try {
      await api.delete(`/top2/${id}`)
    } catch {
      // Ignore errors: we navigate away either way
    }
    navigate(LIST_ROUTE)
  }

  if (status === 'loading') return <p className="px-4 sm:px-10 theme-muted">Loading tournament...</p>

  if (status === 'error' || !data || data.teams.length < 2) {
    return (
      <div className="w-full space-y-4 px-4 sm:px-10">
        <p className="theme-muted">Could not load this tournament.</p>
        <button
          onClick={() => navigate(LIST_ROUTE)}
          className="rounded-lg border theme-border theme-hover px-4 py-2"
        >
          Back to Tournaments
        </button>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-10">
      {/* key={id} makes React rebuild Top2_View from scratch for a different tournament */}
      <Top2_View
        key={id}
        tournamentId={data.id}
        tournamentName={data.name}
        teams={data.teams}
        savedGroupMatches={data.groupMatches}
        savedKnockout={data.matches}
        onReset={handleReset}
      />
    </div>
  )
}

// Backwards-compatible alias: Top2_Dashb.jsx still imports { Quadro_View }.
export const Quadro_View = Top2_View