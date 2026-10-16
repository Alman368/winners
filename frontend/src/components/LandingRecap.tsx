import { motion } from 'motion/react'

import { Skeleton } from '@/components/ui/skeleton'
import type { ChapterStat } from '@/lib/landingCards'
import { revealMotion } from '@/lib/landing'

type RecapItem = {
  id: string
  place: string
  date: string
  image: string
  imageAlt: string
  stats: ChapterStat[]
}

type LandingRecapProps = {
  eyebrow: string
  title: string
  items: RecapItem[] | null
}

const RECAP_SLOTS = 3

/** The three fires of the challenge side by side, as the last stop of the story. */
export function LandingRecap({ eyebrow, title, items }: LandingRecapProps) {
  return (
    <section className="bg-black px-4 py-24 sm:px-12">
      <motion.div {...revealMotion} viewport={{ once: true, amount: 0.3 }} className="mx-auto max-w-6xl">
        <p className="text-sm font-medium text-white/50">{eyebrow}</p>
        <h2 className="mt-4 max-w-[680px] bg-linear-to-r from-white to-[#9B9B9B] bg-clip-text text-4xl font-semibold tracking-tight text-balance text-transparent sm:text-5xl">
          {title}
        </h2>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {items
            ? items.map((item) => (
                <li key={item.id} className="group overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.imageAlt}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-white/50">{item.date}</p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-white">{item.place}</h3>
                    <dl className="mt-6 grid grid-cols-3 gap-4">
                      {item.stats.map((stat) => (
                        <div key={stat.label} className="flex flex-col justify-between">
                          <dt className="text-xs text-white/50">{stat.label}</dt>
                          <dd className="mt-1 text-lg font-semibold text-white tabular-nums">
                            {stat.value}
                            <span className="ml-1 text-sm font-medium text-white/40">{stat.unit}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </li>
              ))
            : Array.from({ length: RECAP_SLOTS }, (_, index) => (
                <li key={index}>
                  <Skeleton className="aspect-[4/3] w-full rounded-2xl bg-white/10" />
                </li>
              ))}
        </ul>
      </motion.div>
    </section>
  )
}
