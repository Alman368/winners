type TourSpotlightProps = {
  highlight: DOMRect
}

const PADDING = 6

export function TourSpotlight({ highlight }: TourSpotlightProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-50 rounded-xl shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] transition-[top,left,width,height] duration-300 ease-out"
      style={{
        top: highlight.top - PADDING,
        left: highlight.left - PADDING,
        width: highlight.width + PADDING * 2,
        height: highlight.height + PADDING * 2,
      }}
    />
  )
}
