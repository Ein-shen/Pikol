import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RotateCcw, Lock, Unlock, Trophy } from 'lucide-react'
import api from '../../../api'
import { createBracket, applyResults } from '../Single/Bracket_Single_VIew'

const LIST_ROUTE = '/dashboard/quadrodashb'

const MAX_SCORE = 11
const cleanScore = (value) => {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (digits === '') return ''
  return Number(digits) > MAX_SCORE ? String(MAX_SCORE) : digits
}

const CARD_WIDTH = 200
const ROUND_GAP = 56
const ROW_HEIGHT = 150
const HEADER = 40
const LINE_COLOR = '#1ba3c6'
const COLUMN = CARD_WIDTH + ROUND_GAP

const teamKey = (t) => (t ? t.pairId ?? t.id : null)
const pairLabel = (t) => `${t.player1} & ${t.player2}`

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
})

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
        width: CARD_WIDTH,
        background: '#fafafa',
        padding: '8px',
        textAlign: 'center',
        border: '1px dashed #bbb',
      }}
    >
      <p className="text-[11px] uppercase tracking-wide text-gray-500">Waiting for next round</p>
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
      {bracket.map((_, r) => (
        <h3
          key={r}
          className="absolute text-center text-xs font-semibold text-gray-500"
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

/* ------------------------------------------------------------------ */
/* Dynamic Group Splitting (2 Brackets for <12 Teams, 4 for 12+)      */
/* ------------------------------------------------------------------ */
function getGroupNamesForTeams(teamsCount) {
  if (teamsCount < 12) return ['A', 'B']
  return ['A', 'B', 'C', 'D']
}

function splitIntoGroups(teams) {
  const groupNames = getGroupNamesForTeams(teams.length)
  const size = Math.ceil(teams.length / groupNames.length)

  return groupNames.map((name, g) => ({
    name,
    teams: teams.slice(g * size, (g + 1) * size),
  }))
}

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

function getResult(match, scores) {
  const s = scores[match.id]
  if (!s || s.score1 === '' || s.score2 === '') return null
  const score1 = Number(s.score1)
  const score2 = Number(s.score2)
  if (score1 === score2) return null
  return { score1, score2, winner: score1 > score2 ? match.team1 : match.team2 }
}

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

function seedQualifiers(standingsByGroup) {
  const groupNames = Object.keys(standingsByGroup)

  if (groupNames.length === 2) {
    // 2 Brackets (e.g. 10 pairs) -> 4 playoff teams (Semi-finals)
    const A = standingsByGroup['A'].map((r) => r.team)
    const B = standingsByGroup['B'].map((r) => r.team)
    return [A[0] || null, B[1] || null, B[0] || null, A[1] || null]
  }

  // 4 Brackets (e.g. 16 or 20 pairs) -> 8 playoff teams (Quarter-finals)
  const A = standingsByGroup['A'].map((r) => r.team)
  const B = standingsByGroup['B'].map((r) => r.team)
  const C = standingsByGroup['C'].map((r) => r.team)
  const D = standingsByGroup['D'].map((r) => r.team)

  return [A[0] || null, B[1] || null, C[0] || null, D[1] || null, B[0] || null, A[1] || null, D[0] || null, C[1] || null]
}

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

function GroupCard({ group, matches, standings, scores, locked, onScore }) {
  return (
    <div className="theme-card rounded-xl border theme-border p-4 space-y-4">
      <h3 className="text-lg font-bold">Bracket {group.name}</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs theme-muted">
              <th className="py-1">#</th>
              <th>Team</th>
              <th className="text-center">P</th>
              <th className="text-center">W</th>
              <th className="text-center">L</th>
              <th className="text-center">PF</th>
              <th className="text-center">PA</th>
              <th className="text-center">+/-</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr
                key={row.team.id}
                className={`border-t theme-border ${i < 2 ? 'font-semibold' : 'opacity-70'}`}
              >
                <td className="py-1.5">{i + 1}</td>
                <td>
                  {row.team.name}
                  <div className="text-xs font-normal theme-muted">{pairLabel(row.team)}</div>
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
        <p className="mt-1 text-xs theme-muted">Top 2 (bold) advance to the playoffs.</p>
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

export function Quadro_View({
  tournamentId,
  tournamentName,
  teams,
  savedGroupMatches = [],
  savedKnockout = [],
  onReset,
}) {
  const groups = useMemo(() => splitIntoGroups(teams), [teams])
  const groupMatches = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.name, buildGroupMatches(g)])),
    [groups]
  )
  const initialScores = useMemo(
    () => restoreScores(groupMatches, savedGroupMatches),
    [groupMatches, savedGroupMatches]
  )

  const [scores, setScores] = useState(initialScores)
  const [bracket, setBracket] = useState(() => {
    if (!savedKnockout.length) return null
    const st = standingsFor(groups, groupMatches, initialScores)
    return applyResults(createBracket(seedQualifiers(st)), savedKnockout)
  })
  const [champion, setChampion] = useState(
    () => bracket?.[bracket.length - 1]?.[0]?.winner ?? null
  )
  const [error, setError] = useState('')

  const base = `/quadro/${tournamentId}`
  const standings = useMemo(
    () => standingsFor(groups, groupMatches, scores),
    [groups, groupMatches, scores]
  )

  const allMatches = Object.values(groupMatches).flat()
  const doneCount = allMatches.filter((m) => getResult(m, scores)).length
  const groupsDone = doneCount === allMatches.length
  const locked = !!bracket

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

  const startKnockout = () => {
    setBracket(createBracket(seedQualifiers(standings)))
    setChampion(null)
  }

  const unlockGroups = () => {
    if (!window.confirm('Unlock the brackets? Playoff scores will be cleared.')) return
    api.delete(`${base}/matches`).catch(() => setError('Could not clear playoff scores.'))
    setBracket(null)
    setChampion(null)
  }

  const updateKnockoutScore = (r, m, key, value) => {
    const next = bracket.map((round) => round.map((item) => ({ ...item })))
    const item = next[r][m]
    const before = teamKey(item.winner)
    item[key] = value
    const cleared = propagate(next)
    const after = teamKey(item.winner)

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
    cleared.forEach((c) =>
      api
        .delete(`${base}/matches/${c.round}/${c.matchNumber}`)
        .catch(() => setError('Could not clear a later score.'))
    )
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border theme-muted p-5">
        <div>
          <h2 className="text-xl font-bold capitalize">{tournamentName}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {teams.length} teams · {groups.length} Brackets of {Math.ceil(teams.length / groups.length)} · Group matches{' '}
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

      {champion && <ChampionBanner champion={champion} />}

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <GroupCard
            key={g.name}
            group={g}
            matches={groupMatches[g.name]}
            standings={standings[g.name]}
            scores={scores}
            locked={locked}
            onScore={updateGroupScore}
          />
        ))}
      </div>

      {bracket && (
        <>
          <h3 className="text-lg font-bold">Playoffs (Single Elimination)</h3>
          <div className="overflow-x-auto rounded-xl p-6 theme-accent">
            <BracketTree bracket={bracket} onScore={updateKnockoutScore} />
          </div>
        </>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  )
}

export const Bracket_quadro_e = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    api
      .get(`/quadro/${id}`)
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

  const handleReset = async () => {
    if (!window.confirm('Reset this tournament? All scores will be lost.')) return
    try {
      await api.delete(`/quadro/${id}`)
    } catch {}
    navigate(LIST_ROUTE)
  }

  if (status === 'loading') return <p className="px-10 theme-muted">Loading tournament...</p>

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
      <Quadro_View
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