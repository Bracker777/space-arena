/**
 * DOM overlay shown while the human player's ship is dead.
 * The "Respawn" button unlocks after `delay` seconds of sim time
 * (the lab's 2 s), then Enter / Space / R or a click brings the ship back.
 */
export function createRespawnMenu(root, { delay, onRespawn }) {
  const el = document.createElement('div')
  el.className = 'respawn-menu'
  el.hidden = true
  el.innerHTML = `
    <div class="respawn-card" role="dialog" aria-labelledby="respawn-title">
      <h2 id="respawn-title">Корабель знищено</h2>
      <p class="respawn-cause"></p>
      <dl class="respawn-stats">
        <div><dt>Рахунок</dt><dd data-score></dd></div>
        <div><dt>Астероїдів</dt><dd data-asteroids></dd></div>
        <div><dt>Рекорд</dt><dd data-best></dd></div>
      </dl>
      <p class="respawn-note">Рахунок обнуляється — нове життя з нуля</p>
      <button type="button" class="respawn-button" disabled></button>
      <p class="respawn-hint">Enter · Space · R</p>
    </div>`
  root.append(el)

  const cause = el.querySelector('.respawn-cause')
  const score = el.querySelector('[data-score]')
  const asteroids = el.querySelector('[data-asteroids]')
  const best = el.querySelector('[data-best]')
  const button = el.querySelector('.respawn-button')

  let player = null
  let ready = false

  function respawn() {
    if (!player || !ready || player.ship) return
    onRespawn(player)
    hide()
  }

  function hide() {
    el.hidden = true
    ready = false
    document.querySelector('#game')?.focus()
  }

  button.addEventListener('click', respawn)
  window.addEventListener('keydown', (e) => {
    if (el.hidden || e.repeat) return // held Space from the fight doesn't count
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyR') {
      e.preventDefault()
      respawn()
    }
  })

  return {
    /** Call every frame. */
    update(p, time) {
      player = p
      if (p.ship || !p.lastDeath) {
        if (!el.hidden) hide()
        return
      }

      if (el.hidden) {
        el.hidden = false
        cause.textContent = p.lastDeath.by
          ? `Вас збив ${p.lastDeath.by}`
          : 'Розбився об астероїд'
        // the player's score is already reset; show the results of the life that ended
        const d = p.lastDeath
        score.textContent = d.score
        asteroids.textContent = d.asteroids
        best.textContent =
          d.score > 0 && d.score >= d.best ? `${d.best} ★` : d.best
      }

      const left = p.lastDeath.at + delay - time
      ready = left <= 0
      button.disabled = !ready
      button.textContent = ready
        ? 'Респавн'
        : `Респавн через ${left.toFixed(1)} с`
    },
  }
}
