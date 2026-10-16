import { IconChevronDown } from '@tabler/icons-react'
import { motion } from 'motion/react'

import { LandingCta } from '@/components/LandingCta'
import { revealMotion } from '@/lib/landing'

type LandingHeroProps = {
  eyebrow: string
  titleLines: string[]
  description: string
  ctaTo: string
  ctaLabel: string
  scrollHint: string
}

export function LandingHero({ eyebrow, titleLines, description, ctaTo, ctaLabel, scrollHint }: LandingHeroProps) {
  return (
    <div className="relative flex h-dvh flex-col justify-end px-4 pb-24 sm:justify-center sm:px-12 sm:pb-0">
      <motion.div {...revealMotion} viewport={{ amount: 0.5 }} className="pointer-events-auto max-w-[680px]">
        <p className="text-sm font-medium text-white/60">{eyebrow}</p>
        <h1 className="mt-4 bg-linear-to-r from-white to-[#9B9B9B] bg-clip-text text-5xl font-semibold tracking-tight text-balance text-transparent sm:text-7xl">
          {titleLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-6 text-lg text-pretty text-white/70">{description}</p>
        <div className="mt-8">
          <LandingCta to={ctaTo} label={ctaLabel} />
        </div>
      </motion.div>
      <p className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-sm text-white/60">
        {scrollHint}
        <IconChevronDown className="size-4 animate-bounce" aria-hidden="true" />
      </p>
    </div>
  )
}
