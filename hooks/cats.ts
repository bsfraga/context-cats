// Gatos: um cômodo em pixel art de 16 bits, com céu e luz pela hora e pelo clima.
// A escala é uma só: um metro vale uns 213 unidades, o que dá um gato sentado
// de 96, uma porta de 436 e uma janela com o peitoril na altura do lambri.
// Os quadros de animação trocam por opacidade em degraus; o primeiro quadro é o
// de repouso, para quem pediu movimento reduzido.

import type { Colony, Phase, Sky, Weather } from '../types'
import { decor } from './festas.js'
import { at, box, H, isFine, LEFT, P, resetSprites, setBits, sprite, spriteCss, spriteDefs, WIDE } from './pixels.js'
import type { Bits, Palette } from './pixels.js'

// Contorno, corpo, sombra, brilho, claro, sombra do claro, listra e íris.
const coat = (O: string, B: string, D: string, H: string, L: string, M: string, T: string, E: string): Palette => ({
  O,
  B,
  D,
  H,
  L,
  M,
  T,
  E,
  K: '#14131a',
  W: '#ffffff',
  N: '#e88a9a',
  P: '#e88a9a',
})

const ORANGE = coat('#3a1d10', '#e08a3c', '#b5651f', '#f2a85c', '#f8ead2', '#e2cfae', '#a8561a', '#6fbf5a')
const BLACK = coat('#0e0d13', '#3b3948', '#2a2834', '#55536a', '#4a4860', '#3b3948', '#2a2834', '#f2cc0c')
const GRAY = coat('#2b2d38', '#9aa0ad', '#737987', '#b9bec9', '#eceef4', '#cdd0da', '#6a7080', '#5aa8d9')
const CREAM = coat('#4a3c2a', '#efe6d2', '#cdbd9c', '#fbf6ea', '#ffffff', '#e6dcc6', '#dccfb2', '#5aa8d9')
const CALICO = coat('#3a2a1c', '#f3ecdc', '#cdbd9c', '#ffffff', '#ffffff', '#e6dcc6', '#e08a3c', '#6fbf5a')
const SIAMESE = coat('#2a1c14', '#d9c7a8', '#b29c7a', '#efe2c8', '#f3ead8', '#d9cdb4', '#5a4030', '#5aa8d9')
const TUXEDO = coat('#0e0d13', '#34323f', '#22212b', '#4c4a5c', '#f4f4f4', '#d6d6de', '#22212b', '#f2cc0c')

const SIT = [
  '...OO......OO.......',
  '..OBBO....OBBO......',
  '..OBPBO..OBPBO......',
  '.OBBPBBOOBBPBBO.....',
  '.OBHHBBBBBBBBBDO....',
  'OBHBBTBBBBTBBBDO....',
  'OBHBBTBBBBTBBBDO....',
  'OBBWKBBBBBWKBBDO....',
  'OBBEKBBBBBEKBBDO....',
  'OBBBBBLNNLBBBBDO....',
  '.OBBBLLLLLLBBBDO....',
  '..OBBBLLLLBBBDO.....',
  '...OOBBBBBBBOO......',
  '...OBBBBBBBBBDO.....',
  '..OBHBLLLLBBBBDO....',
  '..OBHLLLLLLBTBDO....',
  '..OBHLLLLLLBBBDO....',
  '..OBHLLLLLLBTBDO....',
  '..OBHLLMMLLBBBDO....',
  '..OBBLLMMLLBTBDO....',
  '..OBOBLMMLBOBBDO....',
  '..OBOBBMMBBOBBDO....',
  '..OLLOLLLLOLLBDO....',
  '...OOOOOOOOOOOO.....',
]
const SIT_H = SIT.length * P
const TAIL_UP = ['..OO.', '.OBBO', '.OBDO', '.OBDO', '.OBDO', '.OBDO', 'OBBDO', 'OBDO.', 'BBDO.', 'BDO..', 'OO...']
const TAIL_OUT = ['.....', '.....', '.....', '.....', '.....', '.....', '...OO', 'OOBBO', 'BBBDO', 'BDDO.', 'OOO..']
const BLINK = ['...BB.....BB', '...DD.....DD']

// O chapéu da festa em curso, para os gatos sentados; vazio fora de festa.
let hatNow = ''

const sitting = (palette: Palette, swish = 2.6, delay = 0) =>
  sprite(SIT, palette) +
  at(15 * P, 12 * P, sprite(TAIL_UP, palette), ` class="fa" style="animation-duration:${swish}s;animation-delay:-${delay}s"`) +
  at(15 * P, 12 * P, sprite(TAIL_OUT, palette), ` class="fb" opacity="0" style="animation-duration:${swish}s;animation-delay:-${delay}s"`) +
  at(0, 7 * P, sprite(BLINK, palette), ` class="blink" opacity="0" style="animation-delay:-${delay}s"`) +
  hatNow

const WALK = [
  '..................OO...OO.',
  '.OO...............OBO.OBO.',
  'OBBO.............OBPBOBPBO',
  'OBDO.............OBBBBBBBO',
  'OBDO............OBHBBBBBDO',
  'OBDO............OBBWKBBWKO',
  '.OBDO...........OBBEKBBEKO',
  '.OBDOOOOOOOOOOOOOBBBLNNLBO',
  '..OBBHHHHHHHHHHBBBBLLLLLO.',
  '..OBBBBTBBTBBTBBBBBBOOOOO.',
  '..OBBBBTBBTBBTBBBBBDO.....',
  '..OBBBBBBBBBBBBBBBBDO.....',
  '..ODBBLLLLLLLLLBBBDO......',
  '..OODDMMMMMMMMMDDDOO......',
]
const LEGS_A = ['..OBDO.OBDO....OBDO.OBDO..', '..OBDO.OBDO....OBDO.OBDO..', '..OBDO.OBDO....OBDO.OBDO..', '..OLLO.OLLO....OLLO.OLLO..']
const LEGS_B = ['...OBDOBDO......OBDOBDO...', '...OBDOBDO......OBDOBDO...', '...OBDOBDO......OBDOBDO...', '...OLLOLLO......OLLOLLO...']
const WALK_W = 26 * P
const WALK_H = (WALK.length + 4) * P

// A sombra no chão: uma elipse chapada em 16 bits, esfumada em 32.
const shadow = (cx: number, cy: number, rx: number) =>
  isFine()
    ? `<ellipse cx="${cx}" cy="${cy}" rx="${Math.round(rx * 1.15)}" ry="${Math.max(6, Math.round(rx / 5))}" fill="url(#soft)"/>`
    : `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${Math.max(3, Math.round(rx / 9))}" fill="#000000" opacity="0.3"/>`

const walking = (palette: Palette, step = 0.5) =>
  shadow(WALK_W / 2, WALK_H, 46) +
  sprite(WALK, palette) +
  at(0, WALK.length * P, sprite(LEGS_A, palette), ` class="fa" style="animation-duration:${step}s"`) +
  at(0, WALK.length * P, sprite(LEGS_B, palette), ` class="fb" opacity="0" style="animation-duration:${step}s"`)

const SLEEP = [
  '..OO....OO..............',
  '.OBPO..OPBO..OOOOOOO....',
  '.OBBBOOBBBOOOBBTBBTBOO..',
  'OBHBBBBBBBBBBBBTBBTBBBO.',
  'OBBDDBBBDDBBBBBBBBBBBBDO',
  'OBBBBLNNLBBBBBBBBBBBBBDO',
  '.OBBLLLLLBBBBBBBBOOOOOOO',
  '.OBBBLLLBBBBBOOOOBBBBBDO',
  '..OBBBBBBBBBOBBBBBBBDDO.',
  '..ODDDDDDDDDODDDDDDDOO..',
  '...OOOOOOOOOOOOOOOOO....',
]
const SLEEP_H = SLEEP.length * P

const SCRATCH = [
  '..OO...OO...',
  '.OBPO.OPBO..',
  '.OBBBOBBBO..',
  '.OBHBBBBBDO.',
  '.OBBBBWKBDO.',
  '.OBBBBEKBLNO',
  '.OBBBBBBLLO.',
  '..OBBBBLLO..',
  '..OBHBBLO...',
  '..OBHBBLO...',
  '..OBHBLLO...',
  '..OBHBLLO...',
  '..OBHBLLO...',
  '..OBHBLLO...',
  '..OBBBLLO...',
  '.OBBTBLLO...',
  '.OBBBBLLO...',
  '.OBBTBBLO...',
  'OOBBBBBBO...',
  'OBOBBBBDO...',
  'OBOBBDBDO...',
  'OBOBDOBDO...',
  'ODOBDOBDO...',
  '.OOLLOLLO...',
  '...OOOOOO...',
]
const SCRATCH_H = SCRATCH.length * P
const PAWS = ['.......OOOO.', '.......BBLLO', '.......OOOO.']
const Z = ['ZZZ', '..Z', '.Z.', 'ZZZ']

const scratching = (palette: Palette) =>
  sprite(SCRATCH, palette) +
  at(0, 8 * P, sprite(PAWS, palette), ' class="fa" style="animation-duration:0.7s"') +
  at(0, 11 * P, sprite(PAWS, palette), ' class="fb" opacity="0" style="animation-duration:0.7s"')

const LEAP = [
  '......................O..O..',
  '.....................OBOOBO.',
  '..OOOO.....OOOOOOOOOOBBBBBBO',
  '.OBBBBOOOOOBBHHHHHHBBBWKBWKO',
  'OBDOOBBBBBBBBBTBBTBBBBEKBEKO',
  'OBO..OBBBBBBBBTBBTBBBBBLNNLO',
  '.O....OBBBBBBBBBBBBBBOLLLLO.',
  '......OBBLLLLLLLLBBBDOOOOO..',
  '.....OBBDOOOOOOOOOOBBDO.....',
  '....OBBDO...........OBBDO...',
  '...OLLO...............OLLO..',
]
const LEAP_W = 28 * P
const LEAP_H = LEAP.length * P

// O gato esticado no ar, virado para onde vai e inclinado.
const leaping = (palette: Palette, dir: 1 | -1, tilt: number) =>
  `<g transform="rotate(${tilt} ${LEAP_W / 2} ${LEAP_H / 2})">${
    dir === 1 ? sprite(LEAP, palette) : `<g transform="translate(${LEAP_W} 0) scale(-1 1)">${sprite(LEAP, palette)}</g>`
  }</g>`

const MOUSE = ['TT..OOOO...', '..TOGGGGOO.', '..OGGGGGKGO', '...OOOOOOO.']
const MOUSE_COAT: Palette = { O: '#2b2d38', G: '#b9bec9', K: '#14131a', T: '#e88a9a' }

export const MAX_CATS = 12

/** Quantos gatos cabem em `percent` do contexto usado: 1 no começo, 12 no fim. */
export const catsFor = (percent: number): number => Math.max(1, Math.min(MAX_CATS, 1 + Math.floor(percent / 9)))


/** O clima de um código de condição do serviço (os códigos WWO que o wttr.in devolve). */
export const weatherOf = (code: number): Weather => {
  if ([200, 386, 389, 392, 395].includes(code)) {
    return 'storm'
  }
  if ([179, 182, 185, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(code)) {
    return 'snow'
  }
  if ([176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359].includes(code)) {
    return 'rain'
  }
  if ([143, 248, 260].includes(code)) {
    return 'fog'
  }

  return code === 113 ? 'clear' : code === 116 ? 'partly' : 'cloudy'
}

/** A fase do dia de um minuto local, com o nascer e o pôr do sol em minutos. */
export const phaseOf = (minute: number, sunrise: number, sunset: number): Phase =>
  Math.abs(minute - sunrise) <= 40 ? 'dawn' : Math.abs(minute - sunset) <= 40 ? 'dusk' : minute > sunrise && minute < sunset ? 'day' : 'night'

const SKY_CLEAR: Record<Phase, [string, string, string]> = {
  night: ['#070b1f', '#17214f', '#31407f'],
  dawn: ['#2a2f6b', '#c9688a', '#f5b06a'],
  day: ['#3f8fd9', '#7fb8ea', '#cfe6f7'],
  dusk: ['#2b2a66', '#b0527a', '#f08a4a'],
}
const SKY_GRAY: Record<Phase, [string, string, string]> = {
  night: ['#0c0e16', '#1a1e2c', '#2a3040'],
  dawn: ['#4a4a5c', '#6e6672', '#8f8280'],
  day: ['#6f7a8a', '#8d98a8', '#aab3c0'],
  dusk: ['#3f3f52', '#5e5866', '#7c7074'],
}

// O que se vê pela janela, em coordenadas da própria janela.
const WIN_W = 280
const WIN_H = 240

const outside = (sky: Sky, extra: string): string => {
  const isOpen = sky.weather === 'clear' || sky.weather === 'partly'
  const isNight = sky.phase === 'night'
  const out: string[] = []

  if (isOpen && isNight) {
    out.push(
      [
        [34, 40],
        [98, 122],
        [150, 44],
        [236, 164],
        [62, 188],
        [252, 96],
        [22, 136],
      ]
        .map(([x, y], i) => box(x ?? 0, y ?? 0, 4, 4, '#dfe6ff', ` class="star" opacity="0.7" style="animation-delay:-${i * 1.3}s"`))
        .join(''),
      box(196, 28, 36, 52, '#f3e9c0') + box(188, 36, 52, 36, '#f3e9c0') + box(192, 32, 44, 44, '#f3e9c0') + box(208, 44, 12, 12, '#d9cf9f') + box(220, 60, 8, 8, '#d9cf9f') + box(200, 36, 8, 4, '#ffffff'),
    )
  }
  if (isOpen && !isNight) {
    const low = sky.phase === 'day' ? 0 : 150
    const color = sky.phase === 'day' ? '#ffe27a' : '#ffb04a'
    out.push(
      `<g class="glow">${
        box(186, 22 + low, 56, 56, color, ' opacity="0.25"') + box(196, 28 + low, 36, 52, color) + box(188, 36 + low, 52, 36, color) + box(192, 32 + low, 44, 44, color) + box(200, 36 + low, 12, 8, '#fff6cf')
      }</g>`,
    )
  }
  out.push(extra)
  if (sky.weather !== 'clear') {
    const many = sky.weather === 'partly' ? 2 : 6
    const [light, dark] = isNight ? ['#5a6288', '#3f4666'] : sky.weather === 'partly' ? ['#ffffff', '#d5deea'] : ['#c2c8d2', '#9aa2b0']
    const puffs: string[] = []

    for (let i = 0; i < many; i++) {
      const x = (i * 97) % 250
      const y = 30 + ((i * 61) % 130)
      puffs.push(box(x, y + 8, 96, 16, light) + box(x + 16, y, 56, 12, light) + box(x + 8, y + 24, 88, 8, dark))
    }
    out.push(`<g class="cloud" opacity="${sky.weather === 'partly' ? 0.75 : 0.95}">${puffs.join('')}</g><g class="cloud" opacity="0.8" style="animation-delay:-70s">${puffs.slice(0, Math.ceil(many / 2)).join('')}</g>`)
  }
  if (sky.weather === 'fog') {
    out.push(box(0, 0, WIN_W, WIN_H, '#c9ced6', ' opacity="0.45"'))
  }
  if (sky.weather === 'rain' || sky.weather === 'storm') {
    const drops = sky.weather === 'storm' ? 28 : 18

    for (let i = 0; i < drops; i++) {
      out.push(box((i * 53) % 300, -24, 2, 16, '#b9d0ee', ` class="rain" opacity="0.75" style="animation-delay:-${((i * 0.37) % 1).toFixed(2)}s"`))
    }
  }
  if (sky.weather === 'storm') {
    out.push(box(0, 0, WIN_W, WIN_H, '#e8eeff', ' class="bolt" opacity="0"'))
  }
  if (sky.weather === 'snow') {
    for (let i = 0; i < 18; i++) {
      out.push(box((i * 47) % 274, -8, 4, 4, '#ffffff', ` class="snow" opacity="0.9" style="animation-delay:-${((i * 0.9) % 7).toFixed(1)}s"`))
    }
  }

  return out.join('')
}

// As medidas do cômodo. A janela e a porta terminam na mesma altura, e o
// peitoril fica na linha do lambri; a maçaneta está a um metro do chão.
const WALL_END = 810
const FLOOR = 830
const WIN_X = 120
const WIN_Y = 378
const DOOR_L = 612
const DOOR_T = 374
const DOOR_W = 176
const DOOR_H = WALL_END - DOOR_T
const DOOR_TOP = DOOR_T - 16
const HANDLE_X = DOOR_L + DOOR_W - 24
const HANDLE_Y = 600
const LAMP_X = 860
const BED_A = 70
const BED_B = 960
const BOX_X = 1476

// Onde cada gato mora, na ordem em que eles chegam.
type Slot = { kind: 'sit' | 'sleep' | 'walk' | 'scratch' | 'play' | 'box' | 'run'; x: number; y: number; coat: Palette; seconds: number; delay: number }

const RUN_Y = 836 - WALK_H
const SLOTS: Slot[] = [
  { kind: 'sleep', x: BED_A + 20, y: 810 - SLEEP_H, coat: GRAY, seconds: 4.5, delay: 0 },
  { kind: 'sit', x: 1326, y: 588 - SIT_H, coat: BLACK, seconds: 2.4, delay: 0.5 },
  { kind: 'walk', x: 0, y: 862 - WALK_H, coat: CALICO, seconds: 70, delay: 0 },
  { kind: 'scratch', x: 1310, y: 818 - SCRATCH_H, coat: ORANGE, seconds: 0.7, delay: 0 },
  { kind: 'run', x: 912, y: RUN_Y, coat: CREAM, seconds: 0, delay: 0 },
  { kind: 'run', x: 808, y: RUN_Y, coat: SIAMESE, seconds: 0, delay: 1.1 },
  { kind: 'sit', x: 220, y: WIN_Y + WIN_H - SIT_H, coat: ORANGE, seconds: 3.4, delay: 2 },
  { kind: 'play', x: 220, y: FLOOR - SIT_H, coat: TUXEDO, seconds: 2.9, delay: 1.1 },
  { kind: 'walk', x: 0, y: 896 - WALK_H, coat: BLACK, seconds: 44, delay: 20 },
  { kind: 'box', x: BOX_X + 16, y: FLOOR - SIT_H, coat: GRAY, seconds: 3.7, delay: 2.4 },
  { kind: 'sleep', x: BED_B + 20, y: 810 - SLEEP_H, coat: ORANGE, seconds: 4.5, delay: 2.2 },
  { kind: 'sit', x: 1200, y: 314 - SIT_H, coat: CALICO, seconds: 3.3, delay: 0.8 },
]
const YARN_CAT = 7
const CHASER = 8
const isMover = (slot: Slot) => slot.kind === 'walk' || slot.kind === 'run'

// Um ponto de um percurso: quando, onde e com que opacidade; `r` gira, `sx` e
// `sy` esticam, e `e` é a curva de tempo do trecho que começa ali.
type Key = { t: number; x: number; y: number; o: number; r?: number; sx?: number; sy?: number; e?: string }

const frames = (name: string, keys: Key[], total: number): string =>
  `@keyframes ${name}{${keys
    .map(
      k =>
        `${((100 * Math.min(k.t, total)) / total).toFixed(2)}%{transform:translate(${Math.round(k.x)}px,${Math.round(k.y)}px)${k.r === undefined ? '' : ` rotate(${k.r}deg)`}${
          k.sx === undefined ? '' : ` scale(${k.sx},${k.sy ?? 1})`
        };opacity:${k.o}${k.e === undefined ? '' : `;animation-timing-function:${k.e}`}}`,
    )
    .join('')}}`

// Um salto em parábola, em seis pontos.
const arc = (t0: number, d: number, x0: number, y0: number, x1: number, y1: number, lift: number): Key[] =>
  [0, 0.2, 0.4, 0.6, 0.8, 1].map(u => ({ t: t0 + d * u, x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u - 4 * lift * u * (1 - u), o: 1 }))

// O pega-pega: dois gatos correm o mesmo percurso, um logo atrás do outro,
// pelo chão, pelas prateleiras, pelo teto do nicho e por cima da porta.
type Leg = { to: [number, number]; lift?: number; d?: number; wait?: number }

const ROUTE_START: [number, number] = [860, 836]
const ROUTE: Leg[] = [
  { to: [940, 836] },
  { to: [1010, 650], lift: 70 },
  { to: [1170, 500], lift: 60, wait: 0.2 },
  { to: [1450, 380], lift: 70, d: 0.7 },
  { to: [1290, 190], lift: 60, d: 0.6 },
  { to: [1200, 190] },
  { to: [1040, 250], lift: 46, wait: 0.2 },
  { to: [760, DOOR_TOP], lift: 50, d: 0.65 },
  { to: [650, DOOR_TOP] },
  { to: [516, 500], lift: 40, wait: 0.2 },
  { to: [640, 836], lift: 24, d: 0.8 },
  { to: [860, 836] },
]
const RUN_SPEED = 300
const ROUTE_PARTS = ['wr', 'wl', 'lr', 'll'] as const
const route = (() => {
  const move: Key[] = []
  const show: Record<(typeof ROUTE_PARTS)[number], Key[]> = { wr: [], wl: [], lr: [], ll: [] }
  let [x, y] = ROUTE_START
  let t = 0
  let dir: 1 | -1 = 1
  let on: (typeof ROUTE_PARTS)[number] = 'wr'
  const turn = (next: (typeof ROUTE_PARTS)[number]) => {
    for (const part of ROUTE_PARTS) {
      const was = part === on ? 1 : 0
      const now = part === next ? 1 : 0

      if (t === 0) {
        show[part].push({ t: 0, x: 0, y: 0, o: now })
      } else if (was !== now) {
        show[part].push({ t: t - 0.004, x: 0, y: 0, o: was }, { t, x: 0, y: 0, o: now })
      }
    }
    on = next
  }

  for (const leg of ROUTE) {
    const [x1, y1] = leg.to
    dir = x1 > x ? 1 : x1 < x ? -1 : dir

    if (leg.lift === undefined) {
      turn(dir === 1 ? 'wr' : 'wl')
      move.push({ t, x: x - ROUTE_START[0], y: y - ROUTE_START[1], o: 1 })
      t += Math.abs(x1 - x) / RUN_SPEED
    } else {
      const d = leg.d ?? 0.55
      turn(dir === 1 ? 'lr' : 'll')
      move.push(...arc(t, d, x - ROUTE_START[0], y - ROUTE_START[1], x1 - ROUTE_START[0], y1 - ROUTE_START[1], leg.lift).slice(0, 5))
      t += d
    }
    x = x1
    y = y1

    if (leg.wait !== undefined) {
      turn(dir === 1 ? 'wr' : 'wl')
      move.push({ t, x: x - ROUTE_START[0], y: y - ROUTE_START[1], o: 1 })
      t += leg.wait
    }
  }
  turn('wr')
  move.push({ t, x: 0, y: 0, o: 1 })
  const run = `${t.toFixed(2)}s linear infinite`
  const css = `\n.rt{animation:rt ${run}}\n${frames('rt', move, t)}${ROUTE_PARTS.map(part => {
    show[part].push({ t, x: 0, y: 0, o: part === 'wr' ? 1 : 0 })

    return `\n.r${part}{animation:r${part} ${run}}\n${frames(`r${part}`, show[part], t)}`
  }).join('')}`

  return { css, seconds: t }
})()

const runner = (slot: Slot): string => {
  const lag = slot.delay === 0 ? '' : ` style="animation-delay:-${(route.seconds - slot.delay).toFixed(2)}s"`
  const part = (name: string, inner: string, isFirst: boolean) => `<g class="r${name}"${isFirst ? '' : ' opacity="0"'}${lag}>${inner}</g>`
  const flip = (inner: string, w: number) => `<g transform="translate(${w} 0) scale(-1 1)">${inner}</g>`

  return at(
    ROUTE_START[0] - WALK_W / 2,
    ROUTE_START[1] - WALK_H,
    `<g class="rt"${lag}>${
      part('wr', walking(slot.coat, 0.22), true) +
      part('wl', flip(walking(slot.coat, 0.22), WALK_W), false) +
      part('lr', at(-4, 18, leaping(slot.coat, 1, -8)), false) +
      part('ll', at(-4, 18, leaping(slot.coat, -1, 8)), false)
    }</g>`,
  )
}

// A caixa de papelão: o fundo fica atrás do gato, a frente na frente.
const boxBack =
  box(BOX_X, 760, 112, 74, '#6b4a2a') + box(BOX_X + 6, 764, 100, 20, '#2a1d19') + box(BOX_X - 12, 754, 16, 8, '#c79a5e') + box(BOX_X + 108, 754, 16, 8, '#c79a5e')
const boxFront =
  box(BOX_X, 782, 112, 52, '#b98a52') + box(BOX_X, 782, 112, 4, '#d8ad72') + box(BOX_X, 826, 112, 8, '#96693a') + box(BOX_X + 50, 782, 12, 52, '#d9c39a') + box(BOX_X + 50, 782, 12, 4, '#efe0c0')
const WALK_FROM = 430
const WALK_TO = 1150

// Onde um gato que anda está quando a cena é desenhada, pela fase do seu ciclo.
const walkStart = (slot: Slot): number => {
  const phase = (slot.delay / slot.seconds) % 1
  const span = WALK_TO - WALK_FROM

  if (phase < 0.06) {
    return WALK_FROM
  }
  if (phase < 0.46) {
    return WALK_FROM + (span * (phase - 0.06)) / 0.4
  }
  if (phase < 0.54) {
    return WALK_TO
  }
  if (phase < 0.94) {
    return WALK_TO - (span * (phase - 0.54)) / 0.4
  }

  return WALK_FROM
}

const resident = (slot: Slot, index: number): string => {
  if (slot.kind === 'sleep') {
    return (
      at(slot.x, slot.y, `<g class="breath" style="animation-delay:-${slot.delay}s">${sprite(SLEEP, slot.coat)}</g>`) +
      [0, 1, 2]
        .map(i =>
          at(
            slot.x + 104 + i * 26,
            slot.y - 36 - i * 30,
            `<g class="zzz" opacity="0.5" style="animation-delay:-${i * 2 + slot.delay}s">${sprite(Z, { Z: '#dfe6ff' })}</g>`,
          ),
        )
        .join('')
    )
  }
  if (slot.kind === 'walk') {
    const timing = ` style="animation-duration:${slot.seconds}s;animation-delay:-${slot.delay}s"`

    const toy = index === CHASER ? at(WALK_W + 32, WALK_H - 16, sprite(MOUSE, MOUSE_COAT)) : ''

    return `<g class="walk"${timing}>${at(0, slot.y, `<g class="turn"${timing}>${walking(slot.coat, index === CHASER ? 0.3 : 0.5)}${toy}</g>`)}</g>`
  }
  if (slot.kind === 'run') {
    return runner(slot)
  }
  if (slot.kind === 'play') {
    return shadow(slot.x + 52, FLOOR + 2, 46) + `<g class="pounce">${at(slot.x, FLOOR - WALK_H, walking(slot.coat, 0.4).replace(/<ellipse[^>]*>/, ''))}</g>`
  }
  if (slot.kind === 'box') {
    return `<g class="peek">${at(slot.x, 740, sprite(SIT.slice(0, 12), slot.coat) + hatNow)}</g>${boxFront}`
  }
  if (slot.kind === 'scratch') {
    return at(slot.x, slot.y, scratching(slot.coat))
  }

  return (slot.y + SIT_H === FLOOR ? shadow(slot.x + 36, FLOOR + 2, 40) : '') + at(slot.x, slot.y, sitting(slot.coat, slot.seconds, slot.delay))
}

// A saída: cada gato que vai embora parte de onde mora, desce se estiver no
// alto, anda até a porta e entra. O que chega primeiro abre a porta: agacha,
// salta, pendura-se na maçaneta, balança até o trinco ceder e cai de pé.
const DOOR_X = 716
const DOOR_Y = 818 - WALK_H
const SPEED = 190
// O ponto da alavanca onde as patas agarram, e o mesmo ponto no desenho do gato em pé.
const GRIP_X = HANDLE_X - 30
const GRIP_IN_X = 10 * P
const GRIP_IN_Y = 9.5 * P
const GRIP_TO_FEET = SCRATCH_H - GRIP_IN_Y
const OPENER_X = GRIP_X - GRIP_IN_X - 28
const HANG_SECONDS = 2.9

type Leaver = { slot: Slot; dir: 1 | -1; isHigh: boolean; fall: number; x0: number; y0: number; xs: number; ys: number; xt: number; travel: number; arrive: number }

const plan = (colony: Colony) => {
  const leavers: Leaver[] = SLOTS.slice(colony.count, colony.count + colony.leaving).map(slot => {
    const height = slot.kind === 'sit' ? SIT_H : slot.kind === 'sleep' ? SLEEP_H : slot.kind === 'scratch' ? SCRATCH_H : WALK_H
    const x0 = slot.kind === 'walk' ? walkStart(slot) : slot.x
    const dir: 1 | -1 = x0 > DOOR_X ? -1 : 1
    const isHigh = !isMover(slot) && slot.y + height < 790
    // quanto mais alto, mais tempo no ar
    const fall = isHigh ? 0.45 + (FLOOR - slot.y - height) / 1400 : 0
    const xs = isHigh ? x0 + dir * 100 : x0
    const ys = isMover(slot) ? slot.y : FLOOR - WALK_H
    const xt = dir === 1 ? DOOR_X - WALK_W : DOOR_X
    const travel = (isHigh ? fall + 0.15 : 0.05) + Math.abs(xt - xs) / SPEED

    return { slot, dir, isHigh, fall, x0, y0: slot.y, xs, ys, xt, travel, arrive: 0 }
  })
  leavers.sort((a, b) => a.travel - b.travel)
  const opener = leavers[0]

  if (opener !== undefined) {
    // quem abre a porta para embaixo da maçaneta, não no meio do vão
    opener.travel += (Math.abs(OPENER_X - opener.xs) - Math.abs(opener.xt - opener.xs)) / SPEED
    opener.xt = OPENER_X
  }
  let last = 0

  leavers.forEach((cat, i) => {
    cat.arrive = i === 0 ? 0.3 + cat.travel : Math.max(last + 0.45, 0.3 + cat.travel, (opener?.arrive ?? 0) + HANG_SECONDS)
    last = cat.arrive
  })
  const opened = (opener?.arrive ?? 0) + 1.96
  const done = Math.max((opener?.arrive ?? 0) + HANG_SECONDS + 0.1, last + 0.45)

  return { leavers, opened, done, total: done + 1.1 }
}

/** Quanto dura a saída pela porta, em segundos. */
export const exitSeconds = (colony: Colony): number => plan(colony).total

const pose = (slot: Slot): string =>
  slot.kind === 'sleep' ? sprite(SLEEP, slot.coat) : slot.kind === 'scratch' ? sprite(SCRATCH, slot.coat) : sitting(slot.coat, slot.seconds, slot.delay)

const EASE_OUT = 'cubic-bezier(0.2,0.7,0.3,1)'
const EASE_IN = 'cubic-bezier(0.6,0,0.9,0.5)'
const EASE_BOTH = 'ease-in-out'

const exitScene = (colony: Colony): { markup: string; css: string; doorCss: string } => {
  const { leavers, opened, done, total } = plan(colony)
  const run = `${total.toFixed(2)}s linear 1 both`
  let markup = ''
  let css = ''
  let a = 0

  leavers.forEach((cat, i) => {
    const go = cat.arrive - cat.travel
    const swap = go + (cat.isHigh ? cat.fall + 0.15 : 0.05)
    const face = cat.dir === 1 ? walking(cat.slot.coat, 0.36) : `<g transform="translate(${WALK_W} 0) scale(-1 1)">${walking(cat.slot.coat, 0.36)}</g>`
    const isOpener = i === 0

    if (!isMover(cat.slot)) {
      const keys: Key[] = [
        { t: 0, x: cat.x0, y: cat.y0, o: 1 },
        { t: go, x: cat.x0, y: cat.y0, o: 1 },
      ]

      if (cat.isHigh) {
        // agacha, e o salto esticado toma o lugar da pose até o chão
        const air: Key[] = [
          { t: 0, x: cat.x0 - 16, y: cat.y0 + 32, o: 0 },
          { t: go + 0.14, x: cat.x0 - 16, y: cat.y0 + 32, o: 0 },
          ...arc(go + 0.15, cat.fall, cat.x0 - 16, cat.y0 + 32, cat.xs - 4, FLOOR - LEAP_H - 4, 40),
          { t: swap + 0.01, x: cat.xs - 4, y: FLOOR - LEAP_H - 4, o: 0 },
          { t: total, x: cat.xs - 4, y: FLOOR - LEAP_H - 4, o: 0 },
        ]
        keys.push({ t: go + 0.1, x: cat.x0, y: cat.y0 + 8, o: 1 }, { t: go + 0.14, x: cat.x0, y: cat.y0 + 8, o: 1 }, { t: go + 0.15, x: cat.x0, y: cat.y0, o: 0 })
        markup += `<g class="l${i}" opacity="0">${leaping(cat.slot.coat, cat.dir, cat.dir * 16)}</g>`
        css += `\n.l${i}{animation:l${i} ${run}}\n${frames(`l${i}`, air, total)}`
      } else {
        keys.push({ t: swap - 0.01, x: cat.x0, y: cat.y0, o: 1 }, { t: swap, x: cat.x0, y: cat.y0, o: 0 })
      }
      keys.push({ t: total, x: cat.x0, y: cat.y0, o: 0 })
      markup += `<g class="p${i}" opacity="0">${pose(cat.slot)}</g>`
      css += `\n.p${i}{animation:p${i} ${run}}\n${frames(`p${i}`, keys, total)}`
    }
    const walk: Key[] =
      isMover(cat.slot)
        ? [
            { t: 0, x: cat.xs, y: cat.ys, o: 1 },
            { t: go, x: cat.xs, y: cat.ys, o: 1 },
          ]
        : [
            { t: 0, x: cat.xs, y: cat.ys, o: 0 },
            { t: swap - 0.01, x: cat.xs, y: cat.ys, o: 0 },
            { t: swap, x: cat.xs, y: cat.ys, o: 1 },
          ]
    walk.push({ t: cat.arrive, x: cat.xt, y: DOOR_Y, o: 1 })
    walk.push(
      isOpener ? { t: cat.arrive + 0.02, x: cat.xt, y: DOOR_Y, o: 0 } : { t: cat.arrive + 0.4, x: cat.xt + cat.dir * 44, y: DOOR_Y, o: 0 },
      { t: total, x: cat.xt, y: DOOR_Y, o: 0 },
    )
    markup += `<g class="w${i}" opacity="0">${face}</g>`
    css += `\n.w${i}{animation:w${i} ${run}}\n${frames(`w${i}`, walk, total)}`

    if (isOpener) {
      a = cat.arrive
      // O gato em pé gira e estica em torno das patas; `feet` devolve a altura
      // das patas que deixa os pés no chão com o corpo esticado em `sy`.
      const feet = (sy: number) => 818 - GRIP_TO_FEET * sy
      const held = HANDLE_Y + 14
      const hang: Key[] = [
        { t: 0, x: GRIP_X, y: feet(1), o: 0, r: 0, sx: 1, sy: 1 },
        { t: a, x: GRIP_X, y: feet(1), o: 0, r: 0, sx: 1, sy: 1 },
        { t: a + 0.02, x: GRIP_X, y: feet(1), o: 1, r: 0, sx: 1, sy: 1, e: EASE_BOTH },
        // agacha e balança o traseiro antes de saltar
        { t: a + 0.22, x: GRIP_X, y: feet(0.78), o: 1, r: 0, sx: 1.1, sy: 0.78 },
        { t: a + 0.3, x: GRIP_X - 4, y: feet(0.78), o: 1, r: 0, sx: 1.1, sy: 0.78 },
        { t: a + 0.38, x: GRIP_X + 4, y: feet(0.78), o: 1, r: 0, sx: 1.1, sy: 0.78 },
        { t: a + 0.46, x: GRIP_X - 4, y: feet(0.78), o: 1, r: 0, sx: 1.1, sy: 0.78 },
        { t: a + 0.54, x: GRIP_X, y: feet(0.74), o: 1, r: 0, sx: 1.12, sy: 0.74 },
        // estica e sobe, desacelerando até passar um pouco da maçaneta
        { t: a + 0.6, x: GRIP_X, y: feet(1.2), o: 1, r: 0, sx: 0.9, sy: 1.2, e: EASE_OUT },
        { t: a + 0.88, x: GRIP_X + 2, y: HANDLE_Y - 14, o: 1, r: -3, sx: 0.94, sy: 1.12, e: EASE_BOTH },
        // agarra: a alavanca desce com o peso e o corpo balança
        { t: a + 0.98, x: GRIP_X + 3, y: held, o: 1, r: 0, sx: 1, sy: 1.04, e: EASE_BOTH },
        { t: a + 1.22, x: GRIP_X + 3, y: held, o: 1, r: 11, sx: 1, sy: 1, e: EASE_BOTH },
        { t: a + 1.5, x: GRIP_X + 3, y: held, o: 1, r: -8, sx: 1, sy: 1, e: EASE_BOTH },
        { t: a + 1.76, x: GRIP_X + 3, y: held, o: 1, r: 5, sx: 1, sy: 1, e: EASE_BOTH },
        // solta e cai, acelerando; amortece no chão e se endireita
        { t: a + 1.96, x: GRIP_X + 3, y: held, o: 1, r: 0, sx: 1, sy: 1, e: EASE_IN },
        { t: a + 2.16, x: GRIP_X - 8, y: feet(0.76), o: 1, r: 0, sx: 1.12, sy: 0.76, e: EASE_OUT },
        { t: a + 2.34, x: GRIP_X - 8, y: feet(1), o: 1, r: 0, sx: 1, sy: 1 },
        { t: a + 2.4, x: GRIP_X - 8, y: feet(1), o: 1, r: 0, sx: 1, sy: 1 },
        { t: a + 2.42, x: GRIP_X - 8, y: feet(1), o: 0, r: 0, sx: 1, sy: 1 },
        { t: total, x: GRIP_X - 8, y: feet(1), o: 0, r: 0, sx: 1, sy: 1 },
      ]
      // depois, de quatro outra vez, entra pela porta aberta
      const inX = OPENER_X - 8
      const enter: Key[] = [
        { t: 0, x: inX, y: DOOR_Y, o: 0 },
        { t: a + 2.4, x: inX, y: DOOR_Y, o: 0 },
        { t: a + 2.42, x: inX, y: DOOR_Y, o: 1 },
        { t: a + 2.62, x: inX + 20, y: DOOR_Y, o: 1 },
        { t: a + 2.9, x: inX + 48, y: DOOR_Y, o: 0 },
        { t: total, x: inX + 48, y: DOOR_Y, o: 0 },
      ]
      markup +=
        `<g class="hang" opacity="0"><g transform="translate(${-GRIP_IN_X} ${-GRIP_IN_Y})">${sprite(SCRATCH, cat.slot.coat) + at(0, 8 * P, sprite(PAWS, cat.slot.coat))}</g></g>` +
        `<g class="enter" opacity="0">${walking(cat.slot.coat, 0.3)}</g>`
      css += `\n.hang{animation:hang ${run}}\n${frames('hang', hang, total)}\n.enter{animation:enter ${run}}\n${frames('enter', enter, total)}`
    }
  })
  const pc = (seconds: number) => `${((100 * seconds) / total).toFixed(3)}%`
  // A alavanca cede quando o gato agarra e volta com um repique quando ele solta;
  // a porta abre nessa hora, passa um pouco do ponto e assenta.
  const doorCss = `
.door{transform-origin:${DOOR_L}px ${HANDLE_Y}px;animation:door ${run}}
@keyframes door{0%,${pc(opened)}{transform:scaleX(1);animation-timing-function:${EASE_OUT}}${pc(opened + 0.5)}{transform:scaleX(0.13)}${pc(opened + 0.68)},${pc(done + 0.3)}{transform:scaleX(0.16);animation-timing-function:${EASE_BOTH}}${pc(done + 0.8)},100%{transform:scaleX(1)}}
.lever{transform-origin:${HANDLE_X}px ${HANDLE_Y}px;animation:lever ${run}}
@keyframes lever{0%,${pc(a + 0.9)}{transform:rotate(0deg)}${pc(a + 0.98)},${pc(a + 1.96)}{transform:rotate(-28deg)}${pc(a + 2.04)}{transform:rotate(7deg)}${pc(a + 2.14)},100%{transform:rotate(0deg)}}`

  return { markup, css, doorCss }
}

// Em 32 bits tudo que está na parede projeta uma sombra esfumada para baixo.
const drop = (x: number, y: number, w: number, h = 36) => (isFine() ? box(x, y, w, h, 'url(#drop)') : '')

const shelf = (x: number, y: number, w: number) =>
  drop(x + 6, y + 14, w - 12) +
  box(x, y, w, 4, '#b07a52') +
  box(x, y + 4, w, 8, '#8a5a3c') +
  box(x, y + 12, w, 4, '#5e3d29') +
  box(x + 12, y + 16, 8, 16, '#5e3d29') +
  box(x + w - 20, y + 16, 8, 16, '#5e3d29') +
  box(x + 12, y + 16, 4, 16, '#7a4f38') +
  box(x + w - 20, y + 16, 4, 16, '#7a4f38')

// Uma caminha do tamanho de um gato enrolado.
const bed = (x: number) =>
  box(x, 798, 136, 36, '#4a1a28') +
  box(x + 4, 802, 128, 28, '#7d2f42') +
  box(x + 4, 802, 12, 28, '#9a3d54') +
  box(x + 120, 802, 12, 28, '#5f2233') +
  box(x + 16, 806, 104, 12, '#c9566e') +
  box(x + 16, 806, 104, 4, '#e07a90') +
  box(x + 16, 818, 104, 12, '#b5485d') +
  box(x + 28, 824, 8, 4, '#e07a90') +
  box(x + 64, 824, 8, 4, '#e07a90') +
  box(x + 100, 824, 8, 4, '#e07a90')

export const gatos = (colony: Colony, sky: Sky = { phase: 'night', weather: 'clear', feast: 'none' }, bits: Bits = 16): string => {
  const parts: string[] = []
  const isOpen = sky.weather === 'clear' || sky.weather === 'partly'
  const isLampOn = sky.phase === 'night' || sky.phase === 'dusk' || (!isOpen && sky.phase !== 'day')
  const stops = (isOpen ? SKY_CLEAR : SKY_GRAY)[sky.phase]
  const beam = sky.phase === 'night' ? '#a9bcff' : sky.phase === 'day' ? '#ffe9a8' : '#ffb27a'
  setBits(bits)
  resetSprites()
  const fine = isFine()
  const party = decor(sky.feast)
  hatNow = party.hat

  // parede de papel estampado, lambri, rodapé e chão de tábuas
  parts.push(
    box(LEFT, 0, WIDE, 620, 'url(#paper)'),
    box(LEFT, 620, WIDE, 190, 'url(#panel)'),
    box(LEFT, 620, WIDE, 4, '#544879'),
    box(LEFT, 624, WIDE, 4, '#1b1629'),
    sky.phase === 'day' ? '' : box(LEFT, 0, WIDE, WALL_END, 'url(#dim)'),
    box(LEFT, 792, WIDE, 4, '#8a6650'),
    box(LEFT, 796, WIDE, 4, '#6a4c3c'),
    box(LEFT, 800, WIDE, 10, '#4a362c'),
    box(LEFT, WALL_END, WIDE, 190, 'url(#wood)'),
    box(LEFT, WALL_END, WIDE, 12, '#000000', ' opacity="0.25"'),
    // em 32 bits: a parede clareia perto do lambri e o chão brilha junto à parede
    fine ? box(LEFT, 0, WIDE, WALL_END, 'url(#wall)') + box(LEFT, WALL_END, WIDE, 190, 'url(#shine)') : '',
  )

  // tapete
  parts.push(box(500, 852, 600, 68, '#3d2f5e'), box(508, 860, 584, 52, '#57447f'), box(524, 872, 552, 28, '#3d2f5e'))
  for (let x = 508; x < 1080; x += 24) {
    parts.push(box(x, 860, 12, 4, '#e6b93c'), box(x + 12, 908, 12, 4, '#e6b93c'))
  }
  for (let x = 500; x < 1100; x += 12) {
    parts.push(box(x, 920, 4, 8, '#8d7bb5'), box(x, 844, 4, 8, '#8d7bb5'))
  }

  // janela: moldura, vidro com o céu, travessas, varão, cortinas e peitoril
  parts.push(
    box(WIN_X - 16, WIN_Y - 16, WIN_W + 32, WIN_H + 32, '#3d261a'),
    box(WIN_X - 12, WIN_Y - 12, WIN_W + 24, WIN_H + 24, '#5e3d29'),
    box(WIN_X, WIN_Y, WIN_W, WIN_H, 'url(#sky)'),
    `<svg x="${WIN_X}" y="${WIN_Y}" width="${WIN_W}" height="${WIN_H}" viewBox="0 0 ${WIN_W} ${WIN_H}">${outside(sky, party.window)}</svg>`,
    box(WIN_X + WIN_W / 2 - 4, WIN_Y, 8, WIN_H, '#5e3d29'),
    box(WIN_X, WIN_Y + WIN_H / 2 - 4, WIN_W, 8, '#5e3d29'),
    box(WIN_X + WIN_W / 2 - 4, WIN_Y, 4, WIN_H, '#7a4f38'),
    box(WIN_X, WIN_Y + WIN_H / 2 - 4, WIN_W, 4, '#7a4f38'),
    box(WIN_X - 40, WIN_Y - 36, WIN_W + 80, 12, '#8a5a3c'),
    box(WIN_X - 40, WIN_Y - 36, WIN_W + 80, 4, '#b07a52'),
    // o reflexo no vidro
    fine ? `<path d="M${WIN_X + 60} ${WIN_Y}h44l-72 ${WIN_H}h-32zM${WIN_X + 130} ${WIN_Y}h16l-72 ${WIN_H}h-16z" fill="#ffffff" opacity="0.09"/>` : '',
  )
  for (let i = 0; i < 4; i++) {
    parts.push(box(WIN_X - 32 + i * 12, WIN_Y - 24, 8, 232 - i * 32, i % 2 === 0 ? '#7d2f42' : '#9a3d54'))
    parts.push(box(WIN_X + WIN_W + 24 - i * 12, WIN_Y - 24, 8, 232 - i * 32, i % 2 === 0 ? '#7d2f42' : '#9a3d54'))
  }
  parts.push(drop(WIN_X - 22, WIN_Y + WIN_H + 16, WIN_W + 44, 44), box(WIN_X - 28, WIN_Y + WIN_H, WIN_W + 56, 4, '#b07a52'), box(WIN_X - 28, WIN_Y + WIN_H + 4, WIN_W + 56, 12, '#8a5a3c'), box(WIN_X - 28, WIN_Y + WIN_H + 16, WIN_W + 56, 4, '#5e3d29'))

  // quadro na parede
  parts.push(
    drop(446, 284, 124),
    box(440, 180, 136, 108, '#3d261a'),
    box(444, 184, 128, 100, '#b07a52'),
    box(452, 192, 112, 84, '#1b2a4a'),
    box(452, 244, 112, 32, '#2f5d4a'),
    box(476, 228, 40, 16, '#2f5d4a'),
    box(488, 216, 16, 12, '#2f5d4a'),
    box(528, 204, 16, 16, '#f6dc9a'),
  )

  // as abas: um vaso alto e um quadro à esquerda, livros numa prateleira e outro quadro à direita
  parts.push(
    drop(-294, 404, 124),
    box(-300, 300, 136, 108, '#3d261a'),
    box(-296, 304, 128, 100, '#b07a52'),
    box(-288, 312, 112, 84, '#4a2f5e'),
    box(-288, 364, 112, 32, '#2f3d6a'),
    box(-252, 328, 40, 40, '#f3e9c0'),
    box(-244, 336, 12, 12, '#d9cf9f'),
    box(-250, 740, 84, 94, '#7d2f42'),
    box(-246, 744, 76, 86, '#b5485d'),
    box(-246, 744, 12, 86, '#c9566e'),
    box(-258, 732, 100, 12, '#9a3d54'),
    box(-212, 560, 8, 172, '#3d7a47'),
    box(-252, 620, 40, 12, '#4f9a5b'),
    box(-272, 604, 24, 16, '#6fbf7a'),
    box(-204, 584, 48, 12, '#4f9a5b'),
    box(-164, 568, 24, 16, '#6fbf7a'),
    box(-244, 668, 32, 12, '#4f9a5b'),
    box(-204, 640, 36, 12, '#6fbf7a'),
    box(-224, 528, 20, 36, '#6fbf7a'),
    box(-220, 512, 12, 16, '#8fd69a'),
    shadow(-208, 836, 62),
    shelf(1700, 520, 180),
    box(1716, 456, 20, 64, '#b5485d'),
    box(1736, 468, 16, 52, '#3a5f8a'),
    box(1752, 448, 24, 72, '#e6b93c'),
    box(1776, 472, 16, 48, '#4f9a5b'),
    box(1800, 496, 60, 12, '#8d7bb5'),
    box(1804, 484, 52, 12, '#d9c39a'),
    drop(1766, 304, 124),
    box(1760, 200, 136, 108, '#3d261a'),
    box(1764, 204, 128, 100, '#b07a52'),
    box(1772, 212, 112, 84, '#2a3a2f'),
    box(1808, 232, 40, 36, '#e08a3c'),
    box(1808, 224, 12, 12, '#e08a3c'),
    box(1836, 224, 12, 12, '#e08a3c'),
    box(1816, 268, 24, 20, '#f8ead2'),
  )

  // prateleira com planta
  parts.push(
    shelf(812, 560, 132),
    box(850, 520, 56, 40, '#7d2f42'),
    box(854, 524, 48, 36, '#b5485d'),
    box(854, 524, 8, 36, '#c9566e'),
    box(846, 516, 64, 8, '#9a3d54'),
    box(874, 472, 8, 44, '#3d7a47'),
    box(854, 484, 20, 8, '#4f9a5b'),
    box(846, 476, 12, 8, '#6fbf7a'),
    box(882, 468, 28, 8, '#4f9a5b'),
    box(902, 460, 12, 8, '#6fbf7a'),
    box(862, 452, 12, 20, '#6fbf7a'),
    box(866, 444, 8, 8, '#8fd69a'),
  )

  // porta: batente, vão escuro e a folha com almofadas e maçaneta de alavanca
  const isLeaving = colony.leaving > 0
  const exit = isLeaving ? exitScene(colony) : { markup: '', css: '', doorCss: '' }
  parts.push(
    box(DOOR_L - 16, DOOR_TOP, DOOR_W + 32, DOOR_H + 16, '#3d261a'),
    box(DOOR_L - 12, DOOR_TOP + 4, DOOR_W + 24, DOOR_H + 12, '#5e3d29'),
    box(DOOR_L, DOOR_T, DOOR_W, DOOR_H, '#0b0910'),
    box(DOOR_L, DOOR_T, DOOR_W, 12, '#15111f'),
    `<g id="door-${colony.seq}" class="${isLeaving ? 'door' : 'shut'}">${
      box(DOOR_L, DOOR_T, DOOR_W, DOOR_H, '#7a4f38') +
      box(DOOR_L, DOOR_T, 4, DOOR_H, '#8f6046') +
      box(DOOR_L + DOOR_W - 4, DOOR_T, 4, DOOR_H, '#5e3d29') +
      box(DOOR_L + 20, DOOR_T + 24, DOOR_W - 40, 164, '#5e3d29') +
      box(DOOR_L + 24, DOOR_T + 28, DOOR_W - 48, 156, '#6a4330') +
      box(DOOR_L + 20, DOOR_T + 260, DOOR_W - 40, 152, '#5e3d29') +
      box(DOOR_L + 24, DOOR_T + 264, DOOR_W - 48, 144, '#6a4330') +
      party.door +
      (fine ? box(DOOR_L, DOOR_T, DOOR_W, DOOR_H, 'url(#sheen)') : '') +
      box(HANDLE_X - 8, HANDLE_Y - 16, 16, 36, '#8a6a1c') +
      box(HANDLE_X - 4, HANDLE_Y - 12, 8, 28, '#b8922c') +
      `<g class="${isLeaving ? 'lever' : 'rest'}">${box(HANDLE_X - 40, HANDLE_Y - 4, 46, 8, '#e6b93c') + box(HANDLE_X - 40, HANDLE_Y - 4, 46, 3, '#fff1b0') + box(HANDLE_X - 40, HANDLE_Y - 4, 4, 8, '#b8922c')}</g>`
    }</g>`,
  )

  // prateleiras e nicho para o pega-pega
  parts.push(
    shelf(940, 650, 140),
    shelf(1100, 500, 140),
    shelf(1380, 380, 140),
    shelf(960, 250, 140),
    shelf(446, 500, 140),
    drop(1156, 326, 168),
    box(1150, 190, 180, 140, '#3d261a'),
    box(1154, 194, 172, 132, '#8a5a3c'),
    box(1154, 194, 172, 4, '#b07a52'),
    box(1166, 206, 148, 108, '#2a1d19'),
    box(1166, 206, 148, 8, '#1c1310'),
    box(1166, 314, 148, 8, '#5e3d29'),
    party.wall,
  )

  // caminhas
  parts.push(bed(BED_A), bed(BED_B))

  // arranhador: base, poste de corda, plataforma, bolinha pendurada
  parts.push(box(1274, 814, 182, 20, '#3d261a'), box(1278, 818, 174, 12, '#8a5a3c'), box(1278, 818, 174, 4, '#b07a52'))
  for (let y = 604; y < 818; y += 16) {
    parts.push(box(1350, y, 32, 8, '#d9c39a'), box(1350, y + 8, 32, 8, '#b89f72'), box(1350, y, 4, 16, '#efe0c0'), box(1378, y, 4, 16, '#9a8358'))
  }
  parts.push(
    fine ? box(1350, 604, 32, 214, 'url(#sheen)') : '',
    drop(1298, 606, 136, 28),
    box(1292, 584, 148, 24, '#3d261a'),
    box(1296, 588, 140, 16, '#8a5a3c'),
    box(1296, 588, 140, 4, '#b07a52'),
    box(1420, 608, 4, 44, '#d9c39a'),
    `<g class="ball">${box(1412, 652, 20, 20, '#c9566e') + box(1416, 648, 12, 28, '#c9566e') + box(1416, 656, 4, 4, '#f3a8b8')}</g>`,
  )

  // potes de comida, novelo, caixa e a mariposa da luminária
  parts.push(
    box(1120, 820, 44, 14, '#3a5f8a'),
    box(1124, 816, 36, 6, '#b5651f'),
    box(1120, 820, 44, 4, '#5a86b8'),
    box(1174, 820, 44, 14, '#3a5f8a'),
    box(1178, 816, 36, 6, '#7fb3d9'),
    box(1174, 820, 44, 4, '#5a86b8'),
    `<g class="${colony.count > YARN_CAT ? 'yarn' : 'still'}">${
      box(344, 812, 24, 24, '#6fbf7a') + box(340, 816, 32, 16, '#6fbf7a') + box(348, 820, 16, 4, '#3d7a47') + box(352, 828, 12, 4, '#3d7a47') + box(348, 812, 8, 4, '#a8e6b0')
    }</g>`,
    party.floor,
    boxBack,
    boxFront,
    !isLampOn ? '' : `<g class="orbit">${at(
      LAMP_X + 72,
      214,
      `<g class="fa" style="animation-duration:0.5s">${box(-8, -4, 8, 8, '#e6dcc6') + box(0, -4, 8, 8, '#e6dcc6')}</g><g class="fb" opacity="0" style="animation-duration:0.5s">${
        box(-4, 0, 4, 4, '#e6dcc6') + box(0, 0, 4, 4, '#e6dcc6')
      }</g>${box(-2, -4, 4, 8, '#6a5a3a')}`,
    )}</g>`,
  )

  // sombras dos móveis, luminária e a luz que entra pela janela
  parts.push(
    shadow(BED_A + 68, 836, 78),
    shadow(BED_B + 68, 836, 78),
    shadow(1365, 836, 100),
    box(LAMP_X - 2, 0, 4, 150, '#14101f'),
    box(LAMP_X - 20, 150, 40, 8, '#a86a2a'),
    box(LAMP_X - 28, 158, 56, 12, '#c98a3c'),
    box(LAMP_X - 36, 170, 72, 10, '#e0a04a'),
    box(LAMP_X - 36, 170, 72, 3, '#f0b85c'),
    box(LAMP_X - 14, 180, 28, 8, isLampOn ? '#fff1b0' : '#8a7a5a'),
    isLampOn ? `<circle cx="${LAMP_X}" cy="200" r="330" fill="url(#lamp)" class="glow"/>` : '',
    // em 32 bits a luminária desenha um cone de luz na parede e uma poça morna no chão
    isLampOn && fine
      ? `<path d="M${LAMP_X - 34} 188L${LAMP_X - 330} ${WALL_END}H${LAMP_X + 330}L${LAMP_X + 34} 188z" fill="url(#cone)" class="glow"/><ellipse cx="${LAMP_X}" cy="884" rx="430" ry="96" fill="url(#pool)" class="glow"/>`
      : '',
    isOpen
      ? `<path d="M${WIN_X} ${WIN_Y + WIN_H + 20}H${WIN_X + WIN_W}L840 1000H250Z" fill="url(#beam)" class="glow"/>${[0, 1, 2, 3, 4, 5, 6]
          .map(i => box(240 + i * 70, 690 + ((i * 97) % 270), 4, 4, '#dfe6ff', ` class="mote" opacity="0.5" style="animation-delay:-${i * 2.3}s"`))
          .join('')}`
      : '',
  )

  // quem mora na cena agora; os que andam ficam por cima dos móveis
  const order = SLOTS.map((slot, index) => ({ slot, index })).filter(one => one.index < colony.count)
  parts.push(...order.filter(one => !isMover(one.slot)).map(one => resident(one.slot, one.index)))
  parts.push(...order.filter(one => isMover(one.slot)).map(one => resident(one.slot, one.index)))
  parts.push(exit.markup, party.over, fine ? box(LEFT, 0, WIDE, H, 'url(#vig)') : '')
  // a luz do ambiente por cima de tudo
  parts.push(
    sky.phase === 'day'
      ? box(LEFT, 0, WIDE, H, '#fff5d6', ` opacity="${isOpen ? 0.12 : 0.05}"`)
      : sky.phase === 'night'
        ? ''
        : box(LEFT, 0, WIDE, H, isOpen ? '#ff9a5a' : '#8a8090', ' opacity="0.08"'),
  )

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LEFT} 0 ${WIDE} ${H}" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset="0.6" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient><linearGradient id="dim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="0.4"/><stop offset="0.7" stop-color="#000000" stop-opacity="0"/></linearGradient><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${beam}" stop-opacity="0.2"/><stop offset="1" stop-color="${beam}" stop-opacity="0.03"/></linearGradient><radialGradient id="lamp"><stop offset="0" stop-color="#ffd08a" stop-opacity="0.34"/><stop offset="0.5" stop-color="#ffb86a" stop-opacity="0.1"/><stop offset="1" stop-color="#ffb86a" stop-opacity="0"/></radialGradient>${
    fine
      ? '<radialGradient id="soft"><stop offset="0" stop-color="#000000" stop-opacity="0.5"/><stop offset="0.6" stop-color="#000000" stop-opacity="0.22"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient><radialGradient id="vig" cx="0.5" cy="0.55" r="0.75"><stop offset="0.55" stop-color="#05030c" stop-opacity="0"/><stop offset="1" stop-color="#05030c" stop-opacity="0.72"/></radialGradient><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0716" stop-opacity="0.3"/><stop offset="0.75" stop-color="#ffffff" stop-opacity="0.04"/><stop offset="1" stop-color="#0a0716" stop-opacity="0.18"/></linearGradient><linearGradient id="drop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05030c" stop-opacity="0.55"/><stop offset="1" stop-color="#05030c" stop-opacity="0"/></linearGradient><linearGradient id="sheen"><stop offset="0" stop-color="#fff0d0" stop-opacity="0.22"/><stop offset="0.45" stop-color="#fff0d0" stop-opacity="0"/><stop offset="1" stop-color="#05030c" stop-opacity="0.4"/></linearGradient><linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd08a" stop-opacity="0.3"/><stop offset="1" stop-color="#ffb86a" stop-opacity="0.04"/></linearGradient><radialGradient id="pool"><stop offset="0" stop-color="#ffd08a" stop-opacity="0.3"/><stop offset="1" stop-color="#ffb86a" stop-opacity="0"/></radialGradient><linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6c0" stop-opacity="0.1"/><stop offset="0.4" stop-color="#ffe6c0" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.3"/></linearGradient>'
      : ''
  }<pattern id="paper" width="48" height="48" patternUnits="userSpaceOnUse">${
    box(0, 0, 48, 48, '#241d36') + box(0, 0, 24, 48, '#272039') + box(20, 4, 8, 4, '#322a4b') + box(16, 8, 16, 4, '#322a4b') + box(12, 12, 24, 4, '#3a3157') + box(16, 16, 16, 4, '#322a4b') + box(20, 20, 8, 4, '#322a4b') + box(44, 32, 4, 4, '#2e2645') + box(0, 32, 4, 4, '#2e2645') + box(20, 36, 4, 4, '#3a3157')
  }</pattern><pattern id="panel" width="160" height="190" patternUnits="userSpaceOnUse">${
    box(0, 0, 160, 190, '#2b2442') + box(16, 28, 128, 4, '#3d3460') + box(16, 28, 4, 132, '#3d3460') + box(16, 156, 128, 4, '#1c172c') + box(140, 28, 4, 132, '#1c172c') + box(24, 36, 112, 116, '#2f2848') + box(24, 36, 112, 4, '#262040')
  }</pattern><pattern id="wood" width="220" height="80" patternUnits="userSpaceOnUse">${
    box(0, 0, 220, 80, '#3a2a24') + box(0, 0, 220, 4, '#261a16') + box(0, 4, 220, 4, '#4a372e') + box(0, 40, 220, 4, '#261a16') + box(0, 44, 220, 4, '#4a372e') + box(70, 4, 4, 36, '#261a16') + box(180, 44, 4, 36, '#261a16') + box(20, 20, 32, 4, '#31231e') + box(110, 28, 44, 4, '#43322a') + box(30, 60, 52, 4, '#43322a') + box(120, 68, 28, 4, '#31231e') + box(90, 12, 12, 4, '#43322a')
  }</pattern>${spriteDefs()}</defs><style>
.rain{animation:rain 0.9s linear infinite}
.snow{animation:snow 7s linear infinite}
.bolt{animation:bolt 13s linear infinite}
@keyframes rain{0%{transform:translate(0px,0px)}100%{transform:translate(-30px,270px)}}
@keyframes snow{0%{transform:translate(0px,0px)}50%{transform:translate(14px,125px)}100%{transform:translate(0px,250px)}}
@keyframes bolt{0%,91%{opacity:0}92%{opacity:0.55}94%{opacity:0.1}95%{opacity:0.4}98%,100%{opacity:0}}
.glow{animation:glow 7s ease-in-out infinite}
.mote{animation:mote 16s linear infinite}
.cloud{animation:cloud 140s linear infinite}
@keyframes glow{0%,100%{opacity:0.85}50%{opacity:1}}
@keyframes mote{0%{transform:translate(0px,20px);opacity:0}20%{opacity:0.6}80%{opacity:0.5}100%{transform:translate(30px,-60px);opacity:0}}
@keyframes cloud{0%{transform:translateX(-270px)}100%{transform:translateX(290px)}}
.fa,.fb,.blink{animation-timing-function:step-end;animation-iteration-count:infinite}
.fa{animation-name:fa}
.fb{animation-name:fb}
.blink{animation-name:blink;animation-duration:5.5s}
.star{animation:star 7s ease-in-out infinite}
.breath{transform-box:fill-box;transform-origin:50% 100%;animation:breath 4.5s ease-in-out infinite}
.zzz{animation:zzz 6s linear infinite}
.ball{transform-origin:1422px 608px;animation:ball 5s ease-in-out infinite}
.walk{animation-name:walk;animation-timing-function:linear;animation-iteration-count:infinite}
.turn{transform-box:fill-box;transform-origin:50% 50%;animation-name:turn;animation-timing-function:step-end;animation-iteration-count:infinite}
@keyframes fa{0%{opacity:1}50%{opacity:0}100%{opacity:0}}
@keyframes fb{0%{opacity:0}50%{opacity:1}100%{opacity:1}}
@keyframes blink{0%{opacity:0}94%{opacity:1}97%{opacity:0}100%{opacity:0}}
@keyframes star{0%,100%{opacity:0.3}50%{opacity:0.9}}
@keyframes breath{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.08)}}
@keyframes zzz{0%{transform:translateY(12px);opacity:0}30%{opacity:0.8}100%{transform:translateY(-36px);opacity:0}}
@keyframes ball{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
@keyframes pounce{0%,46%{transform:translate(0px,0px)}48%{transform:translate(0px,6px)}52%{transform:translate(16px,-26px)}56%{transform:translate(30px,-4px)}58%,74%{transform:translate(32px,0px)}80%{transform:translate(16px,-10px)}86%,100%{transform:translate(0px,0px)}}
@keyframes yarn{0%,56%{transform:translateX(0px)}64%{transform:translateX(70px)}70%{transform:translateX(84px)}100%{transform:translateX(0px)}}
@keyframes peek{0%,26%{transform:translateY(46px)}31%,56%{transform:translateY(0px)}61%,76%{transform:translateY(46px)}79%,87%{transform:translateY(18px)}90%,100%{transform:translateY(46px)}}
@keyframes orbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.pounce{animation:pounce 5s linear infinite}
.yarn{animation:yarn 5s linear infinite}
.peek{animation:peek 11s ease-in-out infinite}
.orbit{transform-origin:${LAMP_X}px 214px;animation:orbit 12s linear infinite}${route.css}
@keyframes walk{0%{transform:translateX(${WALK_FROM}px)}6%{transform:translateX(${WALK_FROM}px)}46%{transform:translateX(${WALK_TO}px)}54%{transform:translateX(${WALK_TO}px)}94%{transform:translateX(${WALK_FROM}px)}100%{transform:translateX(${WALK_FROM}px)}}
@keyframes turn{0%{transform:scaleX(1)}50%{transform:scaleX(-1)}98%{transform:scaleX(1)}100%{transform:scaleX(1)}}${party.css}${exit.doorCss}${exit.css}
${spriteCss()}</style>${parts.join('')}</svg>`
}
