/**
 * Immutable 2D vector. Every method returns a NEW Vector2 and never mutates
 * `this` or its argument. Instances are frozen, so an accidental
 * `v.x = 1` throws in strict mode (all ES modules are strict).
 *
 * Because vectors are immutable, keeping the previous state for render
 * interpolation is just `prevPos = pos` — sharing a reference is safe.
 */
export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
    Object.freeze(this)
  }

  static fromAngle(angle, length = 1) {
    return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length)
  }

  add(v) {
    return new Vector2(this.x + v.x, this.y + v.y)
  }

  sub(v) {
    return new Vector2(this.x - v.x, this.y - v.y)
  }

  scale(k) {
    return new Vector2(this.x * k, this.y * k)
  }

  dot(v) {
    return this.x * v.x + this.y * v.y
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y
  }

  length() {
    return Math.hypot(this.x, this.y)
  }

  normalize() {
    const len = this.length()
    return len === 0 ? new Vector2(0, 0) : this.scale(1 / len)
  }

  rotate(angle) {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    return new Vector2(this.x * c - this.y * s, this.x * s + this.y * c)
  }

  angle() {
    return Math.atan2(this.y, this.x)
  }

  toString() {
    return `Vector2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`
  }
}

Vector2.ZERO = new Vector2(0, 0)
