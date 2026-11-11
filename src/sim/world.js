import { Vector2 } from './vector.js'
import { wrap, shortestDelta } from './arena.js'

/**
 * Entity store on top of Map<id, Entity>.
 *
 * - spawn(e) during a step is buffered and the entity joins after the step;
 * - despawn(id) only marks the entity dead; the sweep at the end of step()
 *   removes it, so nobody deletes from the Map while iterating it;
 * - collision detection / response and per-step systems are injected,
 *   so the naive O(n²) detector can be swapped for a spatial hash later.
 */
export class World {
  #entities = new Map()
  #dead = new Set()
  #incoming = []
  #timers = []
  #stepping = false
  #detect
  #resolve
  #systems

  constructor({ width, height, detect, resolve, systems = [] }) {
    this.width = width
    this.height = height
    this.time = 0
    this.collisionsLastStep = 0
    this.#detect = detect
    this.#resolve = resolve
    this.#systems = systems
  }

  spawn(entity) {
    entity.world = this
    if (this.#stepping) this.#incoming.push(entity)
    else this.#entities.set(entity.id, entity)
    return entity
  }

  despawn(id) {
    const entity = this.#entities.get(id)
    if (!entity || !entity.alive) return
    entity.alive = false
    this.#dead.add(id)
  }

  get(id) {
    return this.#entities.get(id)
  }

  get size() {
    return this.#entities.size
  }

  *[Symbol.iterator]() {
    yield* this.#entities.values()
  }

  *ofKind(kind) {
    for (const e of this) if (e.alive && e.kind === kind) yield e
  }

  /** Run `fn` after `delay` seconds of simulation time. */
  after(delay, fn) {
    this.#timers.push({ at: this.time + delay, fn })
  }

  /** Shortest vector from point a to point b on the wrapping arena. */
  delta(a, b) {
    return new Vector2(
      shortestDelta(a.x, b.x, this.width),
      shortestDelta(a.y, b.y, this.height),
    )
  }

  wrapPosition(pos) {
    const { x, y } = pos
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) return pos
    return new Vector2(wrap(x, this.width), wrap(y, this.height))
  }

  /** Random point at least `clearance` away from every solid entity. */
  findSafeSpot(clearance = 120, tries = 40) {
    let best = null
    let bestGap = -Infinity
    for (let i = 0; i < tries; i++) {
      const p = new Vector2(
        Math.random() * this.width,
        Math.random() * this.height,
      )
      let gap = Infinity
      for (const e of this) {
        if (!e.alive || !e.solid) continue
        gap = Math.min(gap, this.delta(p, e.pos).length() - e.radius)
      }
      if (gap >= clearance) return p
      if (gap > bestGap) {
        bestGap = gap
        best = p
      }
    }
    return best
  }

  step(dt, inputs = []) {
    this.#stepping = true
    this.time += dt

    for (const e of this) e.savePrevious()

    for (const system of this.#systems) system(this, dt)

    for (const e of this) {
      if (!e.alive) continue
      e.update(dt, inputs)
      e.pos = this.wrapPosition(e.pos)
    }

    let collisions = 0
    for (const [a, b] of this.#detect(this)) {
      if (!a.alive || !b.alive) continue // consumed earlier in this step
      collisions++
      this.#resolve(this, a, b)
    }
    this.collisionsLastStep = collisions

    this.#runTimers()
    this.#sweep()

    this.#stepping = false
    for (const e of this.#incoming) this.#entities.set(e.id, e)
    this.#incoming.length = 0
  }

  #runTimers() {
    const due = this.#timers.filter((t) => t.at <= this.time)
    if (due.length === 0) return
    this.#timers = this.#timers.filter((t) => t.at > this.time)
    for (const t of due) t.fn()
  }

  #sweep() {
    for (const id of this.#dead) this.#entities.delete(id)
    this.#dead.clear()
  }
}
