import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Each format has a summary and a list of sections.
// A section has: title, optional intro, optional points (bullets),
// optional ordered (true = numbered list), optional note.
const about_matching = [
  {
    label: 'Standard Tournament',
    summary:
      'Pairs first play in groups, then the best pairs go into a knockout playoff.',
    sections: [
      {
        title: 'Stage 1: Groups (round robin)',
        intro: 'Pairs are split into groups depending on how many signed up:',
        points: [
          '2-3 pairs: 1 group. The top 2 play the Final.',
          '4-5 pairs: 1 group. The top 4 go to the semi-finals.',
          '6-10 pairs: 2 groups (A and B). The top 2 of each go to the semi-finals.',
          '12 pairs: 3 groups (A, B, C). The top 2 of each (6 pairs) go to the playoffs.',
          'Other sizes (11 or 13+): 4 groups (A-D). The top 2 of each go to the quarter-finals.',
        ],
        note: 'Inside a group, every pair plays every other pair once. Games are played to 11 and a score cannot be tied.',
      },
      {
        title: 'How pairs are ranked',
        intro: 'The standings table updates live. If pairs are level, the next rule decides:',
        ordered: true,
        points: [
          'Most wins',
          'Best point difference (points scored minus points against)',
          'Most points scored',
          'Team name A-Z',
        ],
      },
      {
        title: 'Stage 2: Playoffs (single elimination)',
        intro:
          'When every group match has a score, the groups are locked. The top pairs are seeded so pairs from the same group meet as late as possible:',
        points: [
          '1 group (4+ pairs): 1st vs 4th, 2nd vs 3rd.',
          '2 groups: A1 vs B2 and B1 vs A2.',
          '4 groups: A1 vs B2, C1 vs D2, B1 vs A2, D1 vs C2.',
          '3 groups (12 pairs): the 6 qualifiers are ranked as seeds 1-6 (3 group winners, then 3 runners-up). Seeds 1 and 2 get a bye. Quarter-finals: seed 4 vs 5 and seed 3 vs 6. Semi-finals: seed 1 vs the winner of 4/5, and seed 2 vs the winner of 3/6. If 3 vs 6 would be two pairs from the same group, seeds 5 and 6 are swapped.',
        ],
        note: 'The winner of each match moves on and the loser is out, until the Final decides the champion. The two semi-final losers play a 3rd-place match. If you change a score, every later match that depended on it is cleared and recalculated.',
      },
    ],
  },

  {
    label: 'Single Elimination',
    summary: 'No groups. Lose once and you are out.',
    sections: [
      {
        title: 'How it works',
        points: [
          'Every pair plays in round 1, paired in the order they were registered (1st vs 2nd, 3rd vs 4th, and so on).',
          'The higher score wins and moves on. The loser is out. Ties are not allowed.',
          'Winners keep advancing round by round (quarter-finals, semi-finals) until the Final. The winner of the Final is the champion.',
        ],
      },
      {
        title: 'Odd number of winners',
        intro:
          'If a round has an odd number of winners, one pair gets a dashed "Waiting for next round" card and plays in the next round instead.',
        points: [
          'The waiting spot alternates between the top and the bottom of the bracket.',
          'The same pair never waits twice in a row.',
        ],
        note: 'Changing a score clears and recalculates every later match that depended on it.',
      },
    ],
  },

  {
    label: 'Open play',
    summary: 'Description coming soon.',
    sections: [],
  },
]

export const About_components = () => {
  const navigate = useNavigate()

  return (
    <div className="w-full">
      <header className="flex flex-row items-center justify-between pb-6 sm:pb-10">
        <button
          type="button"
          className="rounded-md p-2 opacity-60 transition hover:opacity-100"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft />
        </button>

        <h1 className="text-lg font-bold">About</h1>

        {/* Spacer keeps the title centered */}
        <div className="w-10" />
      </header>

      <div className="mx-auto flex w-[90%]   flex-col gap-6 sm:gap-8">
        {about_matching.map((format) => (
          <article
            key={format.label}
            className="theme-card theme-border space-y-5 rounded-xl border p-4 sm:p-6"
          >
            {/* Format title + one-line summary */}
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">{format.label}</h2>
              <p className="theme-muted mt-1 text-sm sm:text-base">{format.summary}</p>
            </div>

            {/* Sections */}
            {format.sections.map((section) => {
              const List = section.ordered ? 'ol' : 'ul'
              return (
                <section
                  key={section.title}
                  className="theme-border space-y-2 border-t pt-4"
                >
                  <h3 className="text-base font-semibold sm:text-lg">{section.title}</h3>

                  {section.intro && (
                    <p className="text-sm leading-relaxed sm:text-base">{section.intro}</p>
                  )}

                  {section.points && (
                    <List
                      className={`space-y-1.5 pl-5 text-sm leading-relaxed sm:text-base ${
                        section.ordered ? 'list-decimal' : 'list-disc'
                      }`}
                    >
                      {section.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </List>
                  )}

                  {section.note && (
                    <p className="theme-muted text-sm leading-relaxed">{section.note}</p>
                  )}
                </section>
              )
            })}
          </article>
        ))}
      </div>
    </div>
  )
}