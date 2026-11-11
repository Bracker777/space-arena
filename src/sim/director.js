import { Vector2 } from './vector.js'
import { Asteroid } from './asteroid.js'
import { Pickup } from './pickup.js'

/**
 * Keeps the arena populated: refills asteroids from the edges and drops
 * pickups at safe spots. Uses world.after() timers, so it runs in sim time.
 */
export function startDirector(
  world,
  { pickupEvery = 7, maxPickups = 3, hunterChance = 0.25 } = {},
) {
  function targetAsteroids() {
    return Math.max(4, Math.round((world.width * world.height) / 160_000))
  }

  function edgePoint() {
    return Math.random() < 0.5
      ? new Vector2(0, Math.random() * world.height)
      : new Vector2(Math.random() * world.width, 0)
  }

  function refill() {
    let count = 0
    for (const a of world.ofKind('asteroid')) if (a.size >= 2) count++
    if (count < targetAsteroids()) {
      world.spawn(Asteroid.random(edgePoint(), 3, Math.random() < hunterChance))
    }
    world.after(1.5, refill)
  }

  function dropPickup() {
    let count = 0
    for (const _ of world.ofKind('pickup')) count++ // eslint-disable-line no-unused-vars
    if (count < maxPickups) world.spawn(Pickup.random(world.findSafeSpot(80)))
    world.after(pickupEvery, dropPickup)
  }

  for (let i = 0; i < targetAsteroids(); i++) {
    world.spawn(Asteroid.random(world.findSafeSpot(160), 3, i === 0))
  }
  world.after(1.5, refill)
  world.after(3, dropPickup)
}
