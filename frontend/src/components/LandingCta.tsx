import { IconArrowRight } from '@tabler/icons-react'
import { Link } from 'react-router'

type LandingCtaProps = {
  to: string
  label: string
}

export function LandingCta({ to, label }: LandingCtaProps) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-base font-semibold text-black transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none hover:bg-white/85 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98]"
    >
      {label}
      <IconArrowRight
        className="size-4 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  )
}
