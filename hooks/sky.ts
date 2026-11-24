import type { EngineInterface } from 'claude-code'

import type { Phase, Sky, Weather } from '../types'
import { phaseOf, weatherOf } from './cats.js'

export const INITIAL_SKY: Sky = { phase: 'night', weather: 'clear' }

export const PHASE_NAMES: Record<string, Phase> = { noite: 'night', aurora: 'dawn', dia: 'day', tarde: 'dusk' }
export const WEATHER_NAMES: Record<string, Weather> = {
  limpo: 'clear',
  parcial: 'partly',
  nublado: 'cloudy',
  chuva: 'rain',
  tempestade: 'storm',
  neve: 'snow',
  neblina: 'fog',
}

const nameOf = <T extends string>(names: Record<string, T>, value: T): string => Object.keys(names).find(key => names[key] === value) ?? value

export const describe = (now: Sky): string => `${nameOf(PHASE_NAMES, now.phase)}, ${nameOf(WEATHER_NAMES, now.weather)}`

const dig = (value: unknown, ...path: (string | number)[]): unknown =>
  path.reduce<unknown>((here, key) => (typeof here === 'object' && here !== null ? (here as Record<string | number, unknown>)[key] : undefined), value)

// "07:29 AM" em minutos do dia.
const minutesOf = (clock: unknown): number | undefined => {
  const match = typeof clock === 'string' ? /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(clock.trim()) : null

  return match === null ? undefined : (Number(match[1]) % 12) * 60 + (match[3] === 'PM' ? 720 : 0) + Number(match[2])
}

const isSky = (value: unknown): value is Sky =>
  Object.values(PHASE_NAMES).includes(dig(value, 'phase') as Phase) && Object.values(WEATHER_NAMES).includes(dig(value, 'weather') as Weather)

const FETCH_EVERY_MS = 20 * 60 * 1000
let fetchedAt = 0
let report: { weather: Weather; sunrise: number; sunset: number } | undefined

// O clima de agora, do wttr.in: pela cidade guardada, ou pela rede de quem pede.
async function fetchReport($: EngineInterface): Promise<void> {
  const city = await $.store.get('city')
  const place = typeof city === 'string' && city !== '' ? encodeURIComponent(city) : ''
  const answer = await $.http.fetch(`https://wttr.in/${place}?format=j1`)

  if (!answer.ok) {
    throw new Error(`wttr.in respondeu ${answer.status}`)
  }
  const data: unknown = JSON.parse(answer.text)
  const code = Number(dig(data, 'current_condition', 0, 'weatherCode'))

  if (!Number.isFinite(code)) {
    throw new Error('wttr.in respondeu sem o código do clima')
  }
  report = {
    weather: weatherOf(code),
    sunrise: minutesOf(dig(data, 'weather', 0, 'astronomy', 0, 'sunrise')) ?? 360,
    sunset: minutesOf(dig(data, 'weather', 0, 'astronomy', 0, 'sunset')) ?? 1080,
  }
}

/** A fase do dia pelo relógio e o clima pelo serviço, a partir do céu de antes; e o que deu errado, se deu. */
export async function computeSky($: EngineInterface, was: Sky, isForced = false): Promise<{ now: Sky; problem?: string }> {
  const held = await $.store.get('skyHold')
  let next: Sky
  let problem: string | undefined

  if (isSky(held)) {
    next = { phase: held.phase, weather: held.weather }
  } else {
    const ms = await $.clock.now()

    if (isForced || ms - fetchedAt > FETCH_EVERY_MS) {
      fetchedAt = ms
      await fetchReport($).catch((error: unknown) => {
        problem = String(error)
      })
    }
    const date = new Date(ms)
    const zone = -date.getTimezoneOffset()
    const stored = await $.store.get('tz')
    // Onde o relógio do módulo vem em UTC, vale o fuso guardado, ou o de Brasília.
    const offset = zone !== 0 ? zone : typeof stored === 'number' ? stored : -180
    const minute = (((date.getUTCHours() * 60 + date.getUTCMinutes() + offset) % 1440) + 1440) % 1440
    next = { phase: phaseOf(minute, report?.sunrise ?? 360, report?.sunset ?? 1080), weather: report?.weather ?? was.weather }
  }
  return problem === undefined ? { now: next } : { now: next, problem }
}
