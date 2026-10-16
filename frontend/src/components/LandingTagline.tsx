import { motion } from 'motion/react'

import { revealMotion } from '@/lib/landing'

const WORD_STAGGER_S = 0.08

type LandingTaglineProps = {
  lines: string[][]
}

export function LandingTagline({ lines }: LandingTaglineProps) {
  const label = lines.map((words) => words.join(' ')).join(' ')

  return (
    <section className="bg-black px-4 py-24" aria-label={label}>
      <h2
        className="mx-auto max-w-[680px] text-center text-4xl font-semibold tracking-tight text-balance text-white sm:text-6xl"
        aria-hidden="true"
      >
        {lines.map((words, lineIndex) => (
          <span key={lineIndex} className="block">
            {words.map((word, wordIndex) => (
              <motion.span
                key={wordIndex}
                initial={{ opacity: 0.3 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 1, margin: '0px 0px -30% 0px' }}
                transition={{ ...revealMotion.transition, delay: wordIndex * WORD_STAGGER_S }}
              >
                {word}{' '}
              </motion.span>
            ))}
          </span>
        ))}
      </h2>
    </section>
  )
}
