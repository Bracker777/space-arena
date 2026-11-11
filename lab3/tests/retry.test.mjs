// node --test   (Node's built-in runner, no dependencies)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  withRetry,
  HttpError,
  BadJsonError,
  BadContentError,
  backoffDelay,
} from '../src/assets/retry.js'

const fast = { baseMs: 1, maxMs: 5 }

test('retries 5xx until success', async () => {
  let calls = 0
  const value = await withRetry(
    async () => {
      calls++
      if (calls < 3) throw new HttpError('/x', 503)
      return 'ok'
    },
    { attempts: 5, ...fast },
  )
  assert.equal(value, 'ok')
  assert.equal(calls, 3)
})

test('retries network errors (TypeError)', async () => {
  let calls = 0
  await withRetry(async () => {
    if (++calls === 1) throw new TypeError('Failed to fetch')
    return 1
  }, fast)
  assert.equal(calls, 2)
})

test('never retries 4xx', async () => {
  let calls = 0
  await assert.rejects(
    withRetry(
      async () => {
        calls++
        throw new HttpError('/missing.png', 404)
      },
      { attempts: 5, ...fast },
    ),
    { name: 'HttpError', status: 404 },
  )
  assert.equal(calls, 1)
})

test('does not retry bad JSON', async () => {
  let calls = 0
  await assert.rejects(
    withRetry(async () => {
      calls++
      throw new BadJsonError('/a.json', new SyntaxError('Unexpected end'))
    }, fast),
    { name: 'BadJsonError' },
  )
  assert.equal(calls, 1)
})

test('gives up after `attempts` and rethrows the last error', async () => {
  let calls = 0
  await assert.rejects(
    withRetry(
      async () => {
        calls++
        throw new HttpError('/x', 500)
      },
      { attempts: 3, ...fast },
    ),
    { status: 500 },
  )
  assert.equal(calls, 3)
})

test('abort during the backoff wait stops immediately', async () => {
  const controller = new AbortController()
  let calls = 0
  const started = Date.now()
  const pending = withRetry(
    async () => {
      calls++
      throw new HttpError('/x', 503)
    },
    { attempts: 5, baseMs: 5000, signal: controller.signal },
  )
  setTimeout(() => controller.abort(), 20)
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(calls, 1)
  assert.ok(Date.now() - started < 1000, 'did not wait for the 5 s backoff')
})

test('backoff grows exponentially and stays within [cap/2, cap]', () => {
  const lo = () => 0
  const hi = () => 0.999999
  assert.equal(backoffDelay(0, 100, 10_000, lo), 50)
  assert.equal(backoffDelay(1, 100, 10_000, lo), 100)
  assert.equal(backoffDelay(2, 100, 10_000, lo), 200)
  assert.ok(backoffDelay(2, 100, 10_000, hi) < 400)
  assert.equal(backoffDelay(10, 100, 1000, lo), 500) // capped at maxMs
})

test('does not retry wrong content (e.g. HTML instead of an image)', async () => {
  let calls = 0
  await assert.rejects(
    withRetry(async () => {
      calls++
      throw new BadContentError('/ship.svg', 'expected an image')
    }, fast),
    { name: 'BadContentError' },
  )
  assert.equal(calls, 1)
})
