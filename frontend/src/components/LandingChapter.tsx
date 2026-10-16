import { cn } from 'cn'
import { motion } from 'motion/react'

import type { ChapterCard } from '@/lib/landingCards'
import { revealMotion } from '@/lib/landing'

export function LandingChapter({ eyebrow, title, stats, rows }: ChapterCard) {
  const isSingle = stats.length === 1

  return (
    <motion.article
      {...revealMotion}
      viewport={{ amount: 0.6 }}
      className="pointer-events-auto w-full max-w-sm rounded-2xl bg-black/70 p-6 backdrop-blur-xl backdrop-saturate-0"
    >
      <p className="text-sm font-medium text-white/50">{eyebrow}</p>
      <h2 className="mt-2 bg-linear-to-r from-white to-[#9B9B9B] bg-clip-text text-3xl font-semibold tracking-tight text-balance text-transparent">
        {title}
      </h2>
      {stats.length > 0 && (
        <dl className={cn('mt-6 grid gap-x-6 gap-y-4', !isSingle && 'grid-cols-2')}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className={cn('text-sm text-white/50', isSingle && 'sr-only')}>{stat.label}</dt>
              <dd className={cn('font-semibold tracking-tight text-white tabular-nums', isSingle ? 'text-5xl' : 'mt-1 text-2xl')}>
                {stat.value}
                {stat.unit && <span className={cn('ml-2 font-medium text-white/40', isSingle ? 'text-2xl' : 'text-base')}>{stat.unit}</span>}
              </dd>
              {stat.description && <dd className="mt-2 text-sm text-pretty text-white/50">{stat.description}</dd>}
            </div>
          ))}
        </dl>
      )}
      {rows.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.label} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                {row.color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />}
                <span className="text-white/70">{row.label}</span>
                {row.value && <span className="ml-auto font-medium text-white tabular-nums">{row.value}</span>}
              </div>
              {row.share !== null && (
                <span className="h-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full" style={{ width: `${row.share * 100}%`, backgroundColor: row.color! }} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </motion.article>
  )
}
