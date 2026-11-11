// Lab 2 console experiments. Run: node scripts/lab2-experiments.mjs
import { Entity } from '../src/sim/entity.js'
import { Ship } from '../src/sim/ship.js'
import { Vector2 } from '../src/sim/vector.js'

console.log('--- 1. Delegation (Object.create) ---')
const a = { hello: () => 'hi from a' }
const b = Object.create(a)
console.log('b.hello():', b.hello(), '| own?', Object.hasOwn(b, 'hello'))
a.hello = () => 'a changed'
console.log(
  'after changing a.hello → b.hello():',
  b.hello(),
  '(lookup, not copy)',
)

console.log('\n--- 2. Losing this ---')
class A {
  m() {
    return this
  }
}
const inst = new A()
const m = inst.m
console.log(
  'm()        →',
  m(),
  '(class body is strict → default binding = undefined)',
)
console.log(
  'm.call(a)  →',
  m.call(inst) === inst ? 'inst' : '?',
  '(explicit binding)',
)
const ship = new Ship({ pos: new Vector2(0, 0) })
const fire = ship.fire
try {
  fire()
} catch (e) {
  console.log(
    'const fire = ship.fire; fire() →',
    e.constructor.name + ':',
    e.message,
  )
}
try {
  fire.call(globalThis) // what addEventListener / setTimeout do in a browser
} catch (e) {
  console.log(
    'fire.call(globalThis)          →',
    e.constructor.name + ':',
    e.message,
  )
}
const bound = ship.fire.bind(ship)
console.log(
  'ship.fire.bind(ship)()         →',
  bound(),
  '(no world yet → null, but no error)',
)

console.log('\n--- 3. Object keys vs Map keys ---')
const o = { 1: 'x' }
const mp = new Map([[1, 'x']])
console.log(
  'o[1]       →',
  o[1],
  '| Object.keys(o):',
  Object.keys(o),
  '(keys become strings)',
)
console.log(
  'm.get("1") →',
  mp.get('1'),
  '| m.get(1):',
  mp.get(1),
  '(Map keeps the key type)',
)

console.log('\n--- Prototype chain of a Ship ---')
let p = ship
const chain = []
while (p) {
  chain.push(p === ship ? 'ship (instance)' : p.constructor.name + '.prototype')
  p = Object.getPrototypeOf(p)
}
console.log(chain.join(' → '), '→ null')
console.log('Object.hasOwn(ship, "update"):', Object.hasOwn(ship, 'update'))
console.log(
  'Ship.prototype.update === Entity.prototype.update:',
  Ship.prototype.update === Entity.prototype.update,
)
console.log(
  'Object.getPrototypeOf(Ship) === Entity:',
  Object.getPrototypeOf(Ship) === Entity,
  '(static side chain)',
)
console.log(
  'typeof Ship:',
  typeof Ship,
  '| ship.id:',
  ship.id,
  '| ship.hp:',
  ship.hp,
)

console.log('\n--- Vector2 purity ---')
const v = new Vector2(1, 2)
const w = v.add(new Vector2(3, 4))
console.log(
  'v =',
  String(v),
  'w = v.add(...) =',
  String(w),
  '| v unchanged:',
  v.x === 1 && v.y === 2,
)
try {
  v.x = 99
} catch (e) {
  console.log('v.x = 99 →', e.constructor.name + ':', e.message)
}
