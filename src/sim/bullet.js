import { Entity } from './entity.js'
import { makeHoming } from './homing.js'

export const BULLET = {
  radius: 3,
  ttl: 1.1,
  homingTtl: 2.2,
  damage: 25,
}

export class Bullet extends Entity {
  constructor({ pos, vel, player = null, homing = false }) {
    super({
      kind: 'bullet',
      pos,
      vel,
      angle: vel.angle(),
      radius: BULLET.radius,
    })
    this.player = player
    this.damage = BULLET.damage
    this.ttl = homing ? BULLET.homingTtl : BULLET.ttl

    // composition: homing is a component, not a HomingBullet subclass
    if (homing) {
      this.homing = makeHoming({
        targetKinds: ['ship', 'asteroid'],
        turnRate: 4.5,
        range: 450,
        ignorePlayer: player,
      })
    }
  }

  update(dt) {
    super.update(dt)
    this.angle = this.vel.angle()
    this.ttl -= dt
    if (this.ttl <= 0) this.world.despawn(this.id)
  }
}
