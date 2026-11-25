/*
 * ====================================================================
 * OVERVIEW
 * ====================================================================
 * Same idea as Bracket_quadro_e.jsx, but the TOP 3 of each group advance.
 * Works exactly like Top2_bracketing_e.jsx (same FORMATS idea, same screens),
 * with ONE difference: the TOP 3 of EVERY group always qualify.
 *
 *   Groups by team count (equal slices, the last group may be smaller):
 *     6-11, 13-15 teams : 2 groups (A, B)   -> 6 qualifiers
 *     12 teams          : 3 groups (A, B, C) -> 9 qualifiers
 *     16+ teams         : 4 groups (A-D)     -> 12 qualifiers
 *
 *   Playoff trees (single elimination, ranked seeds: all group winners first,
 *   then the runners-up, then the third places):
 *     6 qualifiers  : seeds 1-2 (group winners) have a bye
 *                     QF: B2 v A3, A2 v B3 -> semi-finals -> final
 *     9 qualifiers  : play-in 8 v 9, then QF: 1 v W(8/9), 4 v 5, 3 v 6, 2 v 7
 *     12 qualifiers : first round 8 v 9, 5 v 12, 6 v 11, 7 v 10
 *                     (the 4 group winners have a bye), then
 *                     QF: 1 v W(8/9), 4 v W(5/12), 2 v W(7/10), 3 v W(6/11)
 *   After the semi-finals: final + 3rd-place match (losers of the semi-finals).
 *
 *   ELIMINATION RULE: a team that reaches 3 losses in its group is out.
 *   Its row turns red, and its remaining (unscored) group matches are
 *   cancelled, so the other teams do not have to play it. Eliminated
 *   teams are ranked below the teams that are still alive.
 *
 *   With 6 teams (3 + 3) every team qualifies, so the group stage only
 *   decides seeding and byes.
 *
 * Scores are saved to the backend through `api` on every change.
 *
 * Unlike the quadro file, this file builds its own knockout tree
 * (createTop3Bracket / applyResults), so it does not need Bracket_Single_VIew.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RotateCcw, Lock, Unlock } from 'lucide-react'
import api from '../../api'

// Route to go back to the list of tournaments
const LIST_ROUTE = '/dashboard/top3dashb'

/* ------------------------------------------------------------------ */
/* Format: 2 groups, top 3 of each go to the playoffs                  */
/* ------------------------------------------------------------------ */
const ADVANCE = 3 // teams of EACH group that qualify (Top 3: ALWAYS 3)
const MIN_TEAMS = 6 // smallest tournament: 2 groups of 3
const ELIMINATION_LOSSES = 3 // a team with this many losses is out of the group stage

// Group format for each team count (same idea as FORMATS in Top2_bracketing_e.jsx).
// The FIRST row that fits is used:
//   exact    = only these team counts
//   maxPairs = up to this many teams
//   groups   = group letters (how many round-robin groups there are)
// Every group sends its top ADVANCE (3) teams to the playoffs.
const FORMATS = [
  // 12 teams  : 3 groups of 4 -> 9 qualifiers (play-in + quarter-finals)
  { exact: [12], groups: ['A', 'B', 'C'] },
  // 6-15 teams: 2 groups -> 6 qualifiers (the 2 group winners get a bye)
  { maxPairs: 15, groups: ['A', 'B'] },
  // 16+ teams : 4 groups -> 12 qualifiers (the 4 group winners get a bye)
  { maxPairs: Infinity, groups: ['A', 'B', 'C', 'D'] },
]

const getFormat = (teamsCount) =>
  FORMATS.find((f) => (f.exact ? f.exact.includes(teamsCount) : teamsCount <= f.maxPairs))

// Which group letters to use for this many teams
function getGroupNamesForTeams(teamsCount) {
  return getFormat(teamsCount).groups
}

// Cuts the team list into equal slices, one per group (the last group may be smaller).
// Example: 15 teams, 2 groups -> size 8 -> A = 8 teams, B = 7 teams.
function getGroupSizes(teamsCount) {
  const names = getGroupNamesForTeams(teamsCount)
  const size = Math.ceil(teamsCount / names.length)
  return names.map((_, g) => Math.max(0, Math.min(size, teamsCount - g * size)))
}

// One-line description of the format, used by the registration page
export function getFormatSummary(teamsCount) {
  const names = getGroupNamesForTeams(teamsCount)
  const sizes = getGroupSizes(teamsCount)
  const sizeText = sizes.every((n) => n === sizes[0])
    ? `${sizes[0]} per group`
    : sizes.map((n, g) => `${n} in Group ${names[g]}`).join(', ')
  const groupText = `${names.length} groups (${names[0]}-${names[names.length - 1]})`
  const qualifiers = names.length * ADVANCE

  const qualifyText =
    teamsCount <= qualifiers
      ? 'All teams qualify, so the group stage decides seeding and byes.'
      : `The top 3 of each group (${qualifiers} teams) qualify.`

  const playoffText = {
    6: 'The two group winners get a bye to the semi-finals.',
    9: 'The two lowest seeds play one play-in match for the last quarter-final spot.',
    12: 'The 4 group winners get a bye to the quarter-finals.',
  }[qualifiers]

  return `${teamsCount} teams are split into ${groupText}, ${sizeText}. ${qualifyText} ${playoffText}`
}

// Which group a team ends up in, from its position in the team list (0 = first team).
// Uses the same slicing as splitIntoGroups(), so the registration form always matches.
export function getGroupLabel(index, teamsCount) {
  const names = getGroupNamesForTeams(teamsCount)
  const size = Math.ceil(teamsCount / names.length)
  return names[Math.min(Math.floor(index / size), names.length - 1)]
}

// Cuts the team list into the groups (same slicing as getGroupLabel()).
function splitIntoGroups(teams) {
  const names = getGroupNamesForTeams(teams.length)
  const size = Math.ceil(teams.length / names.length)
  return names.map((name, g) => ({
    name,
    teams: teams.slice(g * size, (g + 1) * size),
  }))
}

/* ------------------------------------------------------------------ */
/* Score input helpers                                                 */
/* ------------------------------------------------------------------ */

// Highest score allowed in a match (games are played to 11)
const MAX_SCORE = 11

// Cleans what the user types into a score box (digits only, no leading
// zeros, capped at MAX_SCORE). Returns '' when empty.
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

// Title shown above each round column (counts from the END).
// `firstRoundSize` tells the two 4-round trees apart: 1 match = play-in (9 teams),
// 8 cards = first round (12 teams).
function getRoundName(roundIndex, totalRounds, firstRoundSize = 0) {
  if (totalRounds === 4 && roundIndex === 0) return firstRoundSize === 1 ? 'Play-in' : 'First round'
  if (roundIndex === totalRounds - 1) return 'Final'
  if (roundIndex === totalRounds - 2) return 'Semi-finals'
  if (roundIndex === totalRounds - 3) return 'Quarter-finals'
  return `Round ${roundIndex + 1}`
}

/* ------------------------------------------------------------------ */
/* Knockout logic                                                      */
/* ------------------------------------------------------------------ */

// Decides who won a knockout match (null if not decided yet).
function getWinner(match) {
  if (!match.team1 || !match.team2) return null
  if (match.score1 === '' || match.score2 === '') return null
  const s1 = Number(match.score1)
  const s2 = Number(match.score2)
  if (s1 === s2) return null
  return s1 > s2 ? match.team1 : match.team2
}

// Recalculates the WHOLE bracket after a score changed.
// Later rounds take their teams from the winners of the matches that
// "feed" them. If a match's teams changed, its old scores are reset and
// the match is returned in `cleared` so the caller can delete them on
// the server. NOTE: this MUTATES the bracket it receives.
function propagate(bracket) {
  const cleared = []
  bracket.forEach((round, r) => {
    round.forEach((item, m) => {
      if (r > 0) {
        // A feed is either a match ({ r, m }) or a fixed seeded team ({ team })
        const from = (f) => (!f ? null : f.team !== undefined ? f.team : bracket[f.r][f.m].winner)

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
      // A bye's "winner" is simply the waiting team
      item.winner = item.kind === 'wait' ? item.team1 : getWinner(item)
    })
  })
  return cleared
}

// Builds the 6-team knockout tree from the group standings.
//
//   Column 1 (quarter-finals)     Column 2 (semi-finals)     Column 3
//   [ A1  - bye ]  ---------------\
//   [ B2 vs A3  ]  ---------------/ Semi 1: A1 vs W(B2/A3) --\
//                                                              Final
//   [ B1  - bye ]  ---------------\                          /
//   [ A2 vs B3  ]  ---------------/ Semi 2: B1 vs W(A2/B3) --/
//
// Teams from the same group can only meet again in the semi-finals
// (when A3 or B3 wins their quarter-final).
function createTwoGroupBracket(standingsByGroup) {
  const A = standingsByGroup.A.map((r) => r.team)
  const B = standingsByGroup.B.map((r) => r.team)

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
    // Round 0: quarter-finals (two byes + two real matches)
    [
      bye('r0-m0', A[0] || null), // A1 waits
      match('r0-m1', [], B[1] || null, A[2] || null), // B2 vs A3
      bye('r0-m2', B[0] || null), // B1 waits
      match('r0-m3', [], A[1] || null, B[2] || null), // A2 vs B3
    ],
    // Round 1: semi-finals
    [
      match('r1-m0', [{ r: 0, m: 0 }, { r: 0, m: 1 }]),
      match('r1-m1', [{ r: 0, m: 2 }, { r: 0, m: 3 }]),
    ],
    // Round 2: final
    [match('r2-m0', [{ r: 1, m: 0 }, { r: 1, m: 1 }])],
  ]

  propagate(bracket) // fills the semi-final / final slots with the byes
  return bracket
}

// Builds the 9-team knockout tree for 3 groups (A, B, C).
// The top 3 of every group are ranked into seeds 1-9:
//   seeds 1-3 = the group winners, 4-6 = the runners-up, 7-9 = the third places
// (inside each tier: fewer losses first, then wins, point difference, points scored).
//
//   Play-in         Quarter-finals          Semi-finals        Final
//   [ 8 vs 9 ] ---> [ 1 vs W(8/9) ] ---\
//                   [ 4 vs 5      ] ---/ Semi 1 ---\
//                                                    Final
//                   [ 3 vs 6      ] ---\          /
//                   [ 2 vs 7      ] ---/ Semi 2 ---/
//
// Teams from the same group can meet before the semi-finals in some draws.
function createThreeGroupBracket(standingsByGroup) {
  const names = Object.keys(standingsByGroup)
  const tier = (rank) =>
    names
      .map((n) => standingsByGroup[n][rank])
      .filter(Boolean)
      .sort(compareRows)
      .map((row) => row.team)
  const seeds = [...tier(0), ...tier(1), ...tier(2)] // index 0 = seed 1

  // Avoid first-round matches between teams of the same group: if the plain seeding
  // creates one, try a few small swaps and keep the first arrangement without a clash.
  const groupOf = {}
  names.forEach((n) => standingsByGroup[n].forEach((r) => (groupOf[r.team.id] = n)))
  const sameGroup = (a, b) => !!a && !!b && groupOf[a.id] === groupOf[b.id]
  const clashes = (q) =>
    [[3, 6], [2, 7], [4, 5]].filter(([x, y]) => sameGroup(q[x - 1], q[y - 1])).length
  const swap = (arr, i, j) => {
    const c = arr.slice()
    ;[c[i - 1], c[j - 1]] = [c[j - 1], c[i - 1]]
    return c
  }
  const candidates = [
    seeds,
    swap(seeds, 5, 6),
    swap(seeds, 2, 3),
    swap(swap(seeds, 5, 6), 2, 3),
    swap(seeds, 6, 7),
    swap(swap(seeds, 6, 7), 2, 3),
  ]
  const order = candidates.find((q) => clashes(q) === 0) || seeds
  const S = (n) => order[n - 1] || null

  const blank = { team1: null, team2: null, score1: '', score2: '', winner: null }
  // `row` = fixed vertical row of the card (see computeLayout)
  const match = (id, feeds, row) => ({ ...blank, id, kind: 'match', feeds, row })

  const bracket = [
    // Round 0: play-in (seed 8 vs seed 9)
    [{ ...match('r0-m0', [], 0), team1: S(8), team2: S(9) }],
    // Round 1: quarter-finals. { team } = a fixed seed, { r, m } = winner of that match
    [
      match('r1-m0', [{ team: S(1) }, { r: 0, m: 0 }], 0),
      match('r1-m1', [{ team: S(4) }, { team: S(5) }], 1),
      match('r1-m2', [{ team: S(3) }, { team: S(6) }], 2),
      match('r1-m3', [{ team: S(2) }, { team: S(7) }], 3),
    ],
    // Round 2: semi-finals
    [
      match('r2-m0', [{ r: 1, m: 0 }, { r: 1, m: 1 }]),
      match('r2-m1', [{ r: 1, m: 2 }, { r: 1, m: 3 }]),
    ],
    // Round 3: final
    [match('r3-m0', [{ r: 2, m: 0 }, { r: 2, m: 1 }])],
  ]

  propagate(bracket)
  return bracket
}

// Builds the 12-team knockout tree for 4 groups (A-D).
// Seeds: 1-4 = the group winners, 5-8 = the runners-up, 9-12 = the third places
// (inside each tier: fewer losses first, then wins, point difference, points scored).
//
//   First round (round of 12)        Quarter-finals        Semi-finals      Final
//   [ seed 1 - bye ]  --------------\
//   [ 8 vs 9        ] --------------/ QF1: 1 v W(8/9) ----\
//   [ seed 4 - bye ]  --------------\                     Semi 1 ---\
//   [ 5 vs 12       ] --------------/ QF2: 4 v W(5/12) ----/          \
//                                                                      Final
//   [ seed 2 - bye ]  --------------\                                 /
//   [ 7 vs 10       ] --------------/ QF3: 2 v W(7/10) ----\          /
//   [ seed 3 - bye ]  --------------\                     Semi 2 ---/
//   [ 6 vs 11       ] --------------/ QF4: 3 v W(6/11) ----/
//
// 4 first-round matches are played (4 teams out), then 8 teams play the quarter-finals.
// If a first-round match would be two teams of the same group, the third places
// are re-ordered (as little as possible) to avoid it.
function createFourGroupBracket(standingsByGroup) {
  const names = Object.keys(standingsByGroup)
  const tier = (rank) =>
    names
      .map((n) => standingsByGroup[n][rank])
      .filter(Boolean)
      .sort(compareRows)
      .map((row) => row.team)
  const winners = tier(0) // seeds 1-4
  const runners = tier(1) // seeds 5-8
  const thirds = tier(2) // seeds 9-12

  // Avoid first-round matches between teams of the same group
  const groupOf = {}
  names.forEach((n) => standingsByGroup[n].forEach((r) => (groupOf[r.team.id] = n)))
  const sameGroup = (a, b) => !!a && !!b && groupOf[a.id] === groupOf[b.id]
  const partner = { 5: 12, 6: 11, 7: 10, 8: 9 } // runner-up seed -> third-place seed it plays
  const clashes = (arr) =>
    [5, 6, 7, 8].filter((r) => sameGroup(runners[r - 5], arr[partner[r] - 9])).length
  const permutations = (arr) =>
    arr.length <= 1
      ? [arr]
      : arr.flatMap((x, i) =>
          permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])
        )
  let thirdsOrder = thirds
  if (clashes(thirds) > 0) {
    const ok = permutations(thirds).filter((p) => clashes(p) === 0)
    if (ok.length) {
      const moved = (p) => p.reduce((sum, t, i) => sum + Math.abs(thirds.indexOf(t) - i), 0)
      thirdsOrder = ok.reduce((best, p) => (moved(p) < moved(best) ? p : best), ok[0])
    }
  }

  const W = (n) => winners[n - 1] || null // seeds 1-4
  const R = (n) => runners[n - 5] || null // seeds 5-8
  const T = (n) => thirdsOrder[n - 9] || null // seeds 9-12

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
    // Round 0: first round (4 byes + 4 real matches)
    [
      bye('r0-m0', W(1)),
      match('r0-m1', [], R(8), T(9)),
      bye('r0-m2', W(4)),
      match('r0-m3', [], R(5), T(12)),
      bye('r0-m4', W(2)),
      match('r0-m5', [], R(7), T(10)),
      bye('r0-m6', W(3)),
      match('r0-m7', [], R(6), T(11)),
    ],
    // Round 1: quarter-finals (each one: a group winner vs the winner of the match next to it)
    [
      match('r1-m0', [{ r: 0, m: 0 }, { r: 0, m: 1 }]),
      match('r1-m1', [{ r: 0, m: 2 }, { r: 0, m: 3 }]),
      match('r1-m2', [{ r: 0, m: 4 }, { r: 0, m: 5 }]),
      match('r1-m3', [{ r: 0, m: 6 }, { r: 0, m: 7 }]),
    ],
    // Round 2: semi-finals
    [
      match('r2-m0', [{ r: 1, m: 0 }, { r: 1, m: 1 }]),
      match('r2-m1', [{ r: 1, m: 2 }, { r: 1, m: 3 }]),
    ],
    // Round 3: final
    [match('r3-m0', [{ r: 2, m: 0 }, { r: 2, m: 1 }])],
  ]

  propagate(bracket) // puts the 4 bye teams into the quarter-finals
  return bracket
}

// Picks the right tree for the number of groups
function createTop3Bracket(standingsByGroup) {
  const groupCount = Object.keys(standingsByGroup).length
  if (groupCount === 4) return createFourGroupBracket(standingsByGroup)
  if (groupCount === 3) return createThreeGroupBracket(standingsByGroup)
  return createTwoGroupBracket(standingsByGroup)
}

// Fills a fresh tree with scores that were saved on the server.
// `results` rows look like { round, matchNumber, pair1Id, pair2Id, score1, score2 }.
// We go round by round so each round already knows its teams before its
// scores are applied. The server may have stored the two teams in the
// opposite order, so the scores are swapped when needed.
function applyResults(bracket, results) {
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

// Vertical (y) center of every card. Round 0 is spaced evenly, every
// later card sits in the middle of the matches that feed it.
function computeLayout(bracket) {
  const ys = bracket.map(() => [])
  bracket.forEach((round, r) => {
    round.forEach((item, m) => {
      // Only feeds that point to another match affect the position
      const feederYs = item.feeds.filter((f) => f.r !== undefined).map((f) => ys[f.r][f.m])
      if (item.row !== undefined) {
        // fixed row (used by the 3-group tree)
        ys[r][m] = HEADER + item.row * ROW_HEIGHT + ROW_HEIGHT / 2
      } else if (r === 0 || !feederYs.length) {
        ys[r][m] = HEADER + m * ROW_HEIGHT + ROW_HEIGHT / 2
      } else {
        ys[r][m] = feederYs.reduce((a, b) => a + b, 0) / feederYs.length
      }
    })
  })
  return ys
}

// The loser of a finished match (null while there is no winner yet).
function getLoser(match, winner) {
  if (!winner) return null
  return teamKey(winner) === teamKey(match.team1) ? match.team2 : match.team1
}

// 3rd place is played when the round before the final has exactly 2 real matches.
function hasThirdPlace(bracket) {
  if (bracket.length < 2) return false
  const semis = bracket[bracket.length - 2]
  return semis.length === 2 && semis.every((m) => m.kind !== 'wait')
}

// The 3rd-place teams are the LOSERS of the two semi-finals.
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

      <div className="flex flex-row flex-wrap justify-center rounded-md  items-center gap-1 text-[13px]">
        <span style={nameStyle(team1)}>{team1 ? pairLabel(team1) : 'TBD'}</span>
        <span className="text-gray-500">vs</span>
        <span style={nameStyle(team2)}>{team2 ? pairLabel(team2) : 'TBD'}</span>
      </div>
    </div>
  )
}

// Dashed card for a "bye": the team has no opponent this round.
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
      <p className="text-[11px] uppercase tracking-wide text-gray-500">Waiting for next round</p>
      <p className="mt-1 text-[13px]" style={nameStyle(item.team1)}>
        {item.team1 ? pairLabel(item.team1) : 'TBD'}
      </p>
    </div>
  )
}

// Draws the full knockout tree: round titles, connecting lines, cards.
// `thirdPlace` (optional) = { match, onScore }, drawn under the final.
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
    <div className="relative rounded-md " style={{ width, height }}>
      {bracket.map((_, r) => (
        <h3
          key={r}
          className="absolute text-center text-xs font-semibold  "
          style={{ left: r * COLUMN, top: 0, width: CARD_WIDTH }}
        >
          {getRoundName(r, bracket.length, bracket[0].length)}
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
            item.feeds
              .filter((f) => f.r !== undefined)
              .map((f, k) => {
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

/* ------------------------------------------------------------------ */
/* Podium cards                                                        */
/* ------------------------------------------------------------------ */

function PlaceCard({ label, team, icon, featured = false }) {
  return (
    <div className={`w-full text-center space-y-1 ${featured ? 'p-5' : 'p-4'}`}>
      {icon}

      <p className={`font-medium text-yellow-800 ${featured ? 'text-sm' : 'text-xs'}`}>
        {label}
      </p>

      <p className={`font-bold capitalize text-black ${featured ? 'text-xl' : 'text-base'}`}>
        {team ? pairLabel(team) : ''}
      </p>

      <p
        className={`mt-1 ${featured ? 'text-sm' : 'text-base'} ${
          team ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {team ? team.name : 'TBD'}
      </p>
    </div>
  )
}

// Podium: 2nd place | champion | 3rd place (same design as Top 2)
function ChampionBanner({ champion, second, third, showThird }) {
  return (
    <div className="mx-auto w-full rounded-xl border border-yellow-300 bg-yellow-50 p-4 sm:p-6">
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {/* 2nd Place */}
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <PlaceCard label="" team={second} />

          <div className="relative flex h-24 w-full max-w-[200px] flex-col items-center justify-center rounded-t-lg border-2 border-gray-400 bg-gradient-to-b from-gray-200 to-gray-400 shadow-lg">
            <span className="text-3xl font-black text-gray-700">2</span>
            <span className="text-xs font-bold text-gray-700">SECOND</span>
          </div>
        </div>

        {/* Champion */}
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <PlaceCard featured label="" team={champion} />

          <div className="flex h-36 w-full max-w-[200px] flex-col items-center justify-center rounded-t-lg border-2 border-yellow-500 bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-xl">
            <span className="text-5xl font-black text-yellow-900">1</span>
            <span className="text-sm font-black text-yellow-900">CHAMPION</span>
          </div>
        </div>

        {/* 3rd Place */}
        {showThird && (
          <div className="flex min-w-0 flex-1 flex-col items-center">
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
/* Group stage helpers                                                 */
/* ------------------------------------------------------------------ */

// Classic "circle method" round robin: every team plays every other once.
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

// Ranking rule for two standings rows (also used to rank teams ACROSS groups).
// Eliminated teams (3 losses) always rank below teams that are still alive.
const compareRows = (x, y) =>
  Number(x.eliminated) - Number(y.eliminated) ||
  y.wins - x.wins ||
  y.pf - y.pa - (x.pf - x.pa) ||
  y.pf - x.pf ||
  x.team.name.localeCompare(y.team.name, undefined, { numeric: true })

// Standings table of ONE group.
// Eliminated teams (3 losses) go last. Then the tie-breakers:
// wins, point difference, points scored, team name A-Z.
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

  Object.values(rows).forEach((r) => {
    r.eliminated = r.losses >= ELIMINATION_LOSSES
  })

  return Object.values(rows).sort(compareRows)
}

const standingsFor = (groups, matchesByGroup, scores) =>
  Object.fromEntries(
    groups.map((g) => [g.name, computeStandings(g, matchesByGroup[g.name], scores)])
  )

// Converts the group scores saved on the server to the local `scores` format.
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
  { abbr: 'W', label: 'Wins' },
  { abbr: 'L', label: 'Losses' },
  { abbr: 'GP', label: 'Game Played' },
  { abbr: 'TP', label: 'Total Points' },
  { abbr: 'PA', label: 'Points Against' },
  { abbr: '+/-', label: 'Difference' },
]

/* ------------------------------------------------------------------ */
/* GroupCard: UI for one group (standings table + list of matches)     */
/* ------------------------------------------------------------------ */
// `advance` = how many teams of this group go to the playoffs (shown in bold)
// `cancelledIds` = ids of matches that will not be played (a team has 3 losses)
// `firstTeamNumber` = number of the first team of this group (Group A starts at 1)
function GroupCard({
  group,
  matches,
  standings,
  scores,
  locked,
  onScore,
  advance,
  cancelledIds,
  firstTeamNumber,
}) {
  return (
    <div className="theme-card rounded-xl border theme-border p-4 space-y-4">
      <div className="flex w-full items-center justify-between">
        <h3 className="text-lg font-bold">Bracket {group.name}</h3>
        <p className="text-right text-xs theme-muted">
          {group.teams.length <= advance
            ? 'All teams advance to the playoffs.'
            : `Top ${advance} (bold) advance to the playoffs.`}
        </p>
      </div>

      {/* Standings table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
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
                // Eliminated (3 losses) = red, qualifying rows = bold, the rest = faded
                className={`space-y-1 border-b border-t theme-border ${
                  row.eliminated
                    ? 'bg-red-500/10 font-semibold text-red-500'
                    : i < advance
                      ? 'font-semibold'
                      : 'opacity-70'
                }`}
              >
                <td className="py-3 pr-3 align-top text-sm">{i + 1}</td>
                <td className="border-b border-white/10 py-3 align-top theme-border">
                  <div className="text-sm capitalize">{pairLabel(row.team)}</div>
                  <div
                    className={`mt-0.5 text-xs font-normal capitalize ${
                      row.eliminated ? 'text-red-400' : 'theme-muted'
                    }`}
                  >
                    {row.team.name}
                    {row.eliminated && ` · Eliminated (${row.losses} losses)`}
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

      <div className="flex w-full flex-row gap-2">
        {/* List of the teams of this group */}
        <div className="flex min-w-[120px] flex-col items-center">
          <h4 className="mb-1 font-bold">List of teams</h4>

          <span className="mb-4 text-xs theme-muted">Bracket {group.name}</span>

          {group.teams.map((team, index) => (
            <div key={team.id} className="w-full py-1">
              <div className="text-center text-sm font-semibold">{pairLabel(team)}</div>

              <div className="mt-1 text-center text-xs theme-muted">
                Team {firstTeamNumber + index}
              </div>
            </div>
          ))}
        </div>

        <div className="border-r border-white/10" />

        {/* List of this group's matches, each with two score inputs */}
        <div className="flex w-full flex-col items-center space-y-2">
          <span className="flex items-center pb-2 text-center font-bold">Round Robin</span>

          {matches.map((m) => {
            const s = scores[m.id] || { score1: '', score2: '' }
            const cancelled = cancelledIds.has(m.id)

            return (
              <div
                key={m.id}
                title={cancelled ? 'Cancelled: a team in this match has 3 losses' : undefined}
                className={`flex w-full items-center justify-between gap-2 text-[13px] ${
                  cancelled ? 'opacity-40' : ''
                }`}
              >
                {/* Team 1 */}
                <span className="min-w-0 flex-1 break-words text-right leading-tight">
                  <span className="font-semibold">{m.team1.name}</span>
                  <span className="ml-1 text-xs capitalize theme-muted">({pairLabel(m.team1)})</span>
                </span>

                {/* Score 1 */}
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  disabled={locked || cancelled}
                  placeholder={cancelled ? '×' : '-'}
                  value={s.score1}
                  style={groupScoreBox}
                  aria-label={`${m.team1.name} score`}
                  onChange={(e) => onScore(m, 'score1', cleanScore(e.target.value))}
                />

                <span className="font-bold">:</span>

                {/* Score 2 */}
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  disabled={locked || cancelled}
                  placeholder={cancelled ? '×' : '-'}
                  value={s.score2}
                  style={groupScoreBox}
                  aria-label={`${m.team2.name} score`}
                  onChange={(e) => onScore(m, 'score2', cleanScore(e.target.value))}
                />

                {/* Team 2 */}
                <span className="min-w-0 flex-1 break-words leading-tight">
                  <span className="font-semibold">{m.team2.name}</span>
                  <span className="ml-1 text-xs capitalize theme-muted">({pairLabel(m.team2)})</span>
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
/* Top3_View: the main component. Holds all the state and logic.       */
/* ------------------------------------------------------------------ */
export function Top3_View({
  tournamentId,
  tournamentName,
  teams,
  savedGroupMatches = [], // group scores already saved on the server
  savedKnockout = [], // playoff scores already saved on the server
  onReset,
}) {
  // ---- Derived data ----
  // Team numbers: a team still carrying an auto name ("Team 8") is renamed from its
  // position in the list, so Group A always shows Team 1..n and Group B the next ones,
  // even if the server stored an old or duplicated default name. Custom names are kept.
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

  // bracket: the knockout tree, or null if playoffs haven't started.
  // If playoff scores were saved before, rebuild the tree and refill it.
  const [bracket, setBracket] = useState(() => {
    if (!savedKnockout.length) return null
    const st = standingsFor(groups, groupMatches, initialScores)
    const fresh = createTop3Bracket(st)
    // The saved 3rd-place match is stored as round = (number of rounds + 1).
    const treeResults = savedKnockout.filter((x) => x.round <= fresh.length)
    return applyResults(fresh, treeResults)
  })

  const [champion, setChampion] = useState(
    () => bracket?.[bracket.length - 1]?.[0]?.winner ?? null
  )

  // Scores of the 3rd-place match (the teams come from the semi-final losers).
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

  // Base URL for all API calls of this tournament
  const base = `/top3/${tournamentId}`

  const standings = useMemo(
    () => standingsFor(groups, groupMatches, scores),
    [groups, groupMatches, scores]
  )

  // ---- Elimination: 3 losses = out, remaining matches of that team are cancelled ----
  const eliminatedIds = useMemo(
    () =>
      new Set(
        Object.values(standings)
          .flat()
          .filter((row) => row.eliminated)
          .map((row) => row.team.id)
      ),
    [standings]
  )
  // A match is cancelled when it is still unscored and one of its teams is eliminated.
  // (Scored matches always stay. If a score is edited and the team drops below
  // 3 losses, its matches become playable again.)
  const cancelledIds = useMemo(() => {
    const ids = new Set()
    Object.values(groupMatches)
      .flat()
      .forEach((m) => {
        if (getResult(m, scores)) return
        if (eliminatedIds.has(m.team1.id) || eliminatedIds.has(m.team2.id)) ids.add(m.id)
      })
    return ids
  }, [groupMatches, scores, eliminatedIds])

  // ---- Progress info ----
  const allMatches = Object.values(groupMatches)
    .flat()
    .filter((m) => !cancelledIds.has(m.id)) // cancelled matches don't need to be played
  const doneCount = allMatches.filter((m) => getResult(m, scores)).length
  const groupsDone = doneCount === allMatches.length
  const locked = !!bracket

  // ---- 3rd place match (derived from the bracket) ----
  const showThird = !!bracket && hasThirdPlace(bracket)
  const thirdTeams = useMemo(
    () => (bracket ? getThirdPlaceTeams(bracket) : [null, null]),
    [bracket]
  )
  const thirdMatch = { team1: thirdTeams[0], team2: thirdTeams[1], ...thirdScores }
  const thirdWinner = getWinner(thirdMatch)

  // ---- Final ranking: the podium shows 1st (champion), 2nd (loser of the final), 3rd ----
  const finalMatch = bracket ? bracket[bracket.length - 1][0] : null
  const runnerUp = finalMatch ? getLoser(finalMatch, champion) : null

  // Number of the first team of each group (Group A starts at Team 1, the next group
  // continues after the last team of the previous one)
  const startNumbers = {}
  let nextNumber = 1
  groups.forEach((g) => {
    startNumbers[g.name] = nextNumber
    nextNumber += g.teams.length
  })

  // ---- Handlers ----

  // Called when a score box in a GROUP match changes
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
      api.delete(`${base}/group-matches`, { data: ids }).catch(() => setError('Could not clear the score.'))
    }
  }

  // "Lock brackets & start playoffs": seeds the top 3 of each group
  const startKnockout = () => {
    setBracket(createTop3Bracket(standings))
    setChampion(null)
    setThirdScores({ score1: '', score2: '' })
  }

  // "Unlock brackets": back to the group stage (playoff scores are deleted)
  const unlockGroups = () => {
    if (!window.confirm('Unlock the brackets? Playoff scores will be cleared.')) return
    api.delete(`${base}/matches`).catch(() => setError('Could not clear playoff scores.'))
    setBracket(null)
    setChampion(null)
    setThirdScores({ score1: '', score2: '' })
  }

  // Called when a score box in a PLAYOFF match changes.
  // r = round index, m = match index inside that round.
  const updateKnockoutScore = (r, m, key, value) => {
    const next = bracket.map((round) => round.map((item) => ({ ...item })))
    const item = next[r][m]

    const before = teamKey(item.winner)
    item[key] = value
    const cleared = propagate(next)
    const after = teamKey(item.winner)

    // If a semi-final result changed, the 3rd-place teams may have changed too.
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
      api.delete(`${base}/matches/${r + 1}/${m + 1}`).catch(() => setError('Could not clear the score.'))
    }

    // Later matches whose teams changed had their scores wiped by propagate()
    cleared.forEach((c) =>
      api
        .delete(`${base}/matches/${c.round}/${c.matchNumber}`)
        .catch(() => setError('Could not clear a later score.'))
    )
  }

  // Called when a score box in the 3rd-place match changes.
  // Saved like a normal playoff match: round = (number of rounds + 1), match 1.
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
      api.delete(`${base}/matches/${round}/1`).catch(() => setError('Could not clear the 3rd place score.'))
    }
  }

  // ---- Render ----
  return (
    <section className="space-y-5  animate-fade-in animation-delay-100">
      {/* Header: tournament name, summary line and reset button */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl rounded-md border theme-muted p-5">
        <div>
          <h2 className="text-xl font-bold capitalize">{tournamentName}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {teams.length} teams · {groups.length} Brackets ({groups.map((g) => g.teams.length).join(' + ')}) · Top {ADVANCE} advance · Group matches{' '}
            {doneCount}/{allMatches.length}
          </p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm theme-border theme-hover theme-accent"
        >
          <RotateCcw size={16} /> Reset tournament
        </button>
      </div>

      {champion && (
        <ChampionBanner
          champion={champion}
          second={runnerUp}
          third={thirdWinner}
          showThird={showThird}
        />
      )}

      {/* Legend: explains the standings columns */}
      <div className="border theme-border rounded-xl w-full">
        <h3 className="px-4 pt-3 font-bold text-sm sm:text-base ">Standings key</h3>

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
        <p className="px-4 pb-3 text-xs theme-muted">
          A team with {ELIMINATION_LOSSES} losses is eliminated (shown in red). Its remaining group
          matches are cancelled and it ranks below the teams still in the race.
        </p>
      </div>

      {/* Group stage title + Lock / Unlock button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Bracket Stage (Round Robin)</h3>
        {!locked ? (
          <button
            disabled={!groupsDone}
            onClick={startKnockout}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold theme-accent disabled:opacity-40"
          >
            <Lock size={16} /> Lock brackets &amp; start playoffs
          </button>
        ) : (
          <button
            onClick={unlockGroups}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm theme-border theme-hover"
          >
            <Unlock size={16} /> Unlock brackets
          </button>
        )}
      </div>

      <div className={`grid gap-4 grid-cols-1 lg:grid-cols-2 ${groups.length === 3 ? 'xl:grid-cols-3' : ''}`}>
        {groups.map((g) => (
          <GroupCard
            key={g.name}
            group={g}
            matches={groupMatches[g.name]}
            standings={standings[g.name]}
            scores={scores}
            locked={locked}
            onScore={updateGroupScore}
            advance={ADVANCE}
            cancelledIds={cancelledIds}
            firstTeamNumber={startNumbers[g.name]}
          />
        ))}
      </div>

      {/* Playoff tree (only after the groups were locked) */}
      {bracket && (
        <>
          <h3 className="text-lg pt-10 font-bold">Playoffs (Single Elimination)</h3>
          <p className="text-xs theme-muted">
            {groups.length === 4
              ? 'The top 3 of each group (12 teams) are seeded by group finish. The 4 group winners get a bye; the other 8 teams play the first round.'
              : groups.length === 3
                ? 'The top 3 of each group (9 teams) are seeded by group finish. The two lowest seeds play a play-in match for the last quarter-final spot.'
                : 'The winners of Bracket A and Bracket B skip the quarter-finals and go straight to the semi-finals.'}
          </p>
          <div className="overflow-x-auto rounded-xl p-6 theme-accent">
            <BracketTree
              bracket={bracket}
              onScore={updateKnockoutScore}
              thirdPlace={showThird ? { match: thirdMatch, onScore: updateThirdScore } : null}
            />
          </div>
        </>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Top3_bracketing_e: the page component (used by the router).         */
/* Loads the tournament from the API and hands it to Top3_View.        */
/* ------------------------------------------------------------------ */
export const Top3_bracketing_e = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    api
      .get(`/top3/${id}`)
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
      await api.delete(`/top3/${id}`)
    } catch {
      // Ignore errors: we navigate away either way
    }
    navigate(LIST_ROUTE)
  }

  if (status === 'loading') return <p className="px-10 theme-muted">Loading tournament...</p>

  // Error, no data, or too few teams for top-3 groups
  if (status === 'error' || !data || data.teams.length < MIN_TEAMS) {
    return (
      <div className="w-full space-y-4 px-10">
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
    <div className="w-full px-10">
      <Top3_View
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