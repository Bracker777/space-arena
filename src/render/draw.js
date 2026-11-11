function starPositions(width, height, count) {
  const stars = []
  let seed = (width * 73856093) ^ (height * 19349663)

  for (let i = 0; i < count; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const x = (seed % 10000) / 10000
    seed = (seed * 1664525 + 1013904223) >>> 0
    const y = (seed % 10000) / 10000
    seed = (seed * 1664525 + 1013904223) >>> 0
    const r = 0.6 + (seed % 1000) / 1000
    stars.push({ x: x * width, y: y * height, r })
  }

  return stars
}

export function drawArena(ctx, width, height) {
  ctx.fillStyle = '#070b16'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)'
  ctx.lineWidth = 1
  const gap = 80

  ctx.beginPath()
  for (let x = 0; x <= width; x += gap) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }
  for (let y = 0; y <= height; y += gap) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }
  ctx.stroke()

  ctx.fillStyle = '#e2e8f0'
  for (const star of starPositions(width, height, 90)) {
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

const TAU = Math.PI * 2

export function drawShip(ctx, ship, view, time) {
  const color = ship.player?.color ?? '#38bdf8'
  const blink = ship.invulnerable > 0 && Math.floor(time * 12) % 2 === 0

  ctx.save()
  ctx.translate(view.x, view.y)

  if (ship.effects.shield > 0) {
    ctx.strokeStyle = 'rgba(163, 230, 53, 0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, ship.radius + 9 + Math.sin(time * 8) * 1.5, 0, TAU)
    ctx.stroke()
  }

  drawHpBar(ctx, ship.hp / 100, -18, -ship.radius - 16, 36)

  ctx.rotate(view.angle)
  ctx.globalAlpha = blink ? 0.35 : 1

  if (ship.thrust > 0) {
    ctx.fillStyle = '#fb923c'
    ctx.beginPath()
    ctx.moveTo(-16, -6)
    ctx.lineTo(-28 - Math.abs(Math.sin(time * 40)) * 8, 0)
    ctx.lineTo(-16, 6)
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = color
  ctx.strokeStyle = '#f8fafc'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(22, 0)
  ctx.lineTo(-16, -14)
  ctx.lineTo(-8, 0)
  ctx.lineTo(-16, 14)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

function drawHpBar(ctx, ratio, x, y, width) {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
  ctx.fillRect(x, y, width, 4)
  ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#f87171'
  ctx.fillRect(x, y, width * Math.max(0, ratio), 4)
}

export function drawBullet(ctx, bullet, view) {
  const color = bullet.homing ? '#c084fc' : (bullet.player?.color ?? '#f8fafc')
  ctx.save()
  ctx.translate(view.x, view.y)
  ctx.rotate(view.angle)
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 8
  ctx.fillRect(-6, -1.5, 12, 3)
  ctx.restore()
}

export function drawAsteroid(ctx, asteroid, view) {
  const { shape, radius } = asteroid
  ctx.save()
  ctx.translate(view.x, view.y)
  ctx.rotate(view.angle)
  ctx.fillStyle = asteroid.homing ? '#3b1d24' : '#1e293b'
  ctx.strokeStyle = asteroid.homing ? '#f87171' : '#94a3b8'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i < shape.length; i++) {
    const a = (i / shape.length) * TAU
    const r = radius * shape[i]
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

export function drawPickup(ctx, pickup, view, time, effects) {
  const info = effects[pickup.pickup.effect]
  const fading = pickup.ttl < 3 && Math.floor(time * 6) % 2 === 0
  ctx.save()
  ctx.translate(view.x, view.y + Math.sin(pickup.age * 3) * 3)
  ctx.globalAlpha = fading ? 0.4 : 1
  ctx.rotate(pickup.age * 1.5)
  ctx.strokeStyle = info.color
  ctx.lineWidth = 2
  ctx.strokeRect(
    -pickup.radius * 0.75,
    -pickup.radius * 0.75,
    pickup.radius * 1.5,
    pickup.radius * 1.5,
  )
  ctx.rotate(-pickup.age * 1.5)
  ctx.fillStyle = info.color
  ctx.font = 'bold 13px ui-monospace, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(info.label, 0, 1)
  ctx.restore()
}

export function drawExplosion(ctx, explosion, view) {
  const t = Math.max(0, explosion.ttl / explosion.maxTtl)
  ctx.save()
  ctx.translate(view.x, view.y)
  ctx.globalAlpha = t
  ctx.fillStyle = explosion.color
  for (const p of explosion.particles) {
    ctx.beginPath()
    ctx.arc(p.offset.x, p.offset.y, p.size * (0.5 + t), 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

function drawPlayerPanel(ctx, player, x, y, effects, alignRight) {
  const w = 300
  const left = alignRight ? x - w : x
  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)'
  ctx.fillRect(left, y, w, 64)

  ctx.fillStyle = player.color
  ctx.font = 'bold 15px ui-monospace, Consolas, monospace'
  ctx.textAlign = 'left'
  ctx.fillText(
    `${player.name}  ${String(player.score).padStart(5, '0')}`,
    left + 12,
    y + 22,
  )

  const ship = player.ship
  if (ship) {
    drawHpBar(ctx, ship.hp / 100, left + 12, y + 32, w - 24)
    let ex = left + 12
    ctx.font = '12px ui-monospace, Consolas, monospace'
    for (const [name, left_] of Object.entries(ship.effects)) {
      if (left_ <= 0) continue
      ctx.fillStyle = effects[name].color
      const label = `${effects[name].label} ${left_.toFixed(1)}s`
      ctx.fillText(label, ex, y + 54)
      ex += ctx.measureText(label).width + 12
    }
  } else {
    ctx.fillStyle = '#f87171'
    ctx.font = '12px ui-monospace, Consolas, monospace'
    ctx.fillText('respawning…', left + 12, y + 46)
  }
  ctx.fillStyle = '#64748b'
  ctx.font = '11px ui-monospace, Consolas, monospace'
  ctx.textAlign = 'right'
  ctx.fillText(
    `asteroids ${player.asteroids ?? 0} · best ${player.best ?? 0}`,
    left + w - 12,
    y + 22,
  )
  ctx.textAlign = 'left'
}

export function drawHud(
  ctx,
  { stats, players, world, width, height, effects, extra = '', error = '' },
) {
  drawPlayerPanel(ctx, players[0], 12, 12, effects, false)
  if (players[1])
    drawPlayerPanel(ctx, players[1], width - 12, 12, effects, true)

  ctx.font = '12px ui-monospace, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(148, 163, 184, 0.85)'
  ctx.fillText(
    `fps ${stats.framesPerSecond} · steps/s ${stats.stepsPerSecond} · entities ${world.size} · collisions ${world.collisionsLastStep}`,
    width / 2,
    24,
  )
  ctx.fillText(
    'WASD / arrows — fly   ·   Space — fire   ·   S shield · R rapid fire · H homing',
    width / 2,
    height - 14,
  )
  if (extra) {
    ctx.fillStyle = '#fbbf24'
    ctx.fillText(extra, width / 2, 44)
  }
  if (error) {
    ctx.fillStyle = '#f87171'
    ctx.fillText(`✗ ${error}`, width / 2, 92)
  }
  ctx.textAlign = 'left'
}
