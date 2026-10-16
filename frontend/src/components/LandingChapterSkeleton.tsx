import { Skeleton } from '@/components/ui/skeleton'

export function LandingChapterSkeleton() {
  return (
    <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-black/70 p-6 backdrop-blur-xl backdrop-saturate-0">
      <Skeleton className="h-4 w-full bg-white/10" />
      <Skeleton className="mt-2 h-4 w-32 bg-white/10" />
      <Skeleton className="h-8 w-3/4 bg-white/10" />
      <Skeleton className="h-16 w-full bg-white/10" />
      <Skeleton className="h-12 w-40 bg-white/10" />
    </div>
  )
}
