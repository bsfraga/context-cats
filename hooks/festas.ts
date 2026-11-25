// As festas do ano: qual vale numa data e num país, e o que cada uma põe no cômodo.

import type { Feast } from '../types'
import { at, box, P, sprite } from './pixels.js'
import type { Palette } from './pixels.js'

export const FEAST_NAMES: Record<string, Feast> = {
  nenhuma: 'none',
  anonovo: 'newyear',
  carnaval: 'carnival',
  namorados: 'valentine',
  pascoa: 'easter',
  junina: 'junina',
  halloween: 'halloween',
  natal: 'christmas',
}

const DAY_MS = 86400000
const dayOf = (year: number, month: number, day: number): number => Math.floor(Date.UTC(year, month - 1, day) / DAY_MS)

// O domingo de Páscoa do calendário gregoriano.
const easter = (year: number): number => {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const n = h + l - 7 * m + 114

  return dayOf(year, Math.floor(n / 31), (n % 31) + 1)
}

// O da Páscoa ortodoxa: a conta juliana, treze dias adiante neste século.
const orthodoxEaster = (year: number): number => {
  const d = (19 * (year % 19) + 15) % 30
  const e = (2 * (year % 4) + 4 * (year % 7) - d + 34) % 7
  const n = d + e + 114

  return dayOf(year, Math.floor(n / 31), (n % 31) + 1) + 13
}

const ORTHODOX = ['greece', 'russia', 'ukraine', 'serbia', 'romania', 'bulgaria', 'georgia', 'belarus', 'cyprus', 'moldova', 'montenegro', 'north macedonia']
const CARNIVAL = [
  'brazil',
  'portugal',
  'italy',
  'spain',
  'germany',
  'bolivia',
  'uruguay',
  'argentina',
  'colombia',
  'ecuador',
  'panama',
  'venezuela',
  'haiti',
  'angola',
  'cape verde',
  'trinidad and tobago',
]

/** A festa de uma data local num país (o nome em inglês que o serviço de clima devolve; vazio se não se sabe). */
export const feastOf = (year: number, month: number, day: number, country: string): Feast => {
  const today = dayOf(year, month, day)
  const where = country.trim().toLowerCase()
  const within = (from: number, to: number) => today >= from && today <= to

  if (within(dayOf(year, 12, 30), dayOf(year, 12, 31)) || within(dayOf(year, 1, 1), dayOf(year, 1, 2))) {
    return 'newyear'
  }
  if (within(dayOf(year, 12, 1), dayOf(year, 12, 29))) {
    return 'christmas'
  }
  // No Brasil o Dia dos Namorados é 12 de junho; no resto, 14 de fevereiro.
  if (where === 'brazil' ? within(dayOf(year, 6, 10), dayOf(year, 6, 12)) : within(dayOf(year, 2, 12), dayOf(year, 2, 14))) {
    return 'valentine'
  }
  const sunday = ORTHODOX.includes(where) ? orthodoxEaster(year) : easter(year)

  if (CARNIVAL.includes(where) && within(sunday - 51, sunday - 46)) {
    return 'carnival'
  }
  if (within(sunday - 7, sunday + 1)) {
    return 'easter'
  }
  if ((where === 'brazil' || where === 'portugal') && within(dayOf(year, 6, 13), dayOf(year, 6, 30))) {
    return 'junina'
  }
  if (within(dayOf(year, 10, 24), dayOf(year, 10, 31))) {
    return 'halloween'
  }

  return 'none'
}

/** O enfeite de uma festa, por camada da cena; `window` usa as coordenadas da janela (280 por 240). */
export type Decor = { wall: string; door: string; floor: string; window: string; over: string; css: string; hat: string }

const NONE: Decor = { wall: '', door: '', floor: '', window: '', over: '', css: '', hat: '' }

const pick = (colors: string[], i: number): string => colors[((i % colors.length) + colors.length) % colors.length] ?? '#ffffff'

// Um cordão de ponta a ponta da parede, preso a cada 400 unidades, com um enfeite a cada 50.
const sagAt = (x: number): number => Math.round(40 + 44 * (1 - (2 * ((((x % 400) + 400) % 400) / 400) - 1) ** 2))

const garland = (flag: (x: number, y: number, i: number) => string, cord = '#14101f'): string => {
  let line = 'M-400 40'
  let flags = ''

  for (let x = -350; x <= 2000; x += 50) {
    line += `L${x} ${sagAt(x)}`
  }
  for (let i = -8; i < 40; i++) {
    flags += flag(25 + i * 50, sagAt(25 + i * 50) + 1, i)
  }

  return `<path d="${line}" fill="none" stroke="${cord}" stroke-width="3"/>${flags}${[0, 400, 800, 1200, 1600].map(x => box(x - 4, 34, 8, 8, '#8a6a1c')).join('')}`
}

const pennants = (colors: string[]) => garland((x, y, i) => `<path d="M${x - 14} ${y}h28l-14 26z" fill="${pick(colors, i)}"/>`)

const confetti = (colors: string[], many: number): string =>
  Array.from({ length: many }, (_, i) =>
    box(-400 + ((i * 137) % 2390), -24, i % 2 === 0 ? 6 : 8, i % 2 === 0 ? 10 : 6, pick(colors, i), ` class="conf" style="animation-duration:${14 + (i % 5) * 2}s;animation-delay:-${((i * 1.7) % 20).toFixed(1)}s"`),
  ).join('')

const CONFETTI_CSS = `
.conf{animation:conf 16s linear infinite}
@keyframes conf{0%{transform:translate(0px,0px)}50%{transform:translate(36px,520px)}100%{transform:translate(0px,1040px)}}`

// O chapéu entra entre as orelhas do gato sentado.
const hat = (rows: string[], palette: Palette): string => at(4 * P, -3 * P, sprite(rows, palette))

const CONE = ['...YY...', '...AA...', '..ABBA..', '..BAAB..', '.ABBAAB.', '.BAABBA.', 'YYYYYYYY']
const HEART = ['.R.R.', 'RWRRR', 'RRRRR', '.RRR.', '..R..']
const HEART_RED: Palette = { R: '#d9415f', W: '#f6a3b4' }
const HEART_PINK: Palette = { R: '#f08aa4', W: '#ffd3dd' }

const newYear = (): Decor => {
  const rays: [number, number][] = [
    [28, 0],
    [20, 20],
    [0, 28],
    [-20, 20],
    [-28, 0],
    [-20, -20],
    [0, -28],
    [20, -20],
    [14, 0],
    [0, 14],
    [-14, 0],
    [0, -14],
  ]
  const burst = (cx: number, cy: number, color: string, delay: number) =>
    `<g class="fw" opacity="0" style="animation-delay:-${delay}s">${rays.map(([dx, dy]) => box(cx + dx - 2, cy + dy - 2, 4, 4, color)).join('')}</g>`
  const balloon = (x: number, y: number, color: string, shine: string) =>
    `<path d="M${x + 14} ${y + 36}L500 826" stroke="#cfd3e6" stroke-width="2" fill="none" opacity="0.6"/>` + box(x + 4, y, 20, 36, color) + box(x, y + 4, 28, 28, color) + box(x + 4, y + 6, 6, 8, shine) + box(x + 10, y + 36, 8, 4, color)

  return {
    ...NONE,
    wall: pennants(['#e6b93c', '#dfe6ff', '#f6dc9a', '#8d7bb5']),
    window: burst(70, 80, '#f6dc9a', 0) + burst(204, 104, '#f08aa4', 2.2) + burst(140, 56, '#8fd6ff', 4.1),
    floor: `<g class="sway">${balloon(456, 640, '#e6b93c', '#fff1b0') + balloon(488, 604, '#dfe6ff', '#ffffff') + balloon(522, 650, '#e6b93c', '#fff1b0')}</g>` + box(488, 822, 24, 12, '#3a5f8a') + box(488, 822, 24, 4, '#5a86b8'),
    over: confetti(['#e6b93c', '#dfe6ff', '#f6dc9a'], 16),
    css: `${CONFETTI_CSS}
.fw{transform-box:fill-box;transform-origin:50% 50%;animation:fw 6s ease-out infinite}
@keyframes fw{0%{transform:scale(0.1);opacity:0}8%{opacity:1}45%{transform:scale(1);opacity:0.9}70%,100%{transform:scale(1.15);opacity:0}}
.sway{transform-origin:500px 826px;animation:sway 6s ease-in-out infinite}
@keyframes sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}`,
    hat: hat(CONE, { Y: '#fff1b0', A: '#e6b93c', B: '#dfe6ff' }),
  }
}

const MASK = ['R.B..Y..B.R', 'RRBBYYYBBRR', '.GGGGGGGGG.', 'GGKKGGGKKGG', 'GGKKGGGKKGG', '.GGGG.GGGG.']

const carnival = (): Decor => {
  const colors = ['#e6b93c', '#d9415f', '#4f9a5b', '#5aa8d9', '#b06acb', '#f08a3c']
  const curl = (x: number, color: string) => `<path d="M${x} 44q22 26 0 52t0 52t0 52" fill="none" stroke="${color}" stroke-width="4"/>`

  return {
    ...NONE,
    wall: pennants(colors) + curl(400, '#e6b93c') + curl(800, '#d9415f') + curl(1200, '#5aa8d9') + at(676, 196, sprite(MASK, { G: '#e6b93c', K: '#1c1729', R: '#d9415f', B: '#5aa8d9', Y: '#4f9a5b' })),
    // um tambor e confete caído no chão
    floor:
      box(468, 782, 64, 52, '#d9415f') +
      box(468, 782, 64, 8, '#f3ecdc') +
      box(468, 790, 64, 4, '#e6b93c') +
      box(468, 826, 64, 8, '#e6b93c') +
      box(480, 794, 4, 32, '#f6dc9a') +
      box(498, 794, 4, 32, '#f6dc9a') +
      box(516, 794, 4, 32, '#f6dc9a') +
      [0, 1, 2, 3, 4, 5, 6, 7].map(i => box(420 + ((i * 53) % 170), 828 + ((i * 7) % 12), 8, 4, pick(colors, i))).join(''),
    over: confetti(colors, 30),
    css: CONFETTI_CSS,
    hat: hat(CONE, { Y: '#e6b93c', A: '#d9415f', B: '#5aa8d9' }),
  }
}

const valentine = (): Decor => {
  const rose = (x: number, y: number) => box(x + 10, y + 16, 4, 800 - y - 16, '#3d7a47') + box(x, y, 24, 20, '#d9415f') + box(x + 4, y - 4, 16, 8, '#d9415f') + box(x + 8, y + 4, 8, 8, '#f08aa4')

  return {
    ...NONE,
    wall: garland((x, y, i) => at(x - 10, y, sprite(HEART, i % 2 === 0 ? HEART_RED : HEART_PINK))),
    door: at(690, 466, sprite(HEART, HEART_RED)),
    floor: rose(472, 716) + rose(488, 692) + rose(506, 722) + box(480, 786, 40, 48, '#5a86b8') + box(476, 782, 48, 8, '#7fb3d9') + box(484, 794, 6, 32, '#a8d0f0'),
    over: [0, 1, 2, 3, 4, 5, 6, 7]
      .map(i => at(120 + i * 190, 700 + ((i * 67) % 180), `<g class="rise" opacity="0" style="animation-delay:-${(i * 1.9).toFixed(1)}s">${sprite(HEART, i % 2 === 0 ? HEART_PINK : HEART_RED)}</g>`))
      .join(''),
    css: `
.rise{animation:rise 14s linear infinite}
@keyframes rise{0%{transform:translate(0px,0px);opacity:0}15%{opacity:0.75}80%{opacity:0.5}100%{transform:translate(24px,-420px);opacity:0}}`,
  }
}

const EARS = ['.WW..WW.', '.WN..NW.', '.WN..NW.', '.WN..NW.', '.WW..WW.', '..WWWW..']

const easterDecor = (): Decor => {
  const egg = (x: number, y: number, shell: string, band: string) => box(x + 4, y, 8, 4, shell) + box(x, y + 4, 16, 12, shell) + box(x + 4, y + 16, 8, 4, shell) + box(x, y + 8, 16, 4, band)

  return {
    ...NONE,
    wall: pennants(['#f6c1d0', '#bfe3c9', '#fbe9a8', '#c3d7f5', '#dcc6f0']),
    floor:
      // cesta com alça, ovos dentro e alguns escondidos pelo cômodo
      box(456, 760, 8, 46, '#96693a') +
      box(536, 760, 8, 46, '#96693a') +
      box(456, 752, 88, 8, '#b98a52') +
      egg(470, 790, '#f6c1d0', '#d9415f') +
      egg(492, 786, '#c3d7f5', '#5aa8d9') +
      egg(514, 790, '#fbe9a8', '#e6b93c') +
      box(452, 806, 96, 28, '#b98a52') +
      box(452, 806, 96, 4, '#d8ad72') +
      box(452, 818, 96, 4, '#96693a') +
      box(476, 806, 4, 28, '#96693a') +
      box(520, 806, 4, 28, '#96693a') +
      egg(566, 816, '#bfe3c9', '#4f9a5b') +
      egg(946, 630, '#dcc6f0', '#b06acb') +
      egg(1158, 170, '#fbe9a8', '#e6b93c') +
      egg(388, 598, '#c3d7f5', '#5aa8d9') +
      egg(1250, 816, '#f6c1d0', '#d9415f'),
    hat: hat(EARS, { W: '#f3ecdc', N: '#f08aa4' }),
  }
}

const STRAW = ['........', '..SSSS..', '.SSSSSS.', '.RRRRRR.', 'SSSSSSSS', 'DSSSSSSD']

const junina = (): Decor => {
  const colors = ['#e6b93c', '#d9415f', '#4f9a5b', '#5aa8d9', '#f08a3c']
  // balão de papel: um losango com gomos e a boca acesa
  const lantern = (x: number, y: number, color: string, stripe: string) =>
    `<path d="M${x} ${y}l28 36l-28 44l-28 -44z" fill="${color}"/><path d="M${x} ${y}l10 36l-10 44l-10 -44z" fill="${stripe}"/>` + box(x - 6, y + 78, 12, 6, '#fff1b0', ' class="glow"')

  return {
    ...NONE,
    wall: garland((x, y, i) => `<path d="M${x - 14} ${y}h28v30l-14 -10l-14 10z" fill="${pick(colors, i)}"/>`) + lantern(200, 84, '#d9415f', '#e6b93c') + lantern(1000, 84, '#5aa8d9', '#f3ecdc') + lantern(1400, 84, '#4f9a5b', '#e6b93c'),
    window: `<g class="ballo">${lantern(200, 0, '#f08a3c', '#e6b93c')}</g>`,
    // uma bacia de pipoca e espigas de milho
    floor:
      [0, 1, 2, 3, 4, 5, 6].map(i => box(464 + i * 10, 782 - ((i * 5) % 9), 12, 12, i % 2 === 0 ? '#fff6dc' : '#f3e6b8')).join('') +
      box(456, 794, 88, 40, '#d9415f') +
      box(456, 794, 88, 6, '#f08aa4') +
      box(456, 814, 88, 6, '#f3ecdc') +
      box(556, 814, 44, 16, '#e6b93c') +
      box(560, 818, 36, 4, '#f6dc9a') +
      box(596, 810, 16, 24, '#4f9a5b'),
    css: `
.ballo{animation:ballo 40s linear infinite}
@keyframes ballo{0%{transform:translate(0px,260px)}100%{transform:translate(-90px,-110px)}}`,
    hat: hat(STRAW, { S: '#e2c27a', R: '#d9415f', D: '#b89a52' }),
  }
}

const WITCH = ['...PP...', '...PP...', '..PPPP..', '..PPPP..', '..OOOO..', 'PPPPPPPP']
const BAT = ['K.....K', 'KK.K.KK', '.KKKKK.', '..K.K..']

const halloween = (): Decor => {
  const pumpkin = (x: number, y: number, w: number, h: number) =>
    box(x + w / 2 - 4, y - 10, 8, 12, '#3d7a47') +
    box(x, y + 8, w, h - 16, '#e07a1c') +
    box(x + 8, y, w - 16, h, '#e07a1c') +
    box(x + 8, y + 4, 4, h - 8, '#f29a3c') +
    box(x + w - 12, y + 4, 4, h - 8, '#b5651f') +
    `<g class="glow">${box(x + w / 4 - 4, y + h / 4, 8, 8, '#ffd08a') + box(x + (3 * w) / 4 - 4, y + h / 4, 8, 8, '#ffd08a') + box(x + w / 4, y + h / 2 + 4, w / 2, 6, '#ffd08a')}</g>`

  return {
    ...NONE,
    wall:
      pennants(['#f08a3c', '#7a52b8', '#4f9a5b']) +
      // teia no canto
      `<path d="M0 0L170 170M0 0L60 210M0 0L210 60M20 76L70 70L76 20M36 132L122 122L132 36M52 186L172 172L186 52" fill="none" stroke="#cfd3e6" stroke-width="2" opacity="0.45"/>`,
    window: [0, 1].map(i => `<g class="bat" style="animation-delay:-${i * 9}s">${at(-40, 40 + i * 70, sprite(BAT, { K: '#14101f' }))}</g>`).join(''),
    floor: pumpkin(452, 778, 72, 56) + pumpkin(536, 798, 44, 36),
    css: `
.bat{animation:bat 18s linear infinite}
@keyframes bat{0%{transform:translate(0px,0px)}25%{transform:translate(90px,-24px)}50%{transform:translate(180px,10px)}75%{transform:translate(270px,-20px)}100%{transform:translate(360px,0px)}}`,
    hat: hat(WITCH, { P: '#5b3a8c', O: '#f08a3c' }),
  }
}

const SANTA = ['.....WW.', '....RRW.', '...RRR..', '..RRRRR.', '.RRRRRR.', 'WWWWWWWW', 'WWWWWWWW']

const christmas = (): Decor => {
  const bulbs = ['#d9415f', '#e6b93c', '#5aa8d9', '#f3ecdc']
  const tiers = [140, 116, 92, 68, 44]
  const tree =
    box(492, 790, 16, 22, '#5e3d29') +
    box(476, 810, 48, 24, '#7d2f42') +
    box(476, 810, 48, 4, '#b5485d') +
    tiers.map((w, i) => box(500 - w / 2, 750 - i * 44, w, 44, '#2f6b45') + box(500 - w / 2, 786 - i * 44, w, 8, '#1f4a30') + box(500 - w / 2 + 8, 754 - i * 44, 12, 4, '#4f9a5b')).join('') +
    box(492, 556, 16, 20, '#f6dc9a') +
    box(486, 562, 28, 8, '#f6dc9a') +
    box(496, 560, 4, 4, '#ffffff') +
    [
      [450, 770],
      [500, 762],
      [540, 772],
      [468, 724],
      [522, 720],
      [482, 680],
      [514, 676],
      [496, 634],
      [488, 596],
      [508, 640],
    ]
      .map(([x, y], i) => box(x ?? 0, y ?? 0, 8, 8, pick(bulbs, i), ` class="glow" style="animation-delay:-${(i * 1.3).toFixed(1)}s"`))
      .join('')
  const gift = (x: number, y: number, w: number, h: number, paper: string, ribbon: string) => box(x, y, w, h, paper) + box(x + w / 2 - 3, y, 6, h, ribbon) + box(x, y + h / 2 - 3, w, 6, ribbon)

  return {
    ...NONE,
    // o cordão de luzes
    wall: garland((x, y, i) => box(x - 4, y, 8, 4, '#2f5d4a') + box(x - 6, y + 4, 12, 12, pick(bulbs, i), ` class="glow" style="animation-delay:-${((i * 1.7) % 7).toFixed(1)}s"`), '#2f5d4a'),
    // a guirlanda na porta
    door: box(676, 448, 48, 56, '#2f6b45') + box(672, 452, 56, 48, '#2f6b45') + box(688, 464, 24, 24, '#6a4330') + box(680, 456, 8, 4, '#4f9a5b') + box(692, 492, 16, 10, '#d9415f') + box(696, 500, 8, 10, '#b5485d') + box(676, 472, 4, 4, '#d9415f') + box(720, 468, 4, 4, '#d9415f'),
    floor: tree + gift(548, 806, 32, 28, '#b5485d', '#f6dc9a') + gift(584, 812, 28, 22, '#3a5f8a', '#dfe6ff'),
    hat: hat(SANTA, { R: '#d9415f', W: '#f3ecdc' }),
  }
}

const DECOR: Record<Feast, () => Decor> = {
  none: () => NONE,
  newyear: newYear,
  carnival,
  valentine,
  easter: easterDecor,
  junina,
  halloween,
  christmas,
}

/** O enfeite da festa, desenhado para o desenho em curso (os sprites entram no defs dele). */
export const decor = (feast: Feast): Decor => DECOR[feast]()
