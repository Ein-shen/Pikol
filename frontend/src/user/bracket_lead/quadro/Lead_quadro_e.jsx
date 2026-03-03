import React from 'react'

const pairLabel = (team) => `${team.player1} & ${team.player2}`

export const Lead_quadro_e = ({ standings = [], title = 'Bracket Standings' }) => {
  return (
    <div className="theme-card rounded-xl border theme-border p-5 space-y-4 shadow-sm">
      <h3 className="text-lg font-bold">{title}</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs theme-muted border-b theme-border pb-2">
              <th className="py-2 px-2 w-10">#</th>
              <th className="py-2 px-2">Team</th>
              <th className="py-2 px-2 text-center w-10">P</th>
              <th className="py-2 px-2 text-center w-10">W</th>
              <th className="py-2 px-2 text-center w-10">L</th>
              <th className="py-2 px-2 text-center w-12">PF</th>
              <th className="py-2 px-2 text-center w-12">PA</th>
              <th className="py-2 px-2 text-center w-12">+/-</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => (
              <tr
                key={row.team?.id || index}
                className={`border-b theme-border transition-colors ${
                  index < 2 ? 'font-semibold' : 'opacity-80'
                }`}
              >
                <td className="py-3 px-2 align-middle text-sm font-bold">{index + 1}</td>
                <td className="py-3 px-2 align-middle">
                  <div className="font-semibold text-base">{row.team?.name || `Team ${index + 1}`}</div>
                  <div className="text-xs font-normal theme-muted mt-0.5">
                    {row.team ? pairLabel(row.team) : 'Player 1 & Player 2'}
                  </div>
                </td>
                <td className="py-3 px-2 text-center align-middle">{row.played ?? 0}</td>
                <td className="py-3 px-2 text-center align-middle">{row.wins ?? 0}</td>
                <td className="py-3 px-2 text-center align-middle">{row.losses ?? 0}</td>
                <td className="py-3 px-2 text-center align-middle">{row.pf ?? 0}</td>
                <td className="py-3 px-2 text-center align-middle">{row.pa ?? 0}</td>
                <td className="py-3 px-2 text-center align-middle">
                  {(row.pf ?? 0) - (row.pa ?? 0)}
                </td>
              </tr>
            ))}
            {standings.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-6 text-sm theme-muted">
                  No standings data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}