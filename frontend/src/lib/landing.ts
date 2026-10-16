export const revealMotion = {
  initial: { opacity: 0, y: 64, filter: 'blur(12px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.9, ease: [0.32, 0.72, 0, 1] },
} as const
