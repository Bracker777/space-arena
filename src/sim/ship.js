import { Entity } from './entity.js'
import { Vector2 } from './vector.js'
import { Bullet } from './bullet.js'
import { Explosion } from './explosion.js'

export const SHIP = {
  rotation: 4.4,
  thrust: 560,
  reverse: 220,
  drag: 1.05,
  maxSpeed: 360,
  maxHp: 100,
  radius: 15,
  fireCooldown: 0.22,
  rapidCooldown: 0.08,
  bulletSpeed: 620,
  respawnDelay: 2,
  spawnInvulnerable: 1.5,
}

export class Ship extends Entity {
  #hp = SHIP.maxHp
  #cooldown = 0

  constructor({
    pos = Vector2.ZERO,
    angle = -Math.PI / 2,
    player = null,
  } = {}) {
    super({ kind: 'ship', pos, angle, radius: SHIP.radius })
    this.player = player
    this.thrust = 0
    this.invulnerable = 0
    this.contactCooldown = 0
    // timed effects granted by pickups (seconds left)
    this.effects = { shield: 0, rapid: 0, homing: 0 }
  }

  get hp() {
    return this.#hp
  }

  /** Spawn a fresh ship for `player` at a safe spot (or at `pos`). */
  static spawnFor(world, player, pos = world.findSafeSpot(140)) {
    const ship = new Ship({ pos, player })
    ship.invulnerable = SHIP.spawnInvulnerable
    player.ship = ship
    return world.spawn(ship)
  }

  /** Steering from Lab 1, rewritten on top of Vector2. No DOM here. */
  control(input, dt) {
    if (input.left) this.angle -= SHIP.rotation * dt
    if (input.right) this.angle += SHIP.rotation * dt

    const forward = Vector2.fromAngle(this.angle)
    this.thrust = 0
    if (input.thrust) {
      this.vel = this.vel.add(forward.scale(SHIP.thrust * dt))
      this.thrust = 1
    }
    if (input.reverse) {
      this.vel = this.vel.sub(forward.scale(SHIP.reverse * dt))
    }

    this.vel = this.vel.scale(Math.exp(-SHIP.drag * dt))
    const speed = this.vel.length()
    if (speed > SHIP.maxSpeed) this.vel = this.vel.scale(SHIP.maxSpeed / speed)

    if (input.fire) this.fire()
  }

  /**
   * Spawns a bullet from the nose, inheriting the ship's velocity.
   * A regular method: `this` depends on HOW it is called. Passing `ship.fire`
   * as a callback loses `this` — see README, "Баг із this".
   */
  fire() {
    // reading a private field on a foreign `this` throws — the bug is loud, not silent
    if (this.#cooldown > 0 || !this.alive || !this.world) return null
    this.#cooldown =
      this.effects.rapid > 0 ? SHIP.rapidCooldown : SHIP.fireCooldown

    const dir = Vector2.fromAngle(this.angle)
    const bullet = new Bullet({
      pos: this.pos.add(dir.scale(this.radius + 8)),
      vel: this.vel.add(dir.scale(SHIP.bulletSpeed)),
      player: this.player,
      homing: this.effects.homing > 0,
    })
    return this.world.spawn(bullet)
  }

  applyEffect(effect, duration) {
    this.effects[effect] = Math.max(this.effects[effect] ?? 0, duration)
  }

  /** Returns true if damage was actually applied. */
  takeDamage(amount, byPlayer = null) {
    if (!this.alive || this.invulnerable > 0 || this.effects.shield > 0)
      return false
    this.#hp = Math.max(0, this.#hp - amount)
    if (this.#hp === 0) this.#die(byPlayer)
    return true
  }

  #die(byPlayer) {
    const world = this.world
    world.despawn(this.id)
    world.spawn(
      new Explosion({
        pos: this.pos,
        vel: this.vel.scale(0.3),
        color: this.player?.color ?? '#38bdf8',
        count: 48,
        power: 260,
      }),
    )

    if (!this.player) return
    this.player.deaths++
    this.player.ship = null
    if (byPlayer && byPlayer !== this.player) byPlayer.score += 100
    // remember this life's results for the respawn menu, then reset them
    const player = this.player
    player.best = Math.max(player.best ?? 0, player.score)
    player.lastDeath = {
      at: world.time,
      by: byPlayer?.name ?? null,
      score: player.score,
      asteroids: player.asteroids ?? 0,
      best: player.best,
    }
    player.score = 0
    player.asteroids = 0

    // humans respawn from the respawn menu (enabled after SHIP.respawnDelay);
    // bots come back on their own.
    // arrow function: no own `this`, so `this.player` here is still this ship's player
    if (this.player.autoRespawn) {
      world.after(SHIP.respawnDelay, () => Ship.spawnFor(world, this.player))
    }
  }

  update(dt, inputs) {
    this.#cooldown = Math.max(0, this.#cooldown - dt)
    this.invulnerable = Math.max(0, this.invulnerable - dt)
    this.contactCooldown = Math.max(0, this.contactCooldown - dt)
    for (const key of Object.keys(this.effects)) {
      this.effects[key] = Math.max(0, this.effects[key] - dt)
    }

    const input = this.player ? inputs?.[this.player.slot] : null
    if (input) this.control(input, dt)

    super.update(dt)
  }
}
