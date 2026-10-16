import { Link } from 'react-router'

import compasWordmark from '@/assets/compas-wordmark.svg'

type LandingNavProps = {
  homeTo: string
  homeLabel: string
  appTo: string
  appLabel: string
}

export function LandingNav({ homeTo, homeLabel, appTo, appLabel }: LandingNavProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex justify-center px-4">
      <nav className="mt-6 flex w-max items-center gap-6 rounded-full border border-white/10 bg-black/60 py-2 pr-2 pl-6 backdrop-blur-xl backdrop-saturate-0">
        <Link to={homeTo} aria-label={homeLabel} aria-current="page" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-white">
          <img src={compasWordmark} alt="" className="h-4 w-auto brightness-0 invert" />
        </Link>
        <Link
          to={appTo}
          className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-black transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none hover:bg-white/85 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98]"
        >
          {appLabel}
        </Link>
      </nav>
    </header>
  )
}
