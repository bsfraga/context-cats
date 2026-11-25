// O lápis da cena: retângulos, grupos e sprites. Cada pixel vale P unidades,
// e tudo na cena (gatos, móveis, porta, janela) é desenhado nessa mesma grade.

export const W = 1600
export const H = 1000
export const P = 4
// A cena tem abas de parede e chão dos dois lados do cômodo: numa janela mais
// larga que 16 por 10 o desenho mostra as abas em vez de cortar o chão.
export const LEFT = -400
export const WIDE = W + 800

export type Palette = Record<string, string>

// Um retângulo, escrito como caminho: é a forma mais curta, e a cena tem centenas.
export const box = (x: number, y: number, w: number, h: number, fill: string, extra = '') => `<path d="M${x} ${y}h${w}v${h}H${x}z" fill="${fill}"${extra}/>`

export const at = (x: number, y: number, inner: string, attrs = '') => `<g transform="translate(${x} ${y})"${attrs}>${inner}</g>`

// O estilo do desenho em curso. Em 16 bits cada letra do sprite é um pixel de P
// unidades. Em 32 bits o sprite é ampliado ao dobro com suavização de quinas
// (EPX) e ganha um tom de luz e um de sombra junto às bordas, em pixels de P/2.
export type Bits = 16 | 32

let bits: Bits = 16

export const setBits = (next: Bits): void => {
  bits = next
}

export const isFine = (): boolean => bits === 32

const cell = (rows: string[], r: number, c: number): string => rows[r]?.[c] ?? '.'

const doubled = (rows: string[]): string[] => {
  const width = Math.max(...rows.map(row => row.length))
  const out: string[] = []

  rows.forEach((_, r) => {
    let top = ''
    let low = ''

    for (let c = 0; c < width; c++) {
      const p = cell(rows, r, c)
      const a = cell(rows, r - 1, c)
      const b = cell(rows, r, c + 1)
      const l = cell(rows, r, c - 1)
      const d = cell(rows, r + 1, c)
      top += (l === a && l !== d && a !== b ? a : p) + (a === b && a !== l && b !== d ? b : p)
      low += (d === l && d !== b && l !== a ? l : p) + (b === d && b !== a && d !== l ? d : p)
    }
    out.push(top, low)
  })

  return out
}

// Os trechos de uma grade, cor por cor, como dados de caminho. Em traço, cada
// trecho é uma linha de um pixel de altura; em preenchimento, trechos iguais em
// linhas seguidas viram um retângulo só. Cada trecho começa em relação ao
// anterior: números menores, desenho mais curto.
type Run = { fill: string; c: number; w: number; r: number }

const trace = (height: number, width: number, colorAt: (r: number, c: number) => string | undefined, isFilled: boolean): Map<string, string> => {
  const paths = new Map<string, string>()
  const pens = new Map<string, { x: number; y: number }>()
  const open = new Map<string, Run>()
  const close = (run: Run, until: number) => {
    const pen = pens.get(run.fill)
    const dy = run.r - (pen?.y ?? 0)
    const move = pen === undefined ? `M${run.c} ${run.r}${isFilled ? '' : '.5'}` : `m${run.c - pen.x}${dy < 0 ? '' : ' '}${dy}`

    // o retângulo fica sem fechar (o preenchimento fecha sozinho) e a pena para no canto de baixo; o traço a deixa no fim
    paths.set(run.fill, `${paths.get(run.fill) ?? ''}${move}h${run.w}${isFilled ? `v${until - run.r}h-${run.w}` : ''}`)
    pens.set(run.fill, isFilled ? { x: run.c, y: until } : { x: run.c + run.w, y: run.r })
  }

  for (let r = 0; r <= height; r++) {
    const seen = new Set<string>()
    let c = 0

    while (r < height && c < width) {
      const fill = colorAt(r, c)
      let end = c + 1

      while (end < width && colorAt(r, end) === fill) {
        end++
      }
      if (fill !== undefined) {
        const key = `${fill}|${c}|${end - c}`
        seen.add(key)

        if (!isFilled) {
          close({ fill, c, w: end - c, r }, r + 1)
        } else if (!open.has(key)) {
          open.set(key, { fill, c, w: end - c, r })
        }
      }
      c = end
    }
    for (const [key, run] of open) {
      if (!seen.has(key)) {
        close(run, r)
        open.delete(key)
      }
    }
  }

  return paths
}

const DARK = '#000000" fill-opacity="0.3'
const LIGHT = '#ffffff" fill-opacity="0.3'
const SHADE = '#000000" fill-opacity="0.14'

// Uma cor a caminho de outra: `t` de 0 (a primeira) a 1 (a segunda).
const blend = (from: string, to: string, t: number): string => {
  if (from.length !== 7 || to.length !== 7) {
    return from
  }
  const a = parseInt(from.slice(1), 16)
  const b = parseInt(to.slice(1), 16)
  const part = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t)

  return `#${((1 << 24) | (part(16) << 16) | (part(8) << 8) | part(0)).toString(16).slice(1)}`
}
const isEdge = (ch: string): boolean => ch === '.' || ch === 'O'
const tags = (paths: Map<string, string>, paint: (key: string) => string): string => [...paths].map(([key, d]) => `<path ${paint(key)} d="${d}"/>`).join('')

// Um sprite a partir de linhas de texto: cada letra é uma cor, ponto é vazio.
// Cada sprite é desenhado uma vez, em defs, e reusado por referência: a cena
// repete os mesmos gatos muitas vezes e o desenho inteiro tem limite de tamanho.
const ids = new Map<string, string>()
const used = new Map<string, string>()
// Em 32 bits a forma é uma só para todas as pelagens: cada letra pinta com uma
// variável de cor, e quem usa o sprite traz a classe da sua paleta.
const coats = new Map<string, string>()
const worn = new Map<string, string>()
const letters = new Set<string>()

const idOf = (key: string): string => {
  const id = ids.get(key) ?? `s${ids.size}`
  ids.set(key, id)

  return id
}

export const sprite = (rows: string[], palette: Palette): string => {
  const width = Math.max(...rows.map(row => row.length))

  if (!isFine()) {
    const id = idOf(`16|${rows.join('/')}|${Object.entries(palette).join()}`)

    if (!used.has(id)) {
      used.set(id, `<g id="${id}" transform="scale(${P})">${tags(trace(rows.length, width, (r, c) => palette[cell(rows, r, c)], false), fill => `stroke="${fill}"`)}</g>`)
    }

    return `<use href="#${id}"/>`
  }
  const drawn = [...new Set(rows.join(''))].filter(ch => palette[ch] !== undefined).sort()
  const id = idOf(`32|${rows.join('/')}|${drawn.join('')}`)
  // o contorno deixa de ser quase preto e puxa para a cor do corpo
  const body = palette.B
  const look = Object.entries(palette)
    .map(([ch, fill]) => `--${ch}:${ch === 'O' && body !== undefined ? blend(fill, body, 0.42) : fill}`)
    .join(';')
  const coat = coats.get(look) ?? `kq${coats.size}`
  coats.set(look, coat)
  worn.set(coat, look)

  if (!used.has(id)) {
    // O grosso do sprite continua em pixels inteiros. Só os pixels que a
    // suavização de quinas mexeu são refeitos em meios pixels, por cima; e a
    // luz e a sombra das bordas são véus de branco e de preto.
    const fine = doubled(rows)
    const letterAt = (grid: string[], r: number, c: number): string | undefined => {
      const ch = cell(grid, r, c)

      return drawn.includes(ch) ? ch : undefined
    }
    const isWhole = (r: number, c: number): boolean => {
      const ch = cell(rows, r, c)

      return cell(fine, 2 * r, 2 * c) === ch && cell(fine, 2 * r, 2 * c + 1) === ch && cell(fine, 2 * r + 1, 2 * c) === ch && cell(fine, 2 * r + 1, 2 * c + 1) === ch
    }
    // Num sprite grande a faixa de luz e a de sombra têm um pixel inteiro de
    // largura, e o terço de baixo escurece: é o que dá volume ao gato de longe.
    const reach = rows.length >= 10 ? 2 : 1
    const low = rows.length >= 10 ? Math.round(fine.length * 0.62) : fine.length
    const nearEdge = (r: number, c: number, dr: number, dc: number): boolean => isEdge(cell(fine, r + dr, c + dc)) || (reach === 2 && isEdge(cell(fine, r + 2 * dr, c + 2 * dc)))
    const veil = (r: number, c: number): string | undefined => {
      const ch = letterAt(fine, r, c)

      if (ch === undefined || ch === 'O') {
        return undefined
      }

      return nearEdge(r, c, 1, 0) || nearEdge(r, c, 0, 1) ? DARK : nearEdge(r, c, -1, 0) || nearEdge(r, c, 0, -1) ? LIGHT : r >= low ? SHADE : undefined
    }
    const pen = (ch: string) => {
      letters.add(ch)

      return `class="ks${ch}"`
    }
    const whole = tags(trace(rows.length, width, (r, c) => (isWhole(r, c) ? letterAt(rows, r, c) : undefined), false), pen)
    const mended = tags(trace(fine.length, 2 * width, (r, c) => (isWhole(r >> 1, c >> 1) ? undefined : letterAt(fine, r, c)), false), pen)

    used.set(
      id,
      `<g id="${id}"><g transform="scale(${P})">${whole}</g><g transform="scale(${P / 2})">${mended}${tags(trace(fine.length, 2 * width, veil, true), fill => `fill="${fill}"`)}</g></g>`,
    )
  }

  return `<use href="#${id}" class="${coat}"/>`
}

/** Começa um desenho novo: nenhum sprite emitido ainda. */
export const resetSprites = (): void => {
  used.clear()
  worn.clear()
  letters.clear()
}

/** Os sprites que o desenho atual usou, para o bloco defs. */
export const spriteDefs = (): string => [...used.values()].join('')

/** As regras de cor dos sprites de 32 bits do desenho atual: uma por letra e uma por paleta. */
export const spriteCss = (): string => [...letters].map(ch => `.ks${ch}{stroke:var(--${ch})}`).join('') + [...worn].map(([coat, look]) => `.${coat}{${look}}`).join('')
