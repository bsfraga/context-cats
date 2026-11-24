// Gatos: um cômodo em pixel art de 16 bits, com céu e luz pela hora e pelo clima. Cada pixel vale P unidades.
// Os quadros de animação trocam por opacidade em degraus; o primeiro quadro é o
// de repouso, para quem pediu movimento reduzido.

import type { Colony, Phase, Sky, Weather } from '../types'

const W = 1600
const H = 1000
const P = 3

type Palette = Record<string, string>

const box = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`

// Um sprite a partir de linhas de texto: cada letra é uma cor, ponto é vazio.
// Cada sprite é desenhado uma vez, em defs, e reusado por referência: a cena
// repete os mesmos gatos muitas vezes e o desenho inteiro tem limite de tamanho.
const ids = new Map<string, string>()
const used = new Map<string, string>()

const sprite = (rows: string[], palette: Palette): string => {
  const key = `${rows.join('/')}|${Object.entries(palette).join()}`
  const id = ids.get(key) ?? `s${ids.size}`
  ids.set(key, id)

  if (!used.has(id)) {
    const paths = new Map<string, string>()

    rows.forEach((row, r) => {
      let c = 0

      while (c < row.length) {
        const ch = row[c] ?? '.'
        let end = c + 1

        while (end < row.length && row[end] === ch) {
          end++
        }
        const fill = palette[ch]

        if (fill !== undefined) {
          paths.set(fill, `${paths.get(fill) ?? ''}M${c} ${r}.5h${end - c}`)
        }
        c = end
      }
    })
    used.set(id, `<g id="${id}" transform="scale(${P})">${[...paths].map(([fill, d]) => `<path stroke="${fill}" d="${d}"/>`).join('')}</g>`)
  }

  return `<use href="#${id}"/>`
}

const at = (x: number, y: number, inner: string, attrs = '') => `<g transform="translate(${x} ${y})"${attrs}>${inner}</g>`

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

const sitting = (palette: Palette, swish = 2.6, delay = 0) =>
  sprite(SIT, palette) +
  at(15 * P, 12 * P, sprite(TAIL_UP, palette), ` class="fa" style="animation-duration:${swish}s;animation-delay:-${delay}s"`) +
  at(15 * P, 12 * P, sprite(TAIL_OUT, palette), ` class="fb" opacity="0" style="animation-duration:${swish}s;animation-delay:-${delay}s"`) +
  at(0, 7 * P, sprite(BLINK, palette), ` class="blink" opacity="0" style="animation-delay:-${delay}s"`)

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

const walking = (palette: Palette, step = 0.5) =>
  `<ellipse cx="${WALK_W / 2}" cy="${WALK_H}" rx="34" ry="4" fill="#000000" opacity="0.28"/>` +
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

const shadow = (cx: number, cy: number, rx: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${Math.max(3, Math.round(rx / 9))}" fill="#000000" opacity="0.3"/>`

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

// O que se vê pela janela, em coordenadas da própria janela (240 por 240).
const outside = (sky: Sky): string => {
  const isOpen = sky.weather === 'clear' || sky.weather === 'partly'
  const isNight = sky.phase === 'night'
  const out: string[] = []

  if (isOpen && isNight) {
    out.push(
      [
        [30, 40],
        [84, 122],
        [138, 50],
        [192, 164],
        [54, 188],
        [210, 96],
        [20, 136],
      ]
        .map(([x, y], i) => box(x ?? 0, y ?? 0, 3, 3, '#dfe6ff', ` class="star" opacity="0.7" style="animation-delay:-${i * 1.3}s"`))
        .join(''),
      box(160, 28, 36, 52, '#f3e9c0') + box(152, 36, 52, 36, '#f3e9c0') + box(156, 32, 44, 44, '#f3e9c0') + box(172, 44, 12, 12, '#d9cf9f') + box(184, 60, 8, 8, '#d9cf9f') + box(164, 36, 8, 4, '#ffffff'),
    )
  }
  if (isOpen && !isNight) {
    const low = sky.phase === 'day' ? 0 : 150
    const color = sky.phase === 'day' ? '#ffe27a' : '#ffb04a'
    out.push(
      `<g class="glow">${
        box(150, 22 + low, 56, 56, color, ' opacity="0.25"') + box(160, 28 + low, 36, 52, color) + box(152, 36 + low, 52, 36, color) + box(156, 32 + low, 44, 44, color) + box(164, 36 + low, 12, 8, '#fff6cf')
      }</g>`,
    )
  }
  if (sky.weather !== 'clear') {
    const many = sky.weather === 'partly' ? 2 : 6
    const [light, dark] = isNight ? ['#5a6288', '#3f4666'] : sky.weather === 'partly' ? ['#ffffff', '#d5deea'] : ['#c2c8d2', '#9aa2b0']
    const puffs: string[] = []

    for (let i = 0; i < many; i++) {
      const x = (i * 97) % 220
      const y = 30 + ((i * 61) % 130)
      puffs.push(box(x, y + 8, 96, 14, light) + box(x + 16, y, 56, 10, light) + box(x + 8, y + 22, 88, 8, dark))
    }
    out.push(`<g class="cloud" opacity="${sky.weather === 'partly' ? 0.75 : 0.95}">${puffs.join('')}</g><g class="cloud" opacity="0.8" style="animation-delay:-70s">${puffs.slice(0, Math.ceil(many / 2)).join('')}</g>`)
  }
  if (sky.weather === 'fog') {
    out.push(box(0, 0, 240, 240, '#c9ced6', ' opacity="0.45"'))
  }
  if (sky.weather === 'rain' || sky.weather === 'storm') {
    const drops = sky.weather === 'storm' ? 26 : 16

    for (let i = 0; i < drops; i++) {
      out.push(box((i * 53) % 236, -24, 2, 16, '#b9d0ee', ` class="rain" opacity="0.75" style="animation-delay:-${((i * 0.37) % 1).toFixed(2)}s"`))
    }
  }
  if (sky.weather === 'storm') {
    out.push(box(0, 0, 240, 240, '#e8eeff', ' class="bolt" opacity="0"'))
  }
  if (sky.weather === 'snow') {
    for (let i = 0; i < 16; i++) {
      out.push(box((i * 47) % 234, -8, 4, 4, '#ffffff', ` class="snow" opacity="0.9" style="animation-delay:-${((i * 0.9) % 7).toFixed(1)}s"`))
    }
  }

  return out.join('')
}

// Onde cada gato mora, na ordem em que eles chegam.
type Slot = { kind: 'sit' | 'sleep' | 'walk' | 'scratch' | 'play' | 'box' | 'run'; x: number; y: number; coat: Palette; seconds: number; delay: number }

const FLOOR = 830
const BED_A = 150
const BED_B = 860
const RUN_Y = 836 - WALK_H
const SLOTS: Slot[] = [
  { kind: 'sleep', x: BED_A + 60, y: 802 - SLEEP_H, coat: GRAY, seconds: 4.5, delay: 0 },
  { kind: 'sit', x: 1334, y: 588 - SIT_H, coat: BLACK, seconds: 2.4, delay: 0.5 },
  { kind: 'walk', x: 0, y: 862 - WALK_H, coat: CALICO, seconds: 70, delay: 0 },
  { kind: 'scratch', x: 1317, y: 818 - SCRATCH_H, coat: ORANGE, seconds: 0.7, delay: 0 },
  { kind: 'run', x: 821, y: RUN_Y, coat: CREAM, seconds: 0, delay: 0 },
  { kind: 'run', x: 770, y: RUN_Y, coat: SIAMESE, seconds: 0, delay: 1.1 },
  { kind: 'sit', x: 164, y: 340 - SIT_H, coat: ORANGE, seconds: 3.4, delay: 2 },
  { kind: 'play', x: 408, y: FLOOR - SIT_H, coat: TUXEDO, seconds: 2.9, delay: 1.1 },
  { kind: 'walk', x: 0, y: 896 - WALK_H, coat: BLACK, seconds: 44, delay: 20 },
  { kind: 'box', x: 1490, y: FLOOR - SIT_H, coat: GRAY, seconds: 3.7, delay: 2.4 },
  { kind: 'sleep', x: BED_B + 60, y: 802 - SLEEP_H, coat: ORANGE, seconds: 4.5, delay: 2.2 },
  { kind: 'sit', x: 832, y: 330 - SIT_H, coat: CALICO, seconds: 3.3, delay: 0.8 },
]
const YARN_CAT = 7
const CHASER = 8
const isMover = (slot: Slot) => slot.kind === 'walk' || slot.kind === 'run'

type Key = { t: number; x: number; y: number; o: number }

const frames = (name: string, keys: Key[], total: number): string =>
  `@keyframes ${name}{${keys
    .map(k => `${((100 * Math.min(k.t, total)) / total).toFixed(2)}%{transform:translate(${Math.round(k.x)}px,${Math.round(k.y)}px);opacity:${k.o}}`)
    .join('')}}`

// Um salto em parábola, em seis pontos.
const arc = (t0: number, d: number, x0: number, y0: number, x1: number, y1: number, lift: number): Key[] =>
  [0, 0.2, 0.4, 0.6, 0.8, 1].map(u => ({ t: t0 + d * u, x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u - 4 * lift * u * (1 - u), o: 1 }))

// O pega-pega: dois gatos correm o mesmo percurso, um logo atrás do outro,
// pelo chão, pelas prateleiras, pelo teto do nicho e por cima da porta.
type Leg = { to: [number, number]; lift?: number; d?: number; wait?: number }

const ROUTE_START: [number, number] = [860, 836]
const ROUTE: Leg[] = [
  { to: [960, 836] },
  { to: [1055, 640], lift: 60 },
  { to: [1195, 500], lift: 60, wait: 0.2 },
  { to: [1463, 250], lift: 70, d: 0.7 },
  { to: [1300, 228], lift: 46 },
  { to: [1215, 228] },
  { to: [1055, 290], lift: 50, wait: 0.2 },
  { to: [900, 836], lift: 24, d: 0.85 },
  { to: [420, 836] },
  { to: [363, 640], lift: 70 },
  { to: [545, 520], lift: 60, wait: 0.2 },
  { to: [665, 506], lift: 50 },
  { to: [750, 506] },
  { to: [860, 836], lift: 24, d: 0.8 },
]
const RUN_SPEED = 270
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
      part('lr', at(-3, 14, leaping(slot.coat, 1, -8)), false) +
      part('ll', at(-3, 14, leaping(slot.coat, -1, 8)), false)
    }</g>`,
  )
}

// A caixa de papelão: o fundo fica atrás do gato, a frente na frente.
const BOX_X = 1474
const boxBack =
  box(BOX_X, 770, 92, 64, '#6b4a2a') + box(BOX_X + 6, 774, 80, 20, '#2a1d19') + box(BOX_X - 12, 764, 16, 8, '#c79a5e') + box(BOX_X + 88, 764, 16, 8, '#c79a5e')
const boxFront =
  box(BOX_X, 790, 92, 44, '#b98a52') + box(BOX_X, 790, 92, 4, '#d8ad72') + box(BOX_X, 826, 92, 8, '#96693a') + box(BOX_X + 40, 790, 12, 44, '#d9c39a') + box(BOX_X + 40, 790, 12, 4, '#efe0c0')
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
            slot.x + 84 + i * 22,
            slot.y - 30 - i * 26,
            `<g class="zzz" opacity="0.5" style="animation-delay:-${i * 2 + slot.delay}s">${sprite(Z, { Z: '#dfe6ff' })}</g>`,
          ),
        )
        .join('')
    )
  }
  if (slot.kind === 'walk') {
    const timing = ` style="animation-duration:${slot.seconds}s;animation-delay:-${slot.delay}s"`

    const toy = index === CHASER ? at(WALK_W + 26, WALK_H - 12, sprite(MOUSE, MOUSE_COAT)) : ''

    return `<g class="walk"${timing}>${at(0, slot.y, `<g class="turn"${timing}>${walking(slot.coat, index === CHASER ? 0.3 : 0.5)}${toy}</g>`)}</g>`
  }
  if (slot.kind === 'run') {
    return runner(slot)
  }
  if (slot.kind === 'play') {
    return shadow(slot.x + 40, FLOOR + 2, 34) + `<g class="pounce">${at(slot.x, FLOOR - WALK_H, walking(slot.coat, 0.4).replace(/<ellipse[^>]*>/, ''))}</g>`
  }
  if (slot.kind === 'box') {
    return `<g class="peek">${at(slot.x, 756, sprite(SIT.slice(0, 12), slot.coat))}</g>${boxFront}`
  }
  if (slot.kind === 'scratch') {
    return at(slot.x, slot.y, scratching(slot.coat))
  }

  return (slot.y + SIT_H === FLOOR ? shadow(slot.x + 28, FLOOR + 2, 30) : '') + at(slot.x, slot.y, sitting(slot.coat, slot.seconds, slot.delay))
}

// A saída: cada gato que vai embora parte de onde mora, desce se estiver no
// alto, anda até a porta e entra. O que chega primeiro pula na maçaneta.
const DOOR_X = 700
const DOOR_Y = 818 - WALK_H
const SPEED = 170

type Leaver = { slot: Slot; dir: 1 | -1; isHigh: boolean; x0: number; y0: number; xs: number; ys: number; xt: number; travel: number; arrive: number }

const plan = (colony: Colony) => {
  const leavers: Leaver[] = SLOTS.slice(colony.count, colony.count + colony.leaving).map(slot => {
    const height = slot.kind === 'sit' ? SIT_H : slot.kind === 'sleep' ? SLEEP_H : slot.kind === 'scratch' ? SCRATCH_H : WALK_H
    const x0 = slot.kind === 'walk' ? walkStart(slot) : slot.x
    const dir: 1 | -1 = x0 > DOOR_X ? -1 : 1
    const isHigh = !isMover(slot) && slot.y + height < 790
    const xs = isHigh ? x0 + dir * 80 : x0
    const ys = isMover(slot) ? slot.y : FLOOR - WALK_H
    const xt = dir === 1 ? DOOR_X - WALK_W : DOOR_X
    const travel = (isHigh ? 0.75 : 0.05) + Math.abs(xt - xs) / SPEED

    return { slot, dir, isHigh, x0, y0: slot.y, xs, ys, xt, travel, arrive: 0 }
  })
  leavers.sort((a, b) => a.travel - b.travel)
  let last = 0

  leavers.forEach((cat, i) => {
    cat.arrive = i === 0 ? 0.3 + cat.travel : Math.max(last + 0.4, 0.3 + cat.travel, (leavers[0]?.arrive ?? 0) + 2.1)
    last = cat.arrive
  })
  const opened = (leavers[0]?.arrive ?? 0) + 0.7
  const done = Math.max((leavers[0]?.arrive ?? 0) + 2, last + 0.3)

  return { leavers, opened, done, total: done + 1 }
}

/** Quanto dura a saída pela porta, em segundos. */
export const exitSeconds = (colony: Colony): number => plan(colony).total

const pose = (slot: Slot): string =>
  slot.kind === 'sleep' ? sprite(SLEEP, slot.coat) : slot.kind === 'scratch' ? sprite(SCRATCH, slot.coat) : sitting(slot.coat, slot.seconds, slot.delay)

const exitScene = (colony: Colony): { markup: string; css: string; doorCss: string } => {
  const { leavers, opened, done, total } = plan(colony)
  const run = `${total.toFixed(2)}s linear 1 both`
  let markup = ''
  let css = ''

  leavers.forEach((cat, i) => {
    const go = cat.arrive - cat.travel
    const swap = go + (cat.isHigh ? 0.75 : 0.05)
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
          { t: 0, x: cat.x0 - 12, y: cat.y0 + 24, o: 0 },
          { t: go + 0.14, x: cat.x0 - 12, y: cat.y0 + 24, o: 0 },
          ...arc(go + 0.15, 0.6, cat.x0 - 12, cat.y0 + 24, cat.xs - 4, FLOOR - LEAP_H - 4, 34),
          { t: swap + 0.01, x: cat.xs - 4, y: FLOOR - LEAP_H - 4, o: 0 },
          { t: total, x: cat.xs - 4, y: FLOOR - LEAP_H - 4, o: 0 },
        ]
        keys.push({ t: go + 0.1, x: cat.x0, y: cat.y0 + 6, o: 1 }, { t: go + 0.14, x: cat.x0, y: cat.y0 + 6, o: 1 }, { t: go + 0.15, x: cat.x0, y: cat.y0, o: 0 })
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
      isOpener ? { t: cat.arrive + 0.02, x: cat.xt, y: DOOR_Y, o: 0 } : { t: cat.arrive + 0.3, x: cat.xt + cat.dir * 24, y: DOOR_Y, o: 0 },
      { t: total, x: cat.xt, y: DOOR_Y, o: 0 },
    )
    markup += `<g class="w${i}" opacity="0">${face}</g>`
    css += `\n.w${i}{animation:w${i} ${run}}\n${frames(`w${i}`, walk, total)}`

    if (isOpener) {
      const a = cat.arrive
      const floorY = 818 - SIT_H
      const hang: Key[] = [
        { t: 0, x: 716, y: floorY, o: 0 },
        { t: a, x: 716, y: floorY, o: 0 },
        { t: a + 0.02, x: 716, y: floorY, o: 1 },
        { t: a + 0.4, x: 716, y: 650, o: 1 },
        { t: a + 1.3, x: 716, y: 650, o: 1 },
        { t: a + 1.6, x: 716, y: floorY, o: 1 },
        { t: a + 1.75, x: 716, y: floorY, o: 1 },
        { t: a + 2, x: 680, y: floorY, o: 0 },
        { t: total, x: 680, y: floorY, o: 0 },
      ]
      markup += `<g class="hang" opacity="0">${sprite(SIT, cat.slot.coat)}</g>`
      css += `\n.hang{animation:hang ${run}}\n${frames('hang', hang, total)}`
    }
  })
  const pc = (seconds: number) => `${((100 * seconds) / total).toFixed(3)}%`
  const doorCss = `
.door{transform-origin:642px 666px;animation:door ${run}}
@keyframes door{0%,${pc(opened)}{transform:scaleX(1)}${pc(opened + 0.5)},${pc(done + 0.3)}{transform:scaleX(0.16)}${pc(done + 0.7)},100%{transform:scaleX(1)}}`

  return { markup, css, doorCss }
}

const shelf = (x: number, y: number, w: number) =>
  box(x, y, w, 4, '#b07a52') +
  box(x, y + 4, w, 8, '#8a5a3c') +
  box(x, y + 12, w, 4, '#5e3d29') +
  box(x + 12, y + 16, 8, 16, '#5e3d29') +
  box(x + w - 20, y + 16, 8, 16, '#5e3d29') +
  box(x + 12, y + 16, 4, 16, '#7a4f38') +
  box(x + w - 20, y + 16, 4, 16, '#7a4f38')

const bed = (x: number) =>
  box(x - 8, 792, 220, 42, '#4a1a28') +
  box(x - 4, 796, 212, 34, '#7d2f42') +
  box(x - 4, 796, 16, 34, '#9a3d54') +
  box(x + 192, 796, 16, 34, '#5f2233') +
  box(x + 12, 800, 180, 16, '#c9566e') +
  box(x + 12, 800, 180, 4, '#e07a90') +
  box(x + 12, 816, 180, 14, '#b5485d') +
  box(x + 28, 822, 8, 4, '#e07a90') +
  box(x + 100, 822, 8, 4, '#e07a90') +
  box(x + 164, 822, 8, 4, '#e07a90')

export const gatos = (colony: Colony, sky: Sky = { phase: 'night', weather: 'clear' }): string => {
  const parts: string[] = []
  const isOpen = sky.weather === 'clear' || sky.weather === 'partly'
  const isLampOn = sky.phase === 'night' || sky.phase === 'dusk' || (!isOpen && sky.phase !== 'day')
  const stops = (isOpen ? SKY_CLEAR : SKY_GRAY)[sky.phase]
  const beam = sky.phase === 'night' ? '#a9bcff' : sky.phase === 'day' ? '#ffe9a8' : '#ffb27a'
  used.clear()

  // parede de papel estampado, lambri, rodapé e chão de tábuas
  parts.push(
    box(0, 0, W, 620, 'url(#paper)'),
    box(0, 620, W, 190, 'url(#panel)'),
    box(0, 620, W, 4, '#544879'),
    box(0, 624, W, 4, '#1b1629'),
    sky.phase === 'day' ? '' : box(0, 0, W, 810, 'url(#dim)'),
    box(0, 792, W, 4, '#8a6650'),
    box(0, 796, W, 4, '#6a4c3c'),
    box(0, 800, W, 10, '#4a362c'),
    box(0, 810, W, 190, 'url(#wood)'),
    box(0, 810, W, 12, '#000000', ' opacity="0.25"'),
  )

  // tapete
  parts.push(box(470, 852, 660, 68, '#3d2f5e'), box(478, 860, 644, 52, '#57447f'), box(494, 872, 612, 28, '#3d2f5e'))
  for (let x = 478; x < 1122; x += 24) {
    parts.push(box(x, 860, 12, 4, '#e6b93c'), box(x + 12, 908, 12, 4, '#e6b93c'))
  }
  for (let x = 470; x < 1130; x += 12) {
    parts.push(box(x, 920, 4, 8, '#8d7bb5'), box(x, 844, 4, 8, '#8d7bb5'))
  }

  // janela com lua e cortinas
  parts.push(
    box(104, 84, 272, 272, '#3d261a'),
    box(108, 88, 264, 264, '#5e3d29'),
    box(120, 100, 240, 240, 'url(#sky)'),
    `<svg x="120" y="100" width="240" height="240" viewBox="0 0 240 240">${outside(sky)}</svg>`,
    box(236, 100, 8, 240, '#5e3d29'),
    box(120, 216, 240, 8, '#5e3d29'),
    box(236, 100, 4, 240, '#7a4f38'),
    box(120, 216, 240, 4, '#7a4f38'),
    box(92, 68, 296, 12, '#8a5a3c'),
    box(92, 68, 296, 4, '#b07a52'),
  )
  for (let i = 0; i < 4; i++) {
    parts.push(box(96 + i * 12, 80, 8, 200 - i * 28, i % 2 === 0 ? '#7d2f42' : '#9a3d54'))
    parts.push(box(376 - i * 12, 80, 8, 200 - i * 28, i % 2 === 0 ? '#7d2f42' : '#9a3d54'))
  }
  parts.push(box(92, 340, 296, 4, '#b07a52'), box(92, 344, 296, 12, '#8a5a3c'), box(92, 356, 296, 4, '#5e3d29'))

  // quadro na parede
  parts.push(
    box(540, 150, 136, 108, '#3d261a'),
    box(544, 154, 128, 100, '#b07a52'),
    box(552, 162, 112, 84, '#1b2a4a'),
    box(552, 214, 112, 32, '#2f5d4a'),
    box(576, 198, 40, 16, '#2f5d4a'),
    box(588, 186, 16, 12, '#2f5d4a'),
    box(628, 174, 16, 16, '#f6dc9a'),
  )

  // prateleira com planta
  parts.push(
    shelf(430, 520, 132),
    box(468, 480, 56, 40, '#7d2f42'),
    box(472, 484, 48, 36, '#b5485d'),
    box(472, 484, 8, 36, '#c9566e'),
    box(464, 476, 64, 8, '#9a3d54'),
    box(492, 432, 8, 44, '#3d7a47'),
    box(472, 444, 20, 8, '#4f9a5b'),
    box(464, 436, 12, 8, '#6fbf7a'),
    box(500, 428, 28, 8, '#4f9a5b'),
    box(520, 420, 12, 8, '#6fbf7a'),
    box(480, 412, 12, 20, '#6fbf7a'),
    box(484, 404, 8, 8, '#8fd69a'),
  )

  // porta
  const isLeaving = colony.leaving > 0
  const exit = isLeaving ? exitScene(colony) : { markup: '', css: '', doorCss: '' }
  parts.push(
    box(626, 506, 152, 304, '#3d261a'),
    box(630, 510, 144, 300, '#5e3d29'),
    box(642, 522, 120, 288, '#0b0910'),
    box(642, 522, 120, 12, '#15111f'),
    `<g id="door-${colony.seq}" class="${isLeaving ? 'door' : 'shut'}">${
      box(642, 522, 120, 288, '#7a4f38') +
      box(642, 522, 4, 288, '#8f6046') +
      box(758, 522, 4, 288, '#5e3d29') +
      box(658, 542, 88, 100, '#5e3d29') +
      box(662, 546, 80, 92, '#6a4330') +
      box(658, 686, 88, 104, '#5e3d29') +
      box(662, 690, 80, 96, '#6a4330') +
      box(732, 656, 20, 20, '#8a6a1c') +
      box(736, 660, 12, 12, '#e6b93c') +
      box(736, 660, 4, 4, '#fff1b0')
    }</g>`,
  )

  // prateleiras e nicho para o gato que pula
  parts.push(
    shelf(992, 640, 126),
    shelf(1132, 500, 126),
    shelf(800, 330, 126),
    shelf(1400, 250, 126),
    shelf(1000, 290, 110),
    shelf(300, 640, 126),
    box(1176, 228, 170, 122, '#3d261a'),
    box(1180, 232, 162, 114, '#8a5a3c'),
    box(1180, 232, 162, 4, '#b07a52'),
    box(1192, 244, 138, 90, '#2a1d19'),
    box(1192, 244, 138, 8, '#1c1310'),
    box(1192, 326, 138, 8, '#5e3d29'),
  )

  // caminhas
  parts.push(bed(BED_A), bed(BED_B))

  // arranhador: base, poste de corda, plataforma, bolinha pendurada
  parts.push(box(1274, 814, 182, 20, '#3d261a'), box(1278, 818, 174, 12, '#8a5a3c'), box(1278, 818, 174, 4, '#b07a52'))
  for (let y = 604; y < 818; y += 16) {
    parts.push(box(1350, y, 32, 8, '#d9c39a'), box(1350, y + 8, 32, 8, '#b89f72'), box(1350, y, 4, 16, '#efe0c0'), box(1378, y, 4, 16, '#9a8358'))
  }
  parts.push(
    box(1292, 584, 148, 24, '#3d261a'),
    box(1296, 588, 140, 16, '#8a5a3c'),
    box(1296, 588, 140, 4, '#b07a52'),
    box(1420, 608, 4, 44, '#d9c39a'),
    `<g class="ball">${box(1412, 652, 20, 20, '#c9566e') + box(1416, 648, 12, 28, '#c9566e') + box(1416, 656, 4, 4, '#f3a8b8')}</g>`,
  )

  // potes de comida e novelo
  parts.push(
    box(1150, 820, 44, 14, '#3a5f8a'),
    box(1154, 816, 36, 6, '#b5651f'),
    box(1150, 820, 44, 4, '#5a86b8'),
    box(1204, 820, 44, 14, '#3a5f8a'),
    box(1208, 816, 36, 6, '#7fb3d9'),
    box(1204, 820, 44, 4, '#5a86b8'),
    `<g class="${colony.count > YARN_CAT ? 'yarn' : 'still'}">${
      box(500, 812, 24, 24, '#6fbf7a') + box(496, 816, 32, 16, '#6fbf7a') + box(504, 820, 16, 4, '#3d7a47') + box(508, 828, 12, 4, '#3d7a47') + box(504, 812, 8, 4, '#a8e6b0')
    }</g>`,
    boxBack,
    boxFront,
    !isLampOn ? '' : `<g class="orbit">${at(
      992,
      214,
      `<g class="fa" style="animation-duration:0.5s">${box(-7, -4, 6, 7, '#e6dcc6') + box(1, -4, 6, 7, '#e6dcc6')}</g><g class="fb" opacity="0" style="animation-duration:0.5s">${
        box(-4, -1, 3, 4, '#e6dcc6') + box(1, -1, 3, 4, '#e6dcc6')
      }</g>${box(-1, -3, 2, 6, '#6a5a3a')}`,
    )}</g>`,
  )

  // sombras dos móveis, luminária e luar
  parts.push(
    shadow(BED_A + 102, 836, 118),
    shadow(BED_B + 102, 836, 118),
    shadow(1365, 836, 100),
    box(918, 0, 4, 150, '#14101f'),
    box(900, 150, 40, 8, '#a86a2a'),
    box(892, 158, 56, 12, '#c98a3c'),
    box(884, 170, 72, 10, '#e0a04a'),
    box(884, 170, 72, 3, '#f0b85c'),
    box(906, 180, 28, 8, isLampOn ? '#fff1b0' : '#8a7a5a'),
    isLampOn ? `<circle cx="920" cy="200" r="330" fill="url(#lamp)" class="glow"/>` : '',
    isOpen
      ? `<path d="M120 356H360L800 1000H330Z" fill="url(#beam)" class="glow"/>${[0, 1, 2, 3, 4, 5, 6]
          .map(i => box(250 + i * 58, 470 + ((i * 97) % 380), 3, 3, '#dfe6ff', ` class="mote" opacity="0.5" style="animation-delay:-${i * 2.3}s"`))
          .join('')}`
      : '',
  )

  // quem mora na cena agora; os que andam ficam por cima dos móveis
  const order = SLOTS.map((slot, index) => ({ slot, index })).filter(one => one.index < colony.count)
  parts.push(...order.filter(one => !isMover(one.slot)).map(one => resident(one.slot, one.index)))
  parts.push(...order.filter(one => isMover(one.slot)).map(one => resident(one.slot, one.index)))
  parts.push(exit.markup)
  // a luz do ambiente por cima de tudo
  parts.push(
    sky.phase === 'day'
      ? box(0, 0, W, H, '#fff5d6', ` opacity="${isOpen ? 0.12 : 0.05}"`)
      : sky.phase === 'night'
        ? ''
        : box(0, 0, W, H, isOpen ? '#ff9a5a' : '#8a8090', ' opacity="0.08"'),
  )

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset="0.6" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient><linearGradient id="dim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="0.4"/><stop offset="0.7" stop-color="#000000" stop-opacity="0"/></linearGradient><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${beam}" stop-opacity="0.2"/><stop offset="1" stop-color="${beam}" stop-opacity="0.03"/></linearGradient><radialGradient id="lamp"><stop offset="0" stop-color="#ffd08a" stop-opacity="0.34"/><stop offset="0.5" stop-color="#ffb86a" stop-opacity="0.1"/><stop offset="1" stop-color="#ffb86a" stop-opacity="0"/></radialGradient><pattern id="paper" width="48" height="48" patternUnits="userSpaceOnUse">${
    box(0, 0, 48, 48, '#241d36') + box(0, 0, 24, 48, '#272039') + box(21, 6, 6, 3, '#322a4b') + box(18, 9, 12, 3, '#322a4b') + box(15, 12, 18, 3, '#3a3157') + box(18, 15, 12, 3, '#322a4b') + box(21, 18, 6, 3, '#322a4b') + box(45, 30, 6, 3, '#2e2645') + box(0, 30, 3, 3, '#2e2645') + box(22, 36, 3, 3, '#3a3157')
  }</pattern><pattern id="panel" width="160" height="190" patternUnits="userSpaceOnUse">${
    box(0, 0, 160, 190, '#2b2442') + box(16, 28, 128, 4, '#3d3460') + box(16, 28, 4, 132, '#3d3460') + box(16, 156, 128, 4, '#1c172c') + box(140, 28, 4, 132, '#1c172c') + box(24, 36, 112, 116, '#2f2848') + box(24, 36, 112, 4, '#262040')
  }</pattern><pattern id="wood" width="220" height="80" patternUnits="userSpaceOnUse">${
    box(0, 0, 220, 80, '#3a2a24') + box(0, 0, 220, 4, '#261a16') + box(0, 4, 220, 3, '#4a372e') + box(0, 40, 220, 4, '#261a16') + box(0, 44, 220, 3, '#4a372e') + box(70, 4, 4, 36, '#261a16') + box(180, 44, 4, 36, '#261a16') + box(20, 18, 30, 3, '#31231e') + box(110, 26, 44, 3, '#43322a') + box(30, 60, 50, 3, '#43322a') + box(120, 66, 26, 3, '#31231e') + box(90, 12, 12, 3, '#43322a')
  }</pattern>${[...used.values()].join('')}</defs><style>
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
@keyframes cloud{0%{transform:translateX(-230px)}100%{transform:translateX(250px)}}
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
@keyframes pounce{0%,46%{transform:translate(0px,0px)}48%{transform:translate(0px,5px)}52%{transform:translate(12px,-20px)}56%{transform:translate(24px,-4px)}58%,74%{transform:translate(26px,0px)}80%{transform:translate(12px,-8px)}86%,100%{transform:translate(0px,0px)}}
@keyframes yarn{0%,56%{transform:translateX(0px)}64%{transform:translateX(84px)}70%{transform:translateX(100px)}100%{transform:translateX(0px)}}
@keyframes peek{0%,26%{transform:translateY(40px)}31%,56%{transform:translateY(0px)}61%,76%{transform:translateY(40px)}79%,87%{transform:translateY(14px)}90%,100%{transform:translateY(40px)}}
@keyframes orbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.pounce{animation:pounce 5s linear infinite}
.yarn{animation:yarn 5s linear infinite}
.peek{animation:peek 11s ease-in-out infinite}
.orbit{transform-origin:920px 214px;animation:orbit 12s linear infinite}${route.css}
@keyframes walk{0%{transform:translateX(${WALK_FROM}px)}6%{transform:translateX(${WALK_FROM}px)}46%{transform:translateX(${WALK_TO}px)}54%{transform:translateX(${WALK_TO}px)}94%{transform:translateX(${WALK_FROM}px)}100%{transform:translateX(${WALK_FROM}px)}}
@keyframes turn{0%{transform:scaleX(1)}50%{transform:scaleX(-1)}98%{transform:scaleX(1)}100%{transform:scaleX(1)}}${exit.doorCss}${exit.css}
</style>${parts.join('')}</svg>`
}
