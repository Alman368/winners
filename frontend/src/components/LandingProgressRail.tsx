import { cn } from 'cn'

type RailChapter = {
  index: number
  label: string
  ariaLabel: string
}

type LandingProgressRailProps = {
  label: string
  groups: { label: string; chapters: RailChapter[] }[]
  current: number
  isShown: boolean
  onSelect: (index: number) => void
}

const ease = 'duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]'

export function LandingProgressRail({ label, groups, current, isShown, onSelect }: LandingProgressRailProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'fixed top-1/2 right-6 z-20 hidden -translate-y-1/2 flex-col gap-6 transition-opacity sm:flex',
        ease,
        isShown ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col items-end gap-1">
          <span className="mb-1 text-xs font-medium text-white/40">{group.label}</span>
          {group.chapters.map((chapter) => {
            const isCurrent = chapter.index === current
            return (
              <button
                key={chapter.index}
                type="button"
                aria-label={chapter.ariaLabel}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onSelect(chapter.index)}
                className="group flex items-center gap-3 rounded-sm py-1 outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  className={cn(
                    'rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white backdrop-blur transition-opacity',
                    ease,
                    isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-70',
                  )}
                >
                  {chapter.label}
                </span>
                <span
                  className={cn(
                    'h-0.5 rounded-full transition-all',
                    ease,
                    isCurrent ? 'w-8 bg-white' : 'w-3 bg-white/60 group-hover:w-6 group-hover:bg-white',
                  )}
                />
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
