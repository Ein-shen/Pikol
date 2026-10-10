import React, { useState } from 'react'
import { Plus, X, Trophy, RotateCcw } from 'lucide-react'

const TEAM_COUNT = 10

function createTeams() {
  return Array.from({ length: TEAM_COUNT }, (_, i) => ({
    id: i + 1,
    name: `Team ${i + 1}`,
    player1: '',
    player2: '',
  }))
}

// Create a bracket with enough slots for every team.
// Ten teams require sixteen slots, so six teams receive byes.
function createBracket(teams) {
  const shuffled = [...teams]

  // Randomize the first-round matchups.
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const size = 2 ** Math.ceil(Math.log2(shuffled.length))
  const slots = [...shuffled]

  while (slots.length < size) {
    slots.push(null)
  }

  const rounds = []
  let current = []

  for (let i = 0; i < size; i += 2) {
    const a = slots[i]
    const b = slots[i + 1]

    current.push({
      id: crypto.randomUUID(),
      team1: a,
      team2: b,
      winner: a && !b ? a : null,
    })
  }

  rounds.push(current)

  while (current.length > 1) {
    const next = Array.from(
      { length: current.length / 2 },
      () => ({
        id: crypto.randomUUID(),
        team1: null,
        team2: null,
        winner: null,
      })
    )

    current = next
    rounds.push(current)
  }

  return rounds
}

const roundNames = [
  'Round 1',
  'Round 2',
  'Quarter-finals',
  'Semi-finals',
  'Final',
]

export const Matching = () => {
  const [show, setShow] = useState(false)
  const [teams, setTeams] = useState(createTeams)
  const [tournamentName, setTournamentName] = useState('')
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

    if (
      validTeams.some(
        (team) => !team.player1 || !team.player2 || !team.name
      )
    ) {
      setError('Please complete all 10 teams and their players.')
      return
    }

    const players = validTeams.flatMap((team) => [
      team.player1.toLowerCase(),
      team.player2.toLowerCase(),
    ])

    if (new Set(players).size !== players.length) {
      setError('Each player must belong to only one team.')
      return
    }

    setBracket(createBracket(validTeams))
    setChampion(null)
    setError('')
    setShow(false)
  }

  const selectWinner = (roundIndex, matchIndex, winner) => {
    if (!winner || !bracket) return

    const nextBracket = bracket.map((round) =>
      round.map((match) => ({ ...match }))
    )

    const match = nextBracket[roundIndex][matchIndex]

    // Clear the downstream matches if a winner changes.
    for (let r = roundIndex + 1; r < nextBracket.length; r++) {
      for (let m = 0; m < nextBracket[r].length; m++) {
        nextBracket[r][m] = {
          ...nextBracket[r][m],
          team1: null,
          team2: null,
          winner: null,
        }
      }
    }

    match.winner = winner

    // Move the winner to the next round.
    if (roundIndex < nextBracket.length - 1) {
      const nextMatchIndex = Math.floor(matchIndex / 2)
      const slot = matchIndex % 2 === 0 ? 'team1' : 'team2'

      nextBracket[roundIndex + 1][nextMatchIndex][slot] = winner
    }

    const finalRound = nextBracket[nextBracket.length - 1]
    const finalMatch = finalRound[0]

    setChampion(
      finalMatch?.winner && finalMatch.team1 && finalMatch.team2
        ? finalMatch.winner
        : null
    )

    setBracket(nextBracket)
  }

  const resetTournament = () => {
    setBracket(null)
    setChampion(null)
    setError('')
    setTeams(createTeams())
    setTournamentName('')
  }

  const getRoundName = (index, total) => {
    if (index === total - 1) return 'Final'
    if (index === total - 2) return 'Semi-finals'
    if (index === total - 3) return 'Quarter-finals'
    return roundNames[0] === 'Round 1' && index === 0
      ? 'Opening round'
      : `Round ${index + 1}`
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Matching brackets
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              20 players · 10 teams · Single elimination
            </p>
          </div>

          <button
            onClick={() => {
              setError('')
              setShow(true)
            }}
            className="flex items-center gap-2 rounded-lg bg-black px-4 py-3 text-white hover:bg-gray-800"
          >
            <Plus size={18} />
            Create tournament
          </button>
        </header>

        {!bracket && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <Trophy className="mx-auto mb-4 text-gray-400" size={40} />
            <h2 className="text-lg font-semibold">
              No tournament yet
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Create a tournament, register 10 teams, and start matching.
            </p>
            <button
              onClick={() => setShow(true)}
              className="mt-5 rounded-lg bg-black px-5 py-3 text-white"
            >
              Create your first bracket
            </button>
          </div>
        )}

        {bracket && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5">
              <div>
                <h2 className="text-xl font-bold">
                  {tournamentName}
                </h2>
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

            <div className="overflow-x-auto rounded-xl border bg-white p-4 sm:p-6">
              <div className="flex min-w-max items-start gap-8">
                {bracket.map((round, roundIndex) => (
                  <div
                    key={roundIndex}
                    className="flex w-64 flex-col"
                  >
                    <h3 className="mb-5 text-sm font-bold uppercase tracking-wide text-gray-500">
                      {getRoundName(roundIndex, bracket.length)}
                    </h3>

                    <div
                      className="flex flex-1 flex-col justify-around gap-5"
                      style={{
                        minHeight: `${Math.max(300, round.length * 130)}px`,
                      }}
                    >
                      {round.map((match, matchIndex) => (
                        <div
                          key={match.id}
                          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
                        >
                          {[match.team1, match.team2].map(
                            (team, slotIndex) => {
                              const isWinner =
                                team && match.winner?.id === team.id

                              return (
                                <button
                                  key={slotIndex}
                                  disabled={!team || !!match.winner}
                                  onClick={() =>
                                    selectWinner(
                                      roundIndex,
                                      matchIndex,
                                      team
                                    )
                                  }
                                  className={`flex w-full flex-col items-start border-b last:border-b-0 p-3 text-left transition ${
                                    isWinner
                                      ? 'bg-green-50 font-semibold text-green-800'
                                      : 'hover:bg-gray-50'
                                  } ${
                                    !team
                                      ? 'cursor-default text-gray-400'
                                      : 'text-gray-800'
                                  }`}
                                >
                                  <span className="text-sm">
                                    {team ? team.name : 'TBD'}
                                  </span>
                                  {team && (
                                    <span className="mt-1 text-xs text-gray-500">
                                      {team.player1} &amp; {team.player2}
                                    </span>
                                  )}
                                  {isWinner && (
                                    <span className="mt-1 text-xs">
                                      Winner
                                    </span>
                                  )}
                                </button>
                              )
                            }
                          )}
                          <div className="bg-gray-50 px-3 py-2 text-xs text-gray-400">
                            Match {matchIndex + 1}
                            {match.winner
                              ? ' · Completed'
                              : !match.team1 && !match.team2
                                ? ' · Waiting'
                                : ' · Select a winner'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Select a team in each match to advance it to the next round.
              Teams with byes advance automatically.
            </p>
          </section>
        )}

        {show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 ">
            <div className="relative rounded-xl bg-white p-10 shadow-lg">
              <button
                type="button"
                onClick={() => setShow(false)}
                className="absolute right-3 top-3 text-gray-500 hover:text-black"
              >
                <X size={20} />
              </button>

             <div className="grid grid-cols-2 items-center justify-center gap-x-3 gap-y-3">
              <button className="font-semibold w-44 h-24 border border-black/80 p-6 text-center hover:bg-gray-100">
                Single elimination
              </button>

              <button className="font-semibold w-44 h-24 border border-black/80 p-6 text-center hover:bg-gray-100">
                Double Elimination
              </button>

              <button className="font-semibold w-44 h-24 border border-black/80 p-6 text-center hover:bg-gray-100">
                Quadro Elimination
              </button>

              <button className="font-semibold w-44 h-24 border border-black/80 p-6 text-center hover:bg-gray-100">
                Open play
              </button>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}