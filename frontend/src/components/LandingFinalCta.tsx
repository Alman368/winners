import { motion } from 'motion/react'

import { LandingCta } from '@/components/LandingCta'
import { revealMotion } from '@/lib/landing'

type LandingFinalCtaProps = {
  title: string
  description: string
  ctaTo: string
  ctaLabel: string
}

export function LandingFinalCta({ title, description, ctaTo, ctaLabel }: LandingFinalCtaProps) {
  return (
    <section className="bg-black px-4 pt-12 pb-24">
      <motion.div
        {...revealMotion}
        viewport={{ once: true, amount: 0.6 }}
        className="mx-auto flex max-w-[680px] flex-col items-center text-center"
      >
        <h2 className="bg-linear-to-r from-white to-[#9B9B9B] bg-clip-text text-4xl font-semibold tracking-tight text-balance text-transparent sm:text-5xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-pretty text-white/60">{description}</p>
        <div className="mt-8">
          <LandingCta to={ctaTo} label={ctaLabel} />
        </div>
      </motion.div>
    </section>
  )
}
