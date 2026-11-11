/**
 * Collision DETECTION system: naive O(n²) circle–circle test.
 * Takes the world, yields [a, b] pairs. Knows nothing about bullets or ships —
 * the response lives in rules.js. Swap this function for a spatial hash later
 * without touching anything else (World receives it via `detect`).
 */
export function* circleCollisions(world) {
  const list = []
  for (const e of world) if (e.alive && e.solid) list.push(e)

  for (let i = 0; i < list.length; i++) {
    const a = list[i]
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]
      const d = world.delta(a.pos, b.pos)
      const r = a.radius + b.radius
      if (d.lengthSq() < r * r) yield [a, b]
    }
  }
}
