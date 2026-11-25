import type { EngineInterface } from 'claude-code'

import type { Feast, Phase, Sky, Weather } from '../types'
import { phaseOf, weatherOf } from './cats.js'
import { FEAST_NAMES, feastOf } from './festas.js'

export const INITIAL_SKY: Sky = { phase: 'night', weather: 'clear', feast: 'none' }

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

export const describe = (now: Sky): string =>
  `${nameOf(PHASE_NAMES, now.phase)}, ${nameOf(WEATHER_NAMES, now.weather)}${now.feast === 'none' ? '' : `, festa: ${nameOf(FEAST_NAMES, now.feast)}`}`

const dig = (value: unknown, ...path: (string | number)[]): unknown =>
  path.reduce<unknown>((here, key) => (typeof here === 'object' && here !== null ? (here as Record<string | number, unknown>)[key] : undefined), value)

// "07:29 AM" em minutos do dia.
const minutesOf = (clock: unknown): number | undefined => {
  const match = typeof clock === 'string' ? /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(clock.trim()) : null

  return match === null ? undefined : (Number(match[1]) % 12) * 60 + (match[3] === 'PM' ? 720 : 0) + Number(match[2])
}

const textOf = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** Uma leitura do clima: quando foi feita, para que cidade pedida (vazio é a da rede) e o que veio. */
export type Report = { at: number; city: string; weather: Weather; sunrise: number; sunset: number; temp: number | null; area: string; country: string }

const isReport = (value: unknown): value is Report =>
  typeof dig(value, 'at') === 'number' &&
  typeof dig(value, 'city') === 'string' &&
  Object.values(WEATHER_NAMES).includes(dig(value, 'weather') as Weather) &&
  typeof dig(value, 'sunrise') === 'number' &&
  typeof dig(value, 'sunset') === 'number' &&
  typeof dig(value, 'area') === 'string' &&
  typeof dig(value, 'country') === 'string'

// A sondagem: uma leitura a cada POLL minutos; se falha, tenta de novo em 1, 2, 5
// e 10 minutos. A leitura fica guardada, então sessões abertas ao mesmo tempo
// dividem a mesma e uma sessão nova começa com o último clima visto.
const POLL_DEFAULT = 10
export const POLL_MIN = 5
export const POLL_MAX = 180
const RETRY_MINUTES = [1, 2, 5, 10]
const MINUTE_MS = 60000
let failures = 0
let retryAt = 0

/** De quantos em quantos minutos o clima é lido. */
export async function pollMinutes($: EngineInterface): Promise<number> {
  const held = await $.store.get('poll')

  return typeof held === 'number' && held >= POLL_MIN && held <= POLL_MAX ? held : POLL_DEFAULT
}

async function cityOf($: EngineInterface): Promise<string> {
  return textOf(await $.store.get('city'))
}

/** A última leitura guardada para a cidade em uso. */
export async function lastReport($: EngineInterface): Promise<Report | undefined> {
  const held = await $.store.get('report')

  return isReport(held) && held.city === (await cityOf($)) ? held : undefined
}

// O clima de agora, do wttr.in: pela cidade guardada, ou pela rede de quem pede.
async function fetchReport($: EngineInterface, city: string, at: number): Promise<Report> {
  const answer = await $.http.fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)

  if (!answer.ok) {
    throw new Error(`wttr.in respondeu ${answer.status}`)
  }
  const data: unknown = JSON.parse(answer.text)
  const code = Number(dig(data, 'current_condition', 0, 'weatherCode'))
  const temp = Number(dig(data, 'current_condition', 0, 'temp_C'))

  if (!Number.isFinite(code)) {
    throw new Error('wttr.in respondeu sem o código do clima')
  }

  return {
    at,
    city,
    weather: weatherOf(code),
    sunrise: minutesOf(dig(data, 'weather', 0, 'astronomy', 0, 'sunrise')) ?? 360,
    sunset: minutesOf(dig(data, 'weather', 0, 'astronomy', 0, 'sunset')) ?? 1080,
    temp: Number.isFinite(temp) ? temp : null,
    area: textOf(dig(data, 'nearest_area', 0, 'areaName', 0, 'value')),
    country: textOf(dig(data, 'nearest_area', 0, 'country', 0, 'value')),
  }
}

// Sem leitura do serviço, o país sai do fuso do sistema, onde ele basta para dizer.
const BRAZIL_ZONES = /^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Manaus|Belem|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Maceio|Araguaina|Noronha|Santarem|Eirunepe)$/

const zoneCountry = (): string => {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone

    return BRAZIL_ZONES.test(zone) ? 'Brazil' : zone === 'Europe/Lisbon' ? 'Portugal' : ''
  } catch {
    return ''
  }
}

/** A fase do dia pelo relógio, o clima pela sondagem e a festa pela data e pelo país, a partir do céu de antes; e o que deu errado, se deu. */
export async function computeSky($: EngineInterface, was: Sky, isForced = false): Promise<{ now: Sky; problem?: string }> {
  const ms = await $.clock.now()
  const every = (await pollMinutes($)) * MINUTE_MS
  let report = await lastReport($)
  let problem: string | undefined

  if (isForced || ((report === undefined || ms - report.at >= every) && ms >= retryAt)) {
    try {
      report = await fetchReport($, await cityOf($), ms)
      await $.store.set('report', report)
      failures = 0
      retryAt = 0
    } catch (error) {
      failures++
      retryAt = ms + Math.min(every, (RETRY_MINUTES[Math.min(failures, RETRY_MINUTES.length) - 1] ?? 10) * MINUTE_MS)
      problem = String(error)
    }
  }
  const date = new Date(ms)
  const zone = -date.getTimezoneOffset()
  const stored = await $.store.get('tz')
  // Onde o relógio do módulo vem em UTC, vale o fuso guardado, ou o de Brasília.
  const offset = zone !== 0 ? zone : typeof stored === 'number' ? stored : -180
  const local = new Date(ms + offset * MINUTE_MS)
  const held = await $.store.get('skyHold')
  const party = await $.store.get('feastHold')
  const feast: Feast = Object.values(FEAST_NAMES).includes(party as Feast)
    ? (party as Feast)
    : feastOf(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate(), report?.country !== undefined && report.country !== '' ? report.country : zoneCountry())
  const phase = dig(held, 'phase') as Phase
  const weather = dig(held, 'weather') as Weather
  const now: Sky =
    Object.values(PHASE_NAMES).includes(phase) && Object.values(WEATHER_NAMES).includes(weather)
      ? { phase, weather, feast }
      : { phase: phaseOf(local.getUTCHours() * 60 + local.getUTCMinutes(), report?.sunrise ?? 360, report?.sunset ?? 1080), weather: report?.weather ?? was.weather, feast }

  return problem === undefined ? { now } : { now, problem }
}

/** A sondagem em uma linha: de onde é a leitura, a idade dela e quando vem a próxima. */
export async function pollLine($: EngineInterface): Promise<string> {
  const ms = await $.clock.now()
  const every = await pollMinutes($)
  const report = await lastReport($)

  if (report === undefined) {
    return `Ainda sem leitura do clima; nova tentativa em ${Math.max(1, Math.ceil((retryAt - ms) / MINUTE_MS))} min.`
  }
  const age = Math.max(0, Math.round((ms - report.at) / MINUTE_MS))
  const next = Math.max(1, Math.ceil(Math.max(report.at + every * MINUTE_MS, retryAt) / MINUTE_MS - ms / MINUTE_MS))
  const where = [report.area, report.country].filter(part => part !== '').join(', ')

  return `${where === '' ? 'Local pela rede' : where}${report.temp === null ? '' : `, ${report.temp} °C`}. Lido há ${age} min; próxima leitura em ${next} min (a cada ${every}).`
}
