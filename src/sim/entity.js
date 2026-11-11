import { Vector2 } from './vector.js'

/**
 * Base class for everything that lives in the World.
 * Subclasses inherit ONE level only: `class Ship extends Entity`, never deeper.
 * Optional behaviour is attached as component fields (e.g. `entity.homing`,
 * `entity.pickup`), not via extra subclasses — see README, "Композиція".
 */
export class Entity {
  static #nextId = 1
  #id = Entity.#nextId++

  constructor({
    kind = 'entity',
    pos = Vector2.ZERO,
    vel = Vector2.ZERO,
    angle = 0,
    radius = 10,
    solid = true,
  } = {}) {
    this.kind = kind
    this.pos = pos
    this.vel = vel
    this.angle = angle
    this.radius = radius
    this.solid = solid // takes part in collision detection
    this.alive = true
    this.world = null // set by World.spawn

    // previous state for render interpolation (vectors are immutable → safe to share)
    this.prevPos = pos
    this.prevAngle = angle
  }

  get id() {
    return this.#id
  }

  savePrevious() {
    this.prevPos = this.pos
    this.prevAngle = this.angle
  }

  /** Called once per fixed step by World.step. */
  // eslint-disable-next-line no-unused-vars
  update(dt, inputs) {
    this.pos = this.pos.add(this.vel.scale(dt))
  }
}
