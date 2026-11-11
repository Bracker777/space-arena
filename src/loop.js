export function createLoop({
  step = 1 / 60,
  simulate,
  render,
  maxFrameDelta = 0.25,
  useInterval = false,
  variableStep = false,
  blockEvery = 0,
  blockMs = 0,
}) {
  let rafId = 0
  let intervalId = 0
  let running = false
  let last = 0
  let accumulator = 0
  let frames = 0
  let steps = 0
  let statsAt = 0
  let frameIndex = 0
  const frameTimes = []

  const stats = {
    stepsPerSecond: 0,
    framesPerSecond: 0,
    frameTime: 0,
  }

  function frame(now) {
    if (!running) return

    const rawDeltaMs = now - last
    last = now
    stats.frameTime = rawDeltaMs
    frameTimes.push(rawDeltaMs)
    if (frameTimes.length > 600) frameTimes.shift()

    const delta = Math.min(rawDeltaMs / 1000, maxFrameDelta)

    if (variableStep) {
      simulate(delta)
      steps++
      render(1, stats)
    } else {
      accumulator += delta
      while (accumulator >= step) {
        simulate(step)
        accumulator -= step
        steps++
      }
      render(accumulator / step, stats)
    }

    frames++
    frameIndex++

    if (blockEvery > 0 && frameIndex % blockEvery === 0) {
      const until = performance.now() + blockMs
      while (performance.now() < until) {
        /* busy-wait: blocks the call stack on purpose */
      }
    }

    if (now - statsAt >= 1000) {
      stats.framesPerSecond = frames
      stats.stepsPerSecond = steps
      frames = 0
      steps = 0
      statsAt = now
    }

    if (!useInterval) {
      rafId = requestAnimationFrame(frame)
    }
  }

  function start() {
    if (running) return
    running = true
    last = performance.now()
    statsAt = last
    accumulator = 0
    frames = 0
    steps = 0
    frameIndex = 0
    frameTimes.length = 0

    if (useInterval) {
      intervalId = setInterval(() => frame(performance.now()), 16)
    } else {
      rafId = requestAnimationFrame(frame)
    }
  }

  function stop() {
    running = false
    cancelAnimationFrame(rafId)
    clearInterval(intervalId)
  }

  function getFrameTimeStats() {
    if (frameTimes.length === 0) {
      return { count: 0, mean: 0, min: 0, max: 0, jitter: 0 }
    }

    let sum = 0
    let min = Infinity
    let max = 0
    for (const t of frameTimes) {
      sum += t
      if (t < min) min = t
      if (t > max) max = t
    }

    const mean = sum / frameTimes.length
    let variance = 0
    for (const t of frameTimes) {
      const d = t - mean
      variance += d * d
    }

    return {
      count: frameTimes.length,
      mean,
      min,
      max,
      jitter: Math.sqrt(variance / frameTimes.length),
    }
  }

  return { start, stop, stats, getFrameTimeStats }
}
