/*
 * ====================================================================
 * OVERVIEW
 * ====================================================================
 * Same idea as Bracket_quadro_e.jsx, but the TOP 3 of each group advance.
 *
 *   STAGE 1 - "Brackets" (round robin, 2 groups: A and B)
 *     Every team plays every other team in its group once.
 *     A standings table is computed live from the scores.
 *
 *   STAGE 2 - "Playoffs" (single elimination, 6 teams)
 *     When all group matches are scored, the user "locks" the groups.
 *     The top 3 of A and the top 3 of B (6 teams) go to the playoffs:
 *
 *       Quarter-finals:  B2 vs A3      A2 vs B3
 *                        (A1 and B1 have a BYE: they skip this round)
 *       Semi-finals:     A1 vs winner(B2 vs A3)
 *                        B1 vs winner(A2 vs B3)
 *       Final:           winners of the two semi-finals
 *       3rd place:       losers of the two semi-finals
 *
 * Scores are saved to the backend through `api` on every change.
 *
 * Unlike the quadro file, this file builds its own knockout tree
 * (createTop3Bracket / applyResults), so it does not need Bracket_Single_VIew.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RotateCcw, Lock, Unlock, Trophy } from 'lucide-react'
import api from '../../api'

// Route to go back to the list of tournaments
const LIST_ROUTE = '/dashboard/top3dashb'

/* ------------------------------------------------------------------ */
/* Format: 2 groups, top 3 of each go to the playoffs                  */
/* ------------------------------------------------------------------ */
const GROUP_NAMES = ['A', 'B']
const ADVANCE = 3 // teams of EACH group that qualify

// How many teams each group gets. If the count doesn't divide evenly,
// the LAST group gets the extra team (9 teams -> A = 4, B = 5).
function getGroupSizes(teamsCount) {
  const count = GROUP_NAMES.length
  const base = Math.floor(teamsCount / count)
  const extra = teamsCount % count
  return Array.from({ length: count }, (_, g) => base + (g >= count - extra ? 1 : 0))
}

// One-line description of the format, used by the registration page
export function getFormatSummary(teamsCount) {
  const sizes = getGroupSizes(teamsCount)
  const sizeText =
    sizes[0] === sizes[1]
      ? `${sizes[0]} per group`
      : `${sizes[0]} in Group A and ${sizes[1]} in Group B`
  return `${teamsCount} teams are split into 2 groups (A-B), ${sizeText}. The top 3 of each group (6 teams) qualify for the quarter-finals; the two group winners get a bye to the semi-finals.`
}

// Which group a team ends up in, from its position in the team list (0 = first team).
// Uses the same sizes as splitIntoGroups(), so the registration form always matches.
export function getGroupLabel(index, teamsCount) {
  const sizes = getGroupSizes(teamsCount)
  let end = 0
  for (let g = 0; g < GROUP_NAMES.length; g++) {
    end += sizes[g]
    if (index < end) return GROUP_NAMES[g]
  }
  return GROUP_NAMES[GROUP_NAMES.length - 1]
}

// Cuts the team list into the two groups using getGroupSizes().
function splitIntoGroups(teams) {
  const sizes = getGroupSizes(teams.length)
  let start = 0
  return GROUP_NAMES.map((name, g) => {
    const group = { name, teams: teams.slice(start, start + sizes[g]) }
    start += sizes[g]
    return group
  })
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
function getRoundName(roundIndex, totalRounds) {
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
function createTop3Bracket(standingsByGroup) {
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
      <p className="text-[11px] uppercase tracking-wide text-gray-500">Bye - waiting for next round</p>
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

/* ------------------------------------------------------------------ */
/* Podium cards                                                        */
/* ------------------------------------------------------------------ */

function PlaceCard({ label, team, icon, featured = false }) {
  return (
    <div
      className="rounded-md border border-yellow-200 bg-white/60 p-4 text-center space-y-1"
      style={{ width: '100%', maxWidth: 'none', minWidth: 0, boxSizing: 'border-box' }}
    >
      {icon}
      <p className={`font-medium text-yellow-800 ${featured ? 'text-sm' : 'text-xs'}`}>{label}</p>
      <p className={`font-bold capitalize text-black ${featured ? 'text-2xl' : 'text-base'}`}>
        {team ? pairLabel(team) : ''}
      </p>
      <p className={`text-sm ${team ? 'text-gray-900' : 'text-gray-400'}`}>
        {team ? team.name : 'TBD'}
      </p>
    </div>
  )
}

function ChampionBanner({ champion, second, third, fourth, showThird }) {
  return (
    <div className="mx-auto rounded-md border border-yellow-300 bg-yellow-100 text-l p-6">
      <PlaceCard
        featured
        label="Champion"
        team={champion}
        icon={<Trophy className="mx-auto mb-1 text-yellow-600" size={36} />}
      />

      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <PlaceCard label="2nd place" team={second} />
        {showThird && <PlaceCard label="3rd place" team={third} />}
        {showThird && <PlaceCard label="4th place" team={fourth} />}
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

// Standings table of ONE group.
// Tie-breakers: wins, point difference, points scored, team name A-Z.
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

  return Object.values(rows).sort(
    (x, y) =>
      y.wins - x.wins ||
      y.pf - y.pa - (x.pf - x.pa) ||
      y.pf - x.pf ||
      x.team.name.localeCompare(y.team.name)
  )
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
  { abbr: 'GP', label: 'Game Played' },
  { abbr: 'W', label: 'Wins' },
  { abbr: 'L', label: 'Losses' },
  { abbr: 'TP', label: 'Total Points' },
  { abbr: 'PA', label: 'Points Against' },
  { abbr: '+/-', label: 'Difference' },
]

/* ------------------------------------------------------------------ */
/* GroupCard: UI for one group (standings table + list of matches)     */
/* ------------------------------------------------------------------ */
// `advance` = how many teams of this group go to the playoffs (shown in bold)
function GroupCard({ group, matches, standings, scores, locked, onScore, advance }) {
  return (
    <div className="theme-card rounded-xl border theme-border p-4 space-y-4">
      <h3 className="text-lg font-bold">Bracket {group.name}</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs theme-muted">
              <th className="py-1">#</th>
              <th>Team</th>
              <th className="text-center">GP</th>
              <th className="text-center">W</th>
              <th className="text-center">L</th>
              <th className="text-center">TP</th>
              <th className="text-center">PA</th>
              <th className="text-center">+/-</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr
                key={row.team.id}
                className={`border-t theme-border ${i < advance ? 'font-semibold' : 'opacity-70'}`}
              >
                <td className="py-3 pr-3 align-top text-sm">{i + 1}</td>
                <td className="py-3 align-top">
                  <div className="text-sm capitalize">{pairLabel(row.team)}</div>
                  <div className="mt-0.5 text-xs font-normal capitalize theme-muted">{row.team.name}</div>
                </td>
                <td className="text-center">{row.played}</td>
                <td className="text-center">{row.wins}</td>
                <td className="text-center">{row.losses}</td>
                <td className="text-center">{row.pf}</td>
                <td className="text-center">{row.pa}</td>
                <td className="text-center">{row.pf - row.pa}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 py-5 text-xs theme-muted">Top {advance} (bold) advance to the playoffs.</p>
      </div>

      <div className="space-y-2">
        {matches.map((m) => {
          const s = scores[m.id] || { score1: '', score2: '' }
          return (
            <div key={m.id} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="flex-1 truncate text-right">{m.team1.name}</span>
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
              <span>:</span>
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
              <span className="flex-1 truncate">{m.team2.name}</span>
            </div>
          )
        })}
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
  const groups = useMemo(() => splitIntoGroups(teams), [teams])
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

  // ---- Progress info ----
  const allMatches = Object.values(groupMatches).flat()
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

  // ---- Final ranking: 1st-4th ----
  const finalMatch = bracket ? bracket[bracket.length - 1][0] : null
  const runnerUp = finalMatch ? getLoser(finalMatch, champion) : null
  const fourth = getLoser(thirdMatch, thirdWinner)

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
    <section className="space-y-5">
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
          fourth={fourth}
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

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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
          />
        ))}
      </div>

      {/* Playoff tree (only after the groups were locked) */}
      {bracket && (
        <>
          <h3 className="text-lg pt-10 font-bold">Playoffs (Single Elimination)</h3>
          <p className="text-xs theme-muted">
            The winners of Bracket A and Bracket B skip the quarter-finals and go straight to the semi-finals.
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
  if (status === 'error' || !data || data.teams.length < 8) {
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