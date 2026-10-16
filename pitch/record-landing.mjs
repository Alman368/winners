/** Records the landing frame by frame at a fixed frame rate. Needs the frontend on :5180 and the backend running.
 * Usage: node record-landing.mjs [out.mp4] [seconds] — START=<seconds> skips ahead to preview one part. */

import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const LANDING_URL = 'http://localhost:5180/'
const OUT = process.argv[2] ?? new URL('landing-linkedin.mp4', import.meta.url).pathname
const LIMIT_S = Number(process.argv[3] ?? Infinity)
const FPS = 60
const VIEWPORT = { width: 1280, height: 720 }
const SCALE = 1.5

const HERO_HOLD = 1.8
const MOVE = 1.4
const LONG_MOVE = 2.6
const HOLD = 1.9
/** Chapter transitions that fly across Spain: globe to Ávila, Ávila to Niebla, Niebla to La Mierla. */
const LONG_MOVES = new Set([1, 11, 13])
const STORY_CHAPTERS = 15

/** Virtual clock: free-runs on real time while the page loads, then only advances when the recorder steps it. */
function virtualClock() {
  const nativeRaf = window.requestAnimationFrame.bind(window)
  const nativeNow = performance.now.bind(performance)
  const nativeDateNow = Date.now
  let manual = false
  let now = 0
  let queue = new Map()
  let nextId = 1
  const tracked = new WeakMap()

  performance.now = () => (manual ? now : nativeNow())
  Date.now = () => (manual ? nativeDateNow.call(Date) - nativeNow() + now : nativeDateNow.call(Date))
  window.requestAnimationFrame = (callback) => {
    if (!manual) {
      return nativeRaf(callback)
    }
    const id = nextId++
    queue.set(id, callback)
    return -id
  }
  const nativeCancel = window.cancelAnimationFrame.bind(window)
  window.cancelAnimationFrame = (id) => (id < 0 ? queue.delete(-id) : nativeCancel(id))

  function syncAnimations() {
    for (const animation of document.getAnimations()) {
      if (!tracked.has(animation)) {
        tracked.set(animation, now - (animation.currentTime ?? 0))
      }
      const elapsed = now - tracked.get(animation)
      const end = animation.effect.getComputedTiming().endTime
      if (Number.isFinite(end) && elapsed >= end) {
        animation.finish()
        continue
      }
      if (animation.playState !== 'paused') {
        animation.pause()
      }
      animation.currentTime = elapsed
    }
  }

  function runQueue() {
    const callbacks = queue
    queue = new Map()
    for (const callback of callbacks.values()) {
      callback(now)
    }
    syncAnimations()
  }

  const nativeFrame = () => new Promise((resolve) => nativeRaf(resolve))

  window.__clock = {
    freeze() {
      now = nativeNow()
      manual = true
    },
    nativeFrame,
    /** Advances one frame, then keeps re-rendering the map at that instant until every tile it needs is drawn. */
    async step(ms) {
      await nativeFrame()
      now += ms
      runQueue()
      const map = window.__map
      let settled = 0
      for (let attempt = 0; attempt < 900 && settled < 2; attempt++) {
        await nativeFrame()
        if (map.isStyleLoaded() && map.areTilesLoaded()) {
          settled++
        }
        if (map._frameRequest) {
          runQueue()
        }
      }
      await nativeFrame()
      await nativeFrame()
    },
  }
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

/** Scroll keyframes: each stop is reached with an eased move and then held so its copy can be read. */
function buildTimeline(stops) {
  const keys = [{ time: 0, y: stops[0].y }]
  let time = stops[0].hold
  keys.push({ time, y: stops[0].y })
  for (const stop of stops.slice(1)) {
    time += stop.move
    keys.push({ time, y: stop.y })
    time += stop.hold
    keys.push({ time, y: stop.y })
  }
  return {
    duration: time,
    scrollAt(t) {
      const index = keys.findIndex((key) => key.time >= t)
      if (index <= 0) {
        return keys[0].y
      }
      const from = keys[index - 1]
      const to = keys[index]
      if (from.y === to.y) {
        return to.y
      }
      return from.y + (to.y - from.y) * easeInOutSine((t - from.time) / (to.time - from.time))
    },
  }
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--hide-scrollbars'],
})
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: SCALE })
await page.addInitScript(virtualClock)
await page.goto(LANDING_URL, { waitUntil: 'networkidle' })
await page.waitForFunction(() => document.querySelector('.maplibregl-map') && !document.querySelector('[data-slot="skeleton"]'), null, {
  timeout: 60_000,
})
await page.evaluate(async () => {
  const entry = performance.getEntriesByType('resource').find((resource) => resource.name.includes('.vite/deps/maplibre-gl.js'))
  const maplibre = await import(entry.name)
  const render = maplibre.Map.prototype._render
  maplibre.Map.prototype._render = function (...args) {
    window.__map = this
    return render.apply(this, args)
  }
  window.scrollTo(0, 1)
  while (!window.__map) {
    await window.__clock.nativeFrame()
  }
  window.scrollTo(0, 0)
})
await page.waitForTimeout(1500)

const stops = await page.evaluate(
  ({ storyChapters, heroHold, move, longMove, hold, longMoves }) => {
    const vh = window.innerHeight
    const story = document.querySelector('main > section')
    const sections = [...document.querySelectorAll('main > section')]
    const [, tagline, recap] = sections
    const maxY = document.documentElement.scrollHeight - vh
    const centered = (element) => Math.min(maxY, element.offsetTop + element.offsetHeight / 2 - vh / 2)
    const chapters = Array.from({ length: storyChapters }, (_, index) => ({
      y: story.offsetTop + index * vh,
      move: longMoves.includes(index) ? longMove : move,
      hold: index === 0 ? heroHold : hold,
    }))
    return [
      ...chapters,
      { y: centered(tagline), move: 1.8, hold: 2.2 },
      { y: centered(recap), move: 1.8, hold: 3 },
      { y: maxY, move: 1.5, hold: 2.8 },
    ]
  },
  { storyChapters: STORY_CHAPTERS, heroHold: HERO_HOLD, move: MOVE, longMove: LONG_MOVE, hold: HOLD, longMoves: [...LONG_MOVES] },
)
const timeline = buildTimeline(stops)
const duration = Math.min(timeline.duration, LIMIT_S)
const frames = Math.round(duration * FPS)
console.log(`duration ${timeline.duration.toFixed(1)}s, recording ${frames} frames`)

const ffmpeg = spawn(
  'ffmpeg',
  [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-r', String(FPS), '-movflags', '+faststart', OUT,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
)

await page.evaluate(() => window.__clock.freeze())
const startedAt = Date.now()
for (let frame = Math.round(Number(process.env.START ?? 0) * FPS); frame < frames; frame++) {
  const y = timeline.scrollAt(frame / FPS)
  await page.evaluate((top) => window.scrollTo(0, top), y)
  await page.evaluate((ms) => window.__clock.step(ms), 1000 / FPS)
  const image = await page.screenshot({ type: 'png' })
  if (!ffmpeg.stdin.write(image)) {
    await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve))
  }
  if (frame % 60 === 0) {
    const elapsed = (Date.now() - startedAt) / 1000
    console.log(`frame ${frame}/${frames} · ${elapsed.toFixed(0)}s elapsed · eta ${((elapsed / (frame + 1)) * (frames - frame)).toFixed(0)}s`)
  }
}
ffmpeg.stdin.end()
await new Promise((resolve) => ffmpeg.on('close', resolve))
await browser.close()
console.log('done', OUT)
