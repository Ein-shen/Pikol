export const CARD_WIDTH = 200
export const ROUND_GAP = 56
export const SLOT_HEIGHT = 120
export const LINE_STYLE = '2px solid #1ba3c6'
export const LINE_RADIUS = 8

export const slotFor = (matchIndex) => (matchIndex % 2 === 0 ? 'team1' : 'team2')
export const pairLabel = (team) => `${team.player1} & ${team.player2}`

export function getRoundName(roundIndex, totalRounds) {
  if (roundIndex === totalRounds - 1) return 'Final'
  if (roundIndex === totalRounds - 2) return 'Semi-finals'
  if (roundIndex === totalRounds - 3) return 'Quarter-finals'
  return `Round ${roundIndex + 1}`
}

function createMatch(team1 = null, team2 = null) {
  return { id: crypto.randomUUID(), team1, team2, score1: '', score2: '', winner: null }
}

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

function buildAllRounds(firstRound) {
  const rounds = [firstRound]
  let matchCount = firstRound.length
  while (matchCount > 1) {
    matchCount /= 2
    rounds.push(Array.from({ length: matchCount }, () => createMatch()))
  }
  return rounds
}

function advanceSingles(rounds) {
  rounds[0].forEach((match, i) => {
    if (!(match.team1 && !match.team2)) return
    match.winner = match.team1
    rounds[1][i >> 1][slotFor(i)] = match.team1
  })
}

// Same teams in the same order = same bracket, every time
export function createBracket(teams) {
  const rounds = buildAllRounds(buildFirstRound(teams))
  advanceSingles(rounds)
  return rounds
}

export function putTeamInMatch(bracket, roundIndex, matchIndex, slot, team) {
  if (roundIndex >= bracket.length) return
  const match = bracket[roundIndex][matchIndex]
  match[slot] = team
  match.winner = null
  match.score1 = ''
  match.score2 = ''

  if (roundIndex !== bracket.length - 1) {
    putTeamInMatch(bracket, roundIndex + 1, matchIndex >> 1, slotFor(matchIndex), null)
  }
}

export function getWinner(match) {
  if (match.score1 === '' || match.score2 === '') return null
  const score1 = Number(match.score1)
  const score2 = Number(match.score2)
  if (score1 === score2) return null
  return score1 > score2 ? match.team1 : match.team2
}

// Put saved scores back onto a freshly built bracket
export function applyResults(bracket, matches) {
  const sorted = [...matches].sort((a, b) => a.round - b.round)

  sorted.forEach((saved) => {
    const roundIndex = saved.round - 1
    const matchIndex = saved.matchNumber - 1
    const match = bracket[roundIndex]?.[matchIndex]
    if (!match) return

    match.score1 = String(saved.score1)
    match.score2 = String(saved.score2)
    match.winner = getWinner(match)

    if (match.winner && roundIndex < bracket.length - 1) {
      putTeamInMatch(bracket, roundIndex + 1, matchIndex >> 1, slotFor(matchIndex), match.winner)
    }
  })

  return bracket
}