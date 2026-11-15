/*
 * ====================================================================
 * OVERVIEW
 * ====================================================================
 * This file renders a two-stage tournament for pairs of players:
 *
 *   STAGE 1 - "Brackets" (round robin groups)
 *     Teams are split into 1, 2, 3 or 4 groups depending on how many pairs
 *     there are (see FORMATS). Inside each group
 *     every team plays every other team once. A standings table is
 *     computed live from the scores.
 *
 *   STAGE 2 - "Playoffs" (single elimination)
 *     When all group matches are scored, the user "locks" the groups.
 *     The top 2 teams of each group are seeded into a knockout tree
 *     (semi-finals for 2 groups, quarter-finals for 4 groups).
 *     The two semi-final LOSERS also play a 3rd-place match.
 *
 *   12 PAIRS = 3 GROUPS (A, B, C) of 4:
 *     The top 2 of each group = 6 teams. They are ranked as seeds 1-6
 *     (3 group winners, then 3 runners-up). Seeds 1 and 2 get a BYE,
 *     so only 2 quarter-finals are played (2 teams are eliminated) and
 *     4 teams reach the semi-finals:
 *
 *       Upper bracket:  seed 1 (bye)  +  seed 4 vs seed 5
 *       Lower bracket:  seed 2 (bye)  +  seed 3 vs seed 6
 *       Semi-finals:    seed 1 vs W(4/5)      seed 2 vs W(3/6)
 *
 * Scores are saved to the backend through `api` on every change.
 *
 * CHANGED (fix summary):
 *   1. API base URL: /quadro/... -> /top2/...   (this was the cause of the 404s)
 *   2. Top2_bracketing_e page: GET/DELETE now use /top2/:id
 *   3. GroupCard <thead>: comments moved onto their own lines
 *      (removes the "whitespace text nodes cannot be a child of <tr>" warning)
 *   4. GroupCard <tbody>: indentation tidied
 *   5. Removed the invalid `rounded: 'medium'` style key
 *   6. Renamed Quadro_View -> Top2_View (alias kept at the bottom of the file)
 *   7. New 3-group format for 12 pairs (FORMATS, createThreeGroupBracket)
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RotateCcw, Lock, Unlock, Trophy, Pencil} from 'lucide-react'
import api from '../../api'
// createBracket: builds an empty knockout tree from a list of seeded teams
// applyResults:  fills that tree with scores that were saved earlier
import { createBracket, applyResults } from './Bracket_Single_VIew'

// Route to go back to the list of tournaments
const LIST_ROUTE = '/dashboard/top2dashb'

/* ------------------------------------------------------------------ */
/* Score input helpers                                                 */
/* ------------------------------------------------------------------ */

// Highest score allowed in a match (games are played to 11)
const MAX_SCORE = 11

// Cleans what the user types into a score box:
//  1. removes everything that is not a digit
//  2. removes leading zeros ("007" -> "7")
//  3. caps the number at MAX_SCORE
// Returns '' when the box is empty so the placeholder "-" shows again.
const cleanScore = (value) => {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (digits === '') return ''
  return Number(digits) > MAX_SCORE ? String(MAX_SCORE) : digits
}

/* ------------------------------------------------------------------ */
/* Layout constants for the knockout tree (all values are pixels)      */
/* ------------------------------------------------------------------ */
const CARD_WIDTH = 200 // width of one match card
const ROUND_GAP = 56 // horizontal space between two rounds (where lines go)
const ROW_HEIGHT = 150 // vertical space reserved for each first-round match
const HEADER = 40 // space at the top for the round title
const LINE_COLOR = '#1ba3c6' // color of the lines connecting matches
const COLUMN = CARD_WIDTH + ROUND_GAP // total width of one round column

// A team's unique id. Saved teams use `pairId`; fall back to `id`.
// Returns null for an empty slot (so two empty slots compare as equal).
const teamKey = (t) => (t ? t.pairId ?? t.id : null)

// Shows the two players of a team, e.g. "Ana & Bia"
const pairLabel = (t) => `${t.player1} & ${t.player2}`

// Title shown above each round column.
// Counts from the END so the last round is always "Final", etc.
function getRoundName(roundIndex, totalRounds) {
  if (roundIndex === totalRounds - 1) return 'Final'
  if (roundIndex === totalRounds - 2) return 'Semi-finals'
  if (roundIndex === totalRounds - 3) return 'Quarter-finals'
  return `Round ${roundIndex + 1}`
}

/* ------------------------------------------------------------------ */
/* Knockout logic                                                      */
/* ------------------------------------------------------------------ */

// Decides who won a knockout match.
// Returns null if the match can't have a winner yet:
//  - a team is missing, or a score is empty, or the scores are tied.
function getWinner(match) {
  if (!match.team1 || !match.team2) return null
  if (match.score1 === '' || match.score2 === '') return null
  const s1 = Number(match.score1)
  const s2 = Number(match.score2)
  if (s1 === s2) return null
  return s1 > s2 ? match.team1 : match.team2
}

// Recalculates the WHOLE bracket after a score changed.
// It walks round by round (left to right):
//   - round 0 teams never change (they come from the groups)
//   - later rounds take their teams from the winners of the matches
//     that "feed" them (item.feeds)
// If the teams of a match changed, its old scores are no longer valid,
// so they are reset, and the match is remembered in `cleared` so the
// caller can also delete those scores on the server.
// NOTE: this MUTATES the bracket it receives (the caller passes a copy).
function propagate(bracket) {
  const cleared = []
  bracket.forEach((round, r) => {
    round.forEach((item, m) => {
      if (r > 0) {
        // Look up the winner of a feeder match (or null if none yet)
        const from = (f) => (f ? bracket[f.r][f.m].winner : null)

        if (item.kind === 'wait') {
          // "wait" item = a bye: only one feeder, the team just waits
          // for the next round
          item.team1 = from(item.feeds[0])
        } else {
          const t1 = from(item.feeds[0])
          const t2 = from(item.feeds[1])

          // Did either team in this match change?
          const changed =
            teamKey(t1) !== teamKey(item.team1) || teamKey(t2) !== teamKey(item.team2)

          if (changed) {
            // Only report it if there was a score that is about to be erased
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
      // A bye's "winner" is simply the waiting team;
      // a normal match's winner comes from the scores
      item.winner = item.kind === 'wait' ? item.team1 : getWinner(item)
    })
  })
  return cleared
}

// Works out the vertical (y) center of every card in the tree.
// Round 0 cards are spaced evenly. Every later card sits exactly in
// the middle of the matches that feed it - this gives the classic
// "bracket" shape.
function computeLayout(bracket) {
  const ys = bracket.map(() => [])
  bracket.forEach((round, r) => {
    round.forEach((item, m) => {
      if (r === 0) {
        ys[r][m] = HEADER + m * ROW_HEIGHT + ROW_HEIGHT / 2
      } else {
        const feederYs = item.feeds.map((f) => ys[f.r][f.m])
        // average of the feeder positions = the middle point
        ys[r][m] = feederYs.reduce((a, b) => a + b, 0) / feederYs.length
      }
    })
  })
  return ys
}

// The loser of a finished match = the team that is NOT the winner.
// Returns null while there is no winner yet.
function getLoser(match, winner) {
  if (!winner) return null
  return teamKey(winner) === teamKey(match.team1) ? match.team2 : match.team1
}

// A 3rd-place match only makes sense when the round before the final has
// exactly 2 real matches (the two semi-finals). This is true for both
// 4 qualifiers (semis + final) and 8 qualifiers (quarters + semis + final).
function hasThirdPlace(bracket) {
  if (bracket.length < 2) return false
  const semis = bracket[bracket.length - 2]
  return semis.length === 2 && semis.every((m) => m.kind !== 'wait')
}

// The 3rd-place teams are the LOSERS of the two semi-finals.
// Returns [loserOfSemi1, loserOfSemi2]; a slot is null until that semi is decided.
// Nothing is stored for these teams - they are always worked out from the bracket,
// so they can never get out of sync with the semi-final scores.
function getThirdPlaceTeams(bracket) {
  if (!hasThirdPlace(bracket)) return [null, null]
  const semis = bracket[bracket.length - 2]
  return semis.map((match) => getLoser(match, match.winner))
}

/* ------------------------------------------------------------------ */
/* Inline styles for the score inputs and names                        */
/* ------------------------------------------------------------------ */

// Yellow score box used in the playoff cards
// CHANGED: removed the invalid `rounded: 'medium'` key (borderRadius already does the job)
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

// Yellow score box used in the group (round robin) lists - a bit bigger
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

// Style for a team name: bold + dark when a team is known,
// light grey when it is still "TBD"
const nameStyle = (team) => ({
  fontWeight: team ? 600 : 400,
  color: team ? '#222' : '#999',
  borderRadius: 6,
})

/* ------------------------------------------------------------------ */
/* Knockout UI components                                              */
/* ------------------------------------------------------------------ */

// One playoff match: two score inputs on top, team names below.
// `onScore(key, value)` is called with 'score1' or 'score2'.
function MatchCard({ match, onScore }) {
  const { team1, team2 } = match
  // Scores can only be typed once BOTH teams are known
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
      {/* Score row:  [ score1 ] : [ score2 ] */}
      <div className="flex justify-center items-center gap-1.5" style={{ margin: '8px 0' }}>
        <input
          type="text"
          inputMode="numeric" // shows the number keypad on phones
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

      {/* Names row:  Team 1 vs Team 2  (or "TBD" if not decided yet) */}
      <div className="flex flex-row flex-wrap justify-center rounded-md items-center gap-1 text-[13px]">
        <span style={nameStyle(team1)}>{team1 ? pairLabel(team1) : 'TBD'}</span>
        <span className="text-gray-500">vs</span>
        <span style={nameStyle(team2)}>{team2 ? pairLabel(team2) : 'TBD'}</span>
      </div>
    </div>
  )
}

// Dashed card for a "bye": a team with no opponent this round,
// so it just waits for the next round.
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
// Cards are placed with `position: absolute` using the coordinates
// from computeLayout(). Lines are drawn in one SVG layer behind them.
// `thirdPlace` (optional) = { match, onScore } for the 3rd-place match.
// It is drawn in the FINAL's column, one row below the final.
function BracketTree({ bracket, onScore, thirdPlace }) {
  if (!bracket.length) return null

  const ys = computeLayout(bracket) // y position of every card
  const width = bracket.length * COLUMN - ROUND_GAP // total tree width

  const lastCol = (bracket.length - 1) * COLUMN // x of the final's column
  const finalY = ys[bracket.length - 1][0] // y of the final's card
  const thirdY = finalY + ROW_HEIGHT // y of the 3rd-place card
  const treeHeight = Math.max(...ys.flat()) + ROW_HEIGHT / 2
  // Make the tree taller if the 3rd-place card would not fit
  const height = thirdPlace ? Math.max(treeHeight, thirdY + ROW_HEIGHT / 2) : treeHeight

  return (
    <div className="relative rounded-md" style={{ width, height }}>
      {/* Round titles ("Quarter-finals", "Semi-finals", "Final") */}
      {bracket.map((_, r) => (
        <h3
          key={r}
          className="absolute text-center text-xs font-semibold"
          style={{ left: r * COLUMN, top: 0, width: CARD_WIDTH }}
        >
          {getRoundName(r, bracket.length)}
        </h3>
      ))}

      {/* Connecting lines. pointerEvents none = clicks pass through to the cards */}
      <svg
        width={width}
        height={height}
        className="absolute left-0 top-0"
        style={{ pointerEvents: 'none' }}
      >
        {bracket.flatMap((round, r) =>
          round.flatMap((item, m) =>
            // One line for each feeder match -> this match
            item.feeds.map((f, k) => {
              const x1 = f.r * COLUMN + CARD_WIDTH // right edge of the feeder card
              const y1 = ys[f.r][f.m] // feeder's vertical center
              const x2 = r * COLUMN // left edge of this card
              const y2 = ys[r][m] // this card's vertical center
              const midX = x2 - ROUND_GAP / 2 // where the line turns vertical
              return (
                <path
                  key={`${item.id}-${k}`}
                  // H = horizontal line, V = vertical line:
                  // go right, go up/down, go right again (elbow shape)
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

      {/* The cards themselves */}
      {bracket.flatMap((round, r) =>
        round.map((item, m) => (
          <div
            key={item.id}
            className="absolute"
            // translateY(-50%) centers the card on its y coordinate
            style={{ left: r * COLUMN, top: ys[r][m], transform: 'translateY(-50%)' }}
          >
            {item.kind === 'wait' ? (
              <WaitCard item={item} />
            ) : (
              // Tell the parent WHICH match (round r, match m) changed
              <MatchCard match={item} onScore={(key, value) => onScore(r, m, key, value)} />
            )}
          </div>
        ))
      )}

      {/* "Championship" label right above the final's card (same style as "Fighting for 3rd") */}
      <h3
        className="absolute text-center text-xs font-semibold"
        style={{ left: lastCol, top: finalY - 70, width: CARD_WIDTH }}
      >
        Championship
      </h3>

      {/* 3rd place match: losers of the two semi-finals */}
      {/* {thirdPlace && (
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
      )} */}
    </div>
  )
}

function PlaceCard({ label, team, icon, featured = false }) {
  return (
    <div
      className={`w-full   text-center space-y-1 ${
        featured ? 'p-5' : 'p-4'
      }`}
    >
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



function ChampionBanner({ champion, second, third, fourth, showThird }) {
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
          <PlaceCard
            featured
            label=""
            team={champion}
             
          />

          <div className="flex h-36 w-full max-w-[200px] flex-col items-center justify-center rounded-t-lg border-2 border-yellow-500 bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-xl">
            <span className="text-5xl font-black text-yellow-900">1</span>
            <span className="text-sm font-black text-yellow-900">CHAMPION</span>
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
/* (how many groups / who advances depends on the pairs: see FORMATS)  */
/* ------------------------------------------------------------------ */

// The tournament format for each size. The FIRST row that fits is used:
//   - a row with `exact` fits only those pair counts
//   - any other row fits when the pairs are <= `maxPairs`
// To change a limit, just edit the numbers here.
//   groups  = group letters (how many round-robin groups there are)
//   advance = how many teams of EACH group go to the playoffs
const FORMATS = [
  // 12 pairs  : 3 groups (A, B, C) of 4, top 2 of each = 6 teams
  //             -> Quarter-finals with 2 byes, then semi-finals
  { exact: [12], groups: ['A', 'B', 'C'], advance: 2 },
  // 2-3 pairs : 1 group, top 2 play the Final (no semi-finals, no 3rd place)
  { maxPairs: 3, groups: ['A'], advance: 2 },
  // 4-5 pairs : 1 group, top 4 -> Semi-finals (1st vs 4th, 2nd vs 3rd)
  { maxPairs: 5, groups: ['A'], advance: 4 },
  // 6-10 pairs: 2 groups, top 2 of each = 4 teams -> Semi-finals
  { maxPairs: 10, groups: ['A', 'B'], advance: 2 },
  // 11+ pairs : 4 groups, top 2 of each = 8 teams -> Quarter-finals
  { maxPairs: Infinity, groups: ['A', 'B', 'C', 'D'], advance: 2 },
]

const getFormat = (teamsCount) =>
  FORMATS.find((f) => (f.exact ? f.exact.includes(teamsCount) : teamsCount <= f.maxPairs))

// One-line description of the format for a team count, e.g. for the
// "new tournament" page, so its helper text always matches the real bracket:
//   getFormatSummary(10) -> "10 teams are split into 2 groups (A-B), up to 5 per group. The top 4 qualify for the semi-finals."
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

// Which group letters to use for this many teams
function getGroupNamesForTeams(teamsCount) {
  return getFormat(teamsCount).groups
}

// Which group a team ends up in, from its position in the team list (0 = first team).
// Uses the same slicing as splitIntoGroups(), so the registration form can show
// "Group A/B/C/D" next to each team and it always matches the real bracket.
export function getGroupLabel(index, teamsCount) {
  const names = getGroupNamesForTeams(teamsCount)
  const size = Math.ceil(teamsCount / names.length)
  return names[Math.floor(index / size)]
}

// Cuts the team list into equal slices, one per group.
// Example: 10 teams, 2 groups -> size 5 -> A = teams 0-4, B = teams 5-9.
// If it doesn't divide evenly the last group is just smaller.
function splitIntoGroups(teams) {
  const groupNames = getGroupNamesForTeams(teams.length)
  const size = Math.ceil(teams.length / groupNames.length)

  return groupNames.map((name, g) => ({
    name,
    teams: teams.slice(g * size, (g + 1) * size),
  }))
}

// Classic "circle method" round robin schedule: every team plays every
// other team exactly once. Returns an array of rounds, each round is a
// list of [teamA, teamB] pairings.
function roundRobin(teams) {
  const list = [...teams]
  // Odd number of teams -> add a "null" dummy so someone sits out each round
  if (list.length % 2) list.push(null)
  const n = list.length
  const rounds = []
  for (let r = 0; r < n - 1; r++) {
    const games = []
    for (let i = 0; i < n / 2; i++) {
      // Pair the first half with the second half (mirrored)
      const a = list[i]
      const b = list[n - 1 - i]
      // Skip pairings with the dummy (that team has a bye)
      if (a && b) games.push([a, b])
    }
    rounds.push(games)
    // Rotate: keep the first team fixed, move the last team to position 1
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

// Reads the typed scores of a group match and returns the result,
// or null if it's not finished (empty box or a tie).
// `scores` looks like: { [matchId]: { score1: '11', score2: '7' } }
function getResult(match, scores) {
  const s = scores[match.id]
  if (!s || s.score1 === '' || s.score2 === '') return null
  const score1 = Number(s.score1)
  const score2 = Number(s.score2)
  if (score1 === score2) return null
  return { score1, score2, winner: score1 > score2 ? match.team1 : match.team2 }
}

// Ranking rule for two standings rows (also used to rank teams ACROSS groups
// when the playoff seeds are drawn). Tie-breakers, in order:
//  1. most wins
//  2. best point difference (pf - pa)
//  3. most points scored
//  4. team name A-Z (so the order is always stable)
const compareRows = (x, y) =>
  y.wins - x.wins ||
  y.pf - y.pa - (x.pf - x.pa) ||
  y.pf - x.pf ||
  x.team.name.localeCompare(y.team.name, undefined, { numeric: true })

// Builds the standings table of ONE group.
// Each row tracks: played, wins, losses, points for (pf), points against (pa)
function computeStandings(group, matches, scores) {
  // Start every team with zeros, keyed by team id for fast lookup
  const rows = Object.fromEntries(
    group.teams.map((t) => [t.id, { team: t, played: 0, wins: 0, losses: 0, pf: 0, pa: 0 }])
  )

  // Add each finished match to both teams' rows
  matches.forEach((m) => {
    const res = getResult(m, scores)
    if (!res) return // unfinished matches don't count
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

  // Sort the table with the shared ranking rule
  return Object.values(rows).sort(compareRows)
}

// Standings for ALL groups at once: { A: [...rows], B: [...rows], ... }
const standingsFor = (groups, matchesByGroup, scores) =>
  Object.fromEntries(
    groups.map((g) => [g.name, computeStandings(g, matchesByGroup[g.name], scores)])
  )

// Picks the playoff teams from the standings and puts them in bracket order.
// The order matters: consecutive pairs play each other in round 1, and the
// pattern keeps teams from the same group apart (they meet later on).
// (Index [0] = 1st place, [1] = 2nd place.)
// NOTE: only used for 1, 2 and 4 groups. The 3-group format (12 pairs)
// builds its own tree in createThreeGroupBracket().
function seedQualifiers(standingsByGroup) {
  const groupNames = Object.keys(standingsByGroup)

  // 1 group (few pairs): everybody is in group A
  if (groupNames.length === 1) {
    const T = standingsByGroup['A'].map((r) => r.team)
    // 4+ pairs -> top 4 -> semi-finals: 1st vs 4th, 2nd vs 3rd
    if (T.length >= 4) return [T[0], T[3], T[1], T[2]]
    // 2-3 pairs -> top 2 go straight to the final
    return [T[0], T[1]]
  }

  if (groupNames.length === 2) {
    // 2 groups -> 4 playoff teams -> semi-finals
    //   Semi 1: A1 vs B2     Semi 2: B1 vs A2
    const A = standingsByGroup['A'].map((r) => r.team)
    const B = standingsByGroup['B'].map((r) => r.team)
    return [A[0] || null, B[1] || null, B[0] || null, A[1] || null]
  }

  // 4 groups -> 8 playoff teams -> quarter-finals
  //   QF1: A1 vs B2   QF2: C1 vs D2   QF3: B1 vs A2   QF4: D1 vs C2
  const A = standingsByGroup['A'].map((r) => r.team)
  const B = standingsByGroup['B'].map((r) => r.team)
  const C = standingsByGroup['C'].map((r) => r.team)
  const D = standingsByGroup['D'].map((r) => r.team)

  return [A[0] || null, B[1] || null, C[0] || null, D[1] || null, B[0] || null, A[1] || null, D[0] || null, C[1] || null]
}

/* ------------------------------------------------------------------ */
/* 3-group playoff (12 pairs): 6 teams, seeds 1-2 have a bye          */
/* ------------------------------------------------------------------ */

// Builds the 6-team knockout tree from the standings of groups A, B and C.
// The top 2 of every group are ranked into seeds 1-6:
//   seeds 1-3 = the group winners, seeds 4-6 = the runners-up
// (inside each tier: most wins, then point difference, then points scored).
//
//   Quarter-finals                Semi-finals              Final
//   UPPER  [ seed 1 - bye ] ------\
//          [ 4 vs 5       ] ------/ Semi 1: 1 vs W(4/5) ---\
//                                                           Final
//   LOWER  [ seed 2 - bye ] ------\                        /
//          [ 3 vs 6       ] ------/ Semi 2: 2 vs W(3/6) ---/
//
// 2 quarter-finals are played, so 2 teams are eliminated and 4 reach the semis.
// If 3 vs 6 would be two teams of the same group, seeds 5 and 6 are swapped.
function createThreeGroupBracket(standingsByGroup) {
  const names = Object.keys(standingsByGroup)
  const tier = (rank) =>
    names
      .map((n) => standingsByGroup[n][rank])
      .filter(Boolean)
      .sort(compareRows)
      .map((row) => row.team)
  const seeds = [...tier(0), ...tier(1)] // index 0 = seed 1

  // Avoid a quarter-final between two teams of the same group
  const groupOf = {}
  names.forEach((n) => standingsByGroup[n].forEach((r) => (groupOf[r.team.id] = n)))
  const sameGroup = (a, b) => !!a && !!b && groupOf[a.id] === groupOf[b.id]
  const clashes = (q) =>
    [[3, 6], [4, 5]].filter(([x, y]) => sameGroup(q[x - 1], q[y - 1])).length
  const swapped = seeds.slice()
  ;[swapped[4], swapped[5]] = [swapped[5], swapped[4]] // swap seeds 5 and 6
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
    // Round 0: quarter-finals (2 byes + 2 real matches)
    [
      bye('r0-m0', S(1)), // upper bracket: seed 1 waits
      match('r0-m1', [], S(4), S(5)), // upper bracket: 4 vs 5
      bye('r0-m2', S(2)), // lower bracket: seed 2 waits
      match('r0-m3', [], S(3), S(6)), // lower bracket: 3 vs 6
    ],
    // Round 1: semi-finals
    [
      match('r1-m0', [{ r: 0, m: 0 }, { r: 0, m: 1 }]),
      match('r1-m1', [{ r: 0, m: 2 }, { r: 0, m: 3 }]),
    ],
    // Round 2: final
    [match('r2-m0', [{ r: 1, m: 0 }, { r: 1, m: 1 }])],
  ]

  propagate(bracket) // puts the two bye teams into the semi-finals
  return bracket
}

// Fills a fresh 3-group tree with scores that were saved on the server.
// `results` rows look like { round, matchNumber, pair1Id, pair2Id, score1, score2 }.
// Goes round by round so each round already knows its teams before its
// scores are applied. The server may have stored the two teams in the
// opposite order, so the scores are swapped when needed.
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
  // The saved 3rd-place match is stored as round = (number of rounds + 1).
  // The tree has no such round, so keep it away from the apply function.
  const treeResults = savedKnockout.filter((x) => x.round <= fresh.length)
  return Object.keys(standingsByGroup).length === 3
    ? applyThreeGroupResults(fresh, treeResults)
    : applyResults(fresh, treeResults)
}

// Takes the group scores saved on the server and converts them to the
// `scores` format used by this component ({ [matchId]: {score1, score2} }).
// The server may have stored a match with the teams in the opposite order,
// so we check both orders and swap the scores when needed.
function restoreScores(matchesByGroup, saved) {
  const out = {}
  Object.values(matchesByGroup)
    .flat()
    .forEach((m) => {
      // Find the saved row for this match (same group, same two pairs,
      // in either order)
      const s = saved.find(
        (x) =>
          x.group === m.group &&
          ((x.pair1Id === m.team1.pairId && x.pair2Id === m.team2.pairId) ||
            (x.pair1Id === m.team2.pairId && x.pair2Id === m.team1.pairId))
      )
      if (!s) return // no saved score for this match
      // true = saved in the same order as our match
      const same = s.pair1Id === m.team1.pairId
      out[m.id] = {
        score1: String(same ? s.score1 : s.score2),
        score2: String(same ? s.score2 : s.score1),
      }
    })
  return out
}

/* ------------------------------------------------------------------ */
/* Standings legend: explains the abbreviations used in the tables     */
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
// `advance` = how many teams of this group go to the playoffs (they are shown in bold)
function GroupCard({ group, matches, standings, scores, locked, onScore, advance }) {
  return (
    <div className="theme-card rounded-xl border theme-border p-4 space-y-4">
      <h3 className="text-lg font-bold flex justify-between items-center w-full items-center ">Bracket {group.name}
         <p className="text-xs text-right theme-muted">Top {advance} (bold) advance to the playoffs.</p>
      </h3>
      

      {/* Standings table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* CHANGED: every comment is on its own line, so no whitespace text
              nodes end up inside <tr> (fixes the React hydration warning) */}
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
                // The qualifying rows are bold, the rest are faded
                className={`  border-b border-t theme-border space-y-1 ${i < advance ? 'font-semibold' : 'opacity-70'}`}
              >
                <td className="py-3 pr-3  align-top text-sm">{i + 1}</td>
                {/* CHANGED: indentation tidied */}
                <td className="py-3 align-top border-b border-white/10 theme-border ">
                  <div className="text-sm capitalize">{pairLabel(row.team)}</div>
                  <div className="mt-0.5 text-xs font-normal capitalize theme-muted">{row.team.name}</div>
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
 
    {/* List of this group's matches, each with two score inputs */}
    <div className="flex flex-row w-full gap-2">

        <div className="flex flex-col items-center  min-w-[120px]">
          <h1 className="font-bold mb-1">List of teams</h1>

          <span className="text-xs theme-muted mb-4">
            Bracket {group.name}
          </span>

          {group.teams.map((team, index) => {
            const teamNumber =
              (['A', 'B', 'C'].indexOf(group.name) * 4) + index + 1

            return (
              <div
                key={team.id}
                className="w-full py-1   "
              >
                <div className="font-semibold text-center  text-sm">
                  {pairLabel(team)}
                </div>

                <div className="text-xs text-center  theme-muted mt-1">
                  Team {teamNumber}
                </div>
              </div>
            )
          })}
        </div>

        <span className='border-r border-white/10'> </span>
      <div className="w-full flex flex-col space-y-2 items-center">

        <span className="flex items-center text-center font-bold pb-2">
          Round Robin
        </span>

        {matches.map((m) => {
          const s = scores[m.id] || { score1: '', score2: '' }

          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 w-full text-[13px]"
            >

              {/* Team 1 */}
              <span className="min-w-0 flex-1 text-right break-words leading-tight">
                <span className="font-semibold">
                  {m.team1.name}
                </span>
                <span className="text-xs capitalize theme-muted ml-1">
                  ({pairLabel(m.team1)})
                </span>
              </span>

              {/* Score 1 */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                disabled={locked}
                placeholder="-"
                value={s.score1}
                style={groupScoreBox}
                aria-label={`${m.team1.name} score`}
                onChange={(e) =>
                  onScore(m, 'score1', cleanScore(e.target.value))
                }
              />

              <span className="font-bold">:</span>

              {/* Score 2 */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                disabled={locked}
                placeholder="-"
                value={s.score2}
                style={groupScoreBox}
                aria-label={`${m.team2.name} score`}
                onChange={(e) =>
                  onScore(m, 'score2', cleanScore(e.target.value))
                }
              />

              {/* Team 2 */}
              <span className="min-w-0 flex-1 break-words leading-tight">
                <span className="font-semibold">
                  {m.team2.name}
                </span>
                <span className="text-xs capitalize theme-muted ml-1">
                  ({pairLabel(m.team2)})
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
/* Top2_View: the main component. Holds all the state and logic.     */
/* ------------------------------------------------------------------ */
export function Top2_View({
  tournamentId,
  tournamentName,
  teams,
  savedGroupMatches = [], // group scores already saved on the server
  savedKnockout = [], // playoff scores already saved on the server
  onReset,
}) {
  // ---- Derived data (recomputed only when its inputs change) ----
  // Team numbers: a team still carrying an auto name ("Team 2") is renamed from its
  // position in the list, so the groups always show Team 1-4, Team 5-8, Team 9-12 ...
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
  // Saved server scores converted to the local `scores` format
  const initialScores = useMemo(
    () => restoreScores(groupMatches, savedGroupMatches),
    [groupMatches, savedGroupMatches]
  )

  // ---- State ----
  // scores:   group-stage scores typed so far
  const [scores, setScores] = useState(initialScores)

  // bracket:  the knockout tree, or null if playoffs haven't started.
  // If playoff scores were saved before, rebuild the tree and refill it.
  const [bracket, setBracket] = useState(() => {
    if (!savedKnockout.length) return null
    const st = standingsFor(groups, groupMatches, initialScores)
    return restorePlayoffBracket(st, savedKnockout)
  })

  // champion: winner of the final (last round, first match), if any
  const [champion, setChampion] = useState(
    () => bracket?.[bracket.length - 1]?.[0]?.winner ?? null
  )

  // thirdScores: scores of the 3rd-place match.
  // Only the scores are stored; the two teams come from the semi-final losers.
  const [thirdScores, setThirdScores] = useState(() => {
    const empty = { score1: '', score2: '' }
    if (!bracket) return empty
    // saved as round = rounds + 1, match number 1
    const saved = savedKnockout.find((x) => x.round === bracket.length + 1)
    if (!saved) return empty
    // the server may have saved the two teams in the opposite order: swap if so
    const [t1] = getThirdPlaceTeams(bracket)
    const same = saved.pair1Id === teamKey(t1)
    return {
      score1: String(same ? saved.score1 : saved.score2),
      score2: String(same ? saved.score2 : saved.score1),
    }
  })

  // error:    message shown at the bottom when an API call fails
  const [error, setError] = useState('')

  // Base URL for all API calls of this tournament
  // CHANGED: was `/quadro/${tournamentId}` - this was causing the 404s
  const base = `/top2/${tournamentId}`

  // Live standings tables, updated whenever a score changes
  const standings = useMemo(
    () => standingsFor(groups, groupMatches, scores),
    [groups, groupMatches, scores]
  )

  // ---- Progress info ----
  const allMatches = Object.values(groupMatches).flat()
  const doneCount = allMatches.filter((m) => getResult(m, scores)).length // finished matches
  const groupsDone = doneCount === allMatches.length // true when every group match has a result
  const locked = !!bracket // groups are locked once playoffs exist
  const advance = getFormat(teams.length).advance // teams per group that qualify

  // ---- 3rd place match (derived from the bracket) ----
  const showThird = !!bracket && hasThirdPlace(bracket)
  const thirdTeams = useMemo(
    () => (bracket ? getThirdPlaceTeams(bracket) : [null, null]),
    [bracket]
  )
  const thirdMatch = { team1: thirdTeams[0], team2: thirdTeams[1], ...thirdScores }
  const thirdWinner = getWinner(thirdMatch) // null until it has a clear winner

  // ---- Final ranking: 1st-4th ----
  // 1st = champion (winner of the final)      2nd = loser of the final
  // 3rd = winner of the 3rd-place match       4th = loser of the 3rd-place match
  const finalMatch = bracket ? bracket[bracket.length - 1][0] : null
  const runnerUp = finalMatch ? getLoser(finalMatch, champion) : null
  const fourth = getLoser(thirdMatch, thirdWinner)

  // ---- Handlers ----

  // Called when a score box in a GROUP match changes
  const updateGroupScore = (match, key, value) => {
    // Remember if this match already had a valid result BEFORE the change
    const hadResult = !!getResult(match, scores)

    // Save the new value in local state right away (UI feels instant)
    const next = {
      ...scores,
      [match.id]: { ...(scores[match.id] || { score1: '', score2: '' }), [key]: value },
    }
    setScores(next)

    // Does the match have a valid result AFTER the change?
    const res = getResult(match, next)
    const ids = { group: match.group, pair1Id: match.team1.pairId, pair2Id: match.team2.pairId }

    if (res) {
      // Valid result -> save it on the server
      api
        .put(`${base}/group-matches`, {
          ...ids,
          score1: res.score1,
          score2: res.score2,
          winnerPairId: res.winner.pairId,
        })
        .catch(() => setError('Could not save the score.'))
    } else if (hadResult) {
      // It HAD a result but not anymore (user erased or tied it)
      // -> delete it from the server
      api.delete(`${base}/group-matches`, { data: ids }).catch(() => setError('Could not clear the score.'))
    }
  }

  // "Lock brackets & start playoffs" button:
  // seeds the top teams of each group into a fresh knockout tree
  const startKnockout = () => {
    setBracket(createPlayoffBracket(standings))
    setChampion(null)
    setThirdScores({ score1: '', score2: '' })
  }

  // "Unlock brackets" button: goes back to the group stage.
  // Playoff scores are deleted on the server, after the user confirms.
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
    // Copy the whole tree so we never mutate React state directly
    const next = bracket.map((round) => round.map((item) => ({ ...item })))
    const item = next[r][m]

    const before = teamKey(item.winner) // winner before the change
    item[key] = value // apply the typed score
    const cleared = propagate(next) // recompute winners & later rounds
    const after = teamKey(item.winner) // winner after the change

    // If a semi-final result changed, the 3rd-place teams may have changed too.
    // Their old score no longer belongs to these teams, so wipe it (also on the server).
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
    // The champion is the winner of the final (the last round's only match)
    setChampion(next[next.length - 1][0].winner || null)

    if (item.winner) {
      // This match has a winner -> save it on the server
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
      // It used to have a winner but doesn't now -> delete the saved result
      api.delete(`${base}/matches/${r + 1}/${m + 1}`).catch(() => setError('Could not clear the score.'))
    }

    // Later matches whose teams changed had their scores wiped
    // by propagate(); delete those from the server too
    cleared.forEach((c) =>
      api
        .delete(`${base}/matches/${c.round}/${c.matchNumber}`)
        .catch(() => setError('Could not clear a later score.'))
    )
  }

  // Called when a score box in the 3rd-place match changes.
  // Saved like a normal playoff match, using round = (number of rounds + 1), match 1.
  const updateThirdScore = (key, value) => {
    const nextScores = { ...thirdScores, [key]: value }
    setThirdScores(nextScores)

    const hadWinner = !!getWinner(thirdMatch) // winner BEFORE the change
    const match = { ...thirdMatch, ...nextScores }
    const winner = getWinner(match) // winner AFTER the change
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border theme-muted p-5">
        <div>
          <h2 className="text-xl font-bold capitalize">{tournamentName}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {teams.length} teams · {groups.length} {groups.length === 1 ? 'Bracket' : 'Brackets'} of {Math.ceil(teams.length / groups.length)} · Group matches{' '}
            {doneCount}/{allMatches.length}
          </p>
        </div>

        <div className="flex w-full flex-row justify-end gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm theme-border theme-hover theme-accent"
          >
            <RotateCcw size={16} /> Reset tournament
          </button>

          <button
            onClick={ ""}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm theme-border theme-hover theme-accent"
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
          fourth={fourth}
          showThird={showThird}
        />
      )}

      {/* Legend: explains the standings columns */}
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

      {/* Group stage title + Lock / Unlock button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Bracket Stage (Round Robin)</h3>
        {!locked ? (
          // Disabled until every group match has a result
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

      {/* One card per group: 1 column on mobile, 2 on large screens
          (always 1 if there is a single group, 3 on wide screens if there are 3 groups) */}
      <div
        className={`grid gap-4 ${
          groups.length === 1
            ? 'grid-cols-1'
            : groups.length === 3
              ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
              : 'grid-cols-1 lg:grid-cols-2'
        }`}
      >
        {groups.map((g) => (
          <GroupCard
            key={g.name}
            group={g}
            matches={groupMatches[g.name]}
            standings={standings[g.name]}
            scores={scores}
            locked={locked}
            onScore={updateGroupScore}
            advance={advance}
          />
        ))}
      </div>

      {/* Playoff tree (only after the groups were locked) */}
      {bracket && (
        <>
          <h3 className="text-lg pt-10 font-bold">Playoffs (Single Elimination)</h3>
          {groups.length === 3 && (
            <p className="text-xs theme-muted">
              The top 2 of each group (6 teams) are seeded by group finish. Seeds 1 and 2 get a bye, the
              other 4 teams play the quarter-finals (upper and lower bracket), so 4 teams reach the semi-finals.
            </p>
          )}
          {/* overflow-x-auto lets the wide tree scroll sideways on small screens */}
          <div className="overflow-x-auto rounded-xl p-6 theme-accent">
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
/* Loads the tournament from the API and hands it to Top2_View.      */
/* ------------------------------------------------------------------ */
export const Top2_bracketing_e = () => {
  const { id } = useParams() // tournament id from the URL
  const navigate = useNavigate()
  const [data, setData] = useState(null) // tournament data from the server
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  // Fetch the tournament whenever the id changes
  useEffect(() => {
    let cancelled = false // protects against setting state after unmount
    setStatus('loading')
    api
      .get(`/top2/${id}`) // CHANGED: was /quadro/${id}
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    // Cleanup: if the component unmounts or id changes, ignore the old request
    return () => {
      cancelled = true
    }
  }, [id])

  // Deletes the whole tournament (after confirmation) and goes back to the list
  const handleReset = async () => {
    if (!window.confirm('Reset this tournament? All scores will be lost.')) return
    try {
      await api.delete(`/top2/${id}`) // CHANGED: was /quadro/${id}
    } catch {
      // Ignore errors: we navigate away either way
    }
    navigate(LIST_ROUTE)
  }

  if (status === 'loading') return <p className="px-10 theme-muted">Loading tournament...</p>

  // Error, no data, or fewer than 2 teams = nothing to play
  if (status === 'error' || !data || data.teams.length < 2) {
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
// Once you change that import to { Top2_View }, you can delete this line.
export const Quadro_View = Top2_View