export const KEYMAPS = {
  p1: {
    thrust: ['KeyW', 'ArrowUp'],
    reverse: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    fire: ['Space'],
  },
}

/** Snapshot of one player's controls: { thrust, reverse, left, right, fire } */
export function readControls(input, keymap) {
  const out = {}
  for (const [action, codes] of Object.entries(keymap)) {
    out[action] = codes.some((code) => input.isDown(code))
  }
  return out
}

export function createInput(target = window) {
  const down = new Set()
  const pressed = new Set()

  function onKeyDown(event) {
    if (!down.has(event.code)) {
      pressed.add(event.code)
    }
    down.add(event.code)

    if (
      event.code.startsWith('Arrow') ||
      event.code === 'Space' ||
      event.code === 'Enter' ||
      event.code === 'Slash' ||
      event.code === 'KeyW' ||
      event.code === 'KeyA' ||
      event.code === 'KeyS' ||
      event.code === 'KeyD'
    ) {
      event.preventDefault()
    }
  }

  function onKeyUp(event) {
    down.delete(event.code)
  }

  function onBlur() {
    down.clear()
    pressed.clear()
  }

  target.addEventListener('keydown', onKeyDown)
  target.addEventListener('keyup', onKeyUp)
  target.addEventListener('blur', onBlur)

  return {
    isDown(code) {
      return down.has(code)
    },
    justPressed(code) {
      return pressed.has(code)
    },
    endFrame() {
      pressed.clear()
    },
  }
}
