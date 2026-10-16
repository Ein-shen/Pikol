import React, { useState } from 'react'
import { Trophy, RotateCcw } from 'lucide-react'
import api from '../../../api'
import {
  CARD_WIDTH, ROUND_GAP, SLOT_HEIGHT, LINE_STYLE, LINE_RADIUS,
  slotFor, pairLabel, getRoundName, putTeamInMatch, getWinner,
} from './BracketUtils'


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

function LineIn() {
  return (
    <div
      style={{
        position: 'absolute', left: -ROUND_GAP / 2, width: ROUND_GAP / 2,
        top: '50%', borderTop: LINE_STYLE,
      }}
    />
  )
}

function LineOut({ isTopMatch }) {
  const base = {
    position: 'absolute', left: '100%', width: ROUND_GAP / 2,
    boxSizing: 'border-box', borderRight: LINE_STYLE,
  }

  if (isTopMatch) {
    return (
      <div
        style={{
          ...base, top: '50%', height: '50%',
          borderTop: LINE_STYLE, borderTopRightRadius: LINE_RADIUS,
        }}
      />
    )
  }

  return (
    <div
      style={{
        ...base, top: 0, height: 'calc(50% + 2px)',
        borderBottom: LINE_STYLE, borderBottomRightRadius: LINE_RADIUS,
      }}
    />
  )
}

function Round({ round, roundIndex, totalRounds, onScore }) {
  const slotHeight = SLOT_HEIGHT * 2 ** roundIndex
  const isLastRound = roundIndex === totalRounds - 1

  return (
    <div style={{ width: CARD_WIDTH }}>
      <h3 className="text-center text-xs font-semibold text-gray-500" style={{ marginBottom: 12 }}>
        {getRoundName(roundIndex, totalRounds)}
      </h3>

      {round.map((match, matchIndex) => {
        const hasNoOpponent = match.team1 && !match.team2
        return (
          <div key={match.id} className="relative flex items-center" style={{ height: slotHeight }}>
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

export const Bracket_Single_VIew = ({
  tournamentId,
  tournamentName,
  teams,
  initialBracket,
  onReset,
}) => {
  const [bracket, setBracket] = useState(initialBracket)
  const [champion, setChampion] = useState(null)
  const [error, setError] = useState('')

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

  
const updateScore = (roundIndex, matchIndex, key, value) => {
  const newBracket = bracket.map((round) =>
    round.map((m) => ({ ...m }))
  )

  const match = newBracket[roundIndex][matchIndex]
  match[key] = value

  const newWinner = getWinner(match)
  const winnerChanged =
    (match.winner?.id ?? null) !== (newWinner?.id ?? null)

  match.winner = newWinner

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

  // Update the bracket displayed on screen
  setBracket(newBracket)

  // Update the champion when the final match changes
  if (isLastRound) {
    setChampion(newWinner || null)
  } else {
    setChampion(newBracket[newBracket.length - 1][0].winner || null)
  }

  // Save the result to the backend
  saveResult(roundIndex, matchIndex, match, newWinner, winnerChanged)
}


  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5">
        <div>
          <h2 className="text-xl font-bold">{tournamentName}</h2>
          <p className="mt-1 text-sm text-gray-500">{teams.length} teams registered</p>
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <RotateCcw size={16} />
          Reset tournament
        </button>
      </div>

      {champion && <ChampionBanner champion={champion} />}

      <div className="overflow-x-auto rounded-xl p-6" style={{ background: '#efefef' }}>
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
        Enter the score in the yellow boxes. The team with the higher score advances to the next round.
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      )}
    </section>
  )
}