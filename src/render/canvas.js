export function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  const size = { width: 1, height: 1, dpr: 1 }

  function resize() {
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    size.width = Math.max(1, Math.round(rect.width))
    size.height = Math.max(1, Math.round(rect.height))
    size.dpr = dpr
    canvas.width = Math.round(size.width * dpr)
    canvas.height = Math.round(size.height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  window.addEventListener('resize', resize)
  resize()

  return { ctx, size, resize }
}
