export function wrap(value, size) {
  return ((value % size) + size) % size
}

export function wrapShip(ship, width, height) {
  ship.x = wrap(ship.x, width)
  ship.y = wrap(ship.y, height)
}

export function shortestDelta(prev, curr, size) {
  let delta = curr - prev
  if (delta > size / 2) delta -= size
  if (delta < -size / 2) delta += size
  return delta
}

export function lerpWrap(prev, curr, alpha, size) {
  return wrap(prev + shortestDelta(prev, curr, size) * alpha, size)
}

export function lerpAngle(prev, curr, alpha) {
  return prev + shortestDelta(prev, curr, Math.PI * 2) * alpha
}
