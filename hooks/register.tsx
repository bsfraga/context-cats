import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { LOOK } from './looks.js'
import { catsFor, exitSeconds, gatos, MAX_CATS } from './cats.js'
import { FEAST_NAMES } from './festas.js'
import { computeSky, describe, INITIAL_SKY, PHASE_NAMES, POLL_MAX, POLL_MIN, pollLine, WEATHER_NAMES } from './sky.js'

const sky = atom({ plugin: 'context-cats', key: 'sky' } as const, INITIAL_SKY, { shape: 'sky-2' })

// Acerta o céu da cena dos gatos, e só redesenha quando ele muda.
const refreshSky = async ($: EngineInterface, isForced = false) => {
  const was = await read($, sky)
  const answer = await computeSky($, was, isForced)

  if (was.phase !== answer.now.phase || was.weather !== answer.now.weather || was.feast !== answer.now.feast) {
    await update($, sky, () => answer.now)
  }

  return answer
}

const style = atom({ plugin: 'context-cats', key: 'style' } as const, { bits: 16 as 16 | 32 }, { shape: 'style-1' })

// O estilo escolhido fica guardado e vale para todas as sessões.
const loadStyle = async ($: EngineInterface): Promise<void> => {
  const bits = (await $.store.get('bits')) === 32 ? 32 : 16

  if ((await read($, style)).bits !== bits) {
    await update($, style, () => ({ bits }))
  }
}

const colony = atom({ plugin: 'context-cats', key: 'colony' } as const, { count: 1, leaving: 0, seq: 0 }, { shape: 'colony-1' })

// Leva a cena a `target` gatos: mais gatos só aparecem; menos gatos saem pela porta.
const resize = async ($: EngineInterface, target: number): Promise<string> => {
  const now = await read($, colony)

  if (target === now.count) {
    return `Continuam ${now.count} gatos.`
  }
  if (target > now.count) {
    await update($, colony, was => ({ ...was, count: target, leaving: 0 }))

    return `Agora são ${target} gatos.`
  }
  const seq = now.seq + 1
  const leaving = now.count - target
  await update($, colony, () => ({ count: target, leaving, seq }))
  // Depois da saída, a porta volta a ficar só fechada.
  $.clock.after(Math.ceil(exitSeconds({ count: target, leaving, seq }) * 1000) + 500, () => {
    void update($, colony, was => (was.seq === seq ? { ...was, leaving: 0 } : was))
  })

  return `${leaving} ${leaving === 1 ? 'gato saiu' : 'gatos saíram'} pela porta; ficam ${target}.`
}

const MANUAL = 'manual'

// Uma contagem pedida com /gatos N fica até /gatos auto e não segue o contexto.
const manual = async ($: EngineInterface): Promise<number | undefined> => {
  const held = await $.store.get(MANUAL)

  return typeof held === 'number' && Number.isInteger(held) && held >= 1 && held <= MAX_CATS ? held : undefined
}

// O teste da porta: enche a casa e, oito segundos depois, manda oito gatos embora.
const demo = async ($: EngineInterface): Promise<string> => {
  await $.store.set(MANUAL, MAX_CATS)
  await resize($, MAX_CATS)
  $.clock.after(8000, () => {
    void $.store
      .set(MANUAL, 4)
      .then(() => resize($, 4))
      .catch(error => $.ui.log(String(error)))
  })

  return `Casa cheia com ${MAX_CATS} gatos; em 8 segundos, 8 saem pela porta e ficam 4.`
}

const follow = async ($: EngineInterface): Promise<void> => {
  const held = await manual($)

  if (held !== undefined) {
    await resize($, held)

    return
  }
  const { context } = await $.session.usage()

  if (context.percent !== undefined) {
    await resize($, catsFor(context.percent))
  }
}

// Pinta o tema: as cores, o fundo e as fontes.
const apply = async ($: EngineInterface): Promise<void> => {
  const unpainted = LOOK.problems.find(line => line.startsWith("Desktop won't paint"))

  if (unpainted !== undefined) {
    $.ui.toast(unpainted)
  }
  try {
    await $.theme.set(LOOK.look)
  } catch (error) {
    // Um build sem `style`: fica só com as cores e o fundo.
    $.ui.log(String(error))
    await $.theme.set(LOOK.plain)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'gatos',
      description: 'Gatos na cena: um número de 1 a 12 fixa a quantidade, auto solta; clima, intervalo, cidade e ceu cuidam da janela; festa escolhe o enfeite e estilo, 16 ou 32 bits',
      argumentHint: '[1-12|auto|teste|estilo|clima|intervalo|cidade|ceu|festa|fuso]',
    })
    await loadStyle($).catch(error => $.ui.log(String(error)))
    await apply($)
    // Um teste pedido de fora da sessão roda uma vez, quando o mod carrega.
    if ((await $.store.get('demo')) === true) {
      await $.store.delete('demo')
      await demo($).catch(error => $.ui.log(String(error)))
    } else {
      await follow($).catch(error => $.ui.log(String(error)))
    }
    // A sondagem do céu: a cada minuto confere a fase do dia e a festa, e lê o
    // clima quando a última leitura passou do intervalo (ou uma falha pede nova tentativa).
    const tick = () => {
      void refreshSky($)
        .then(({ problem }) => (problem === undefined ? undefined : $.ui.log(problem)))
        .catch(error => $.ui.log(String(error)))
    }
    tick()
    $.clock.every(60 * 1000, tick)

    return next(e)
  })

  on('command.run', { command: 'gatos' }, async ($, e) => {
    const asked = e.args.trim()

    if (asked === '') {
      const { context } = await $.session.usage()
      const now = await read($, colony)

      const mode = (await manual($)) === undefined ? 'seguindo o contexto' : 'contagem manual, /gatos auto para soltar'

      return { text: `${now.count} de ${MAX_CATS} gatos (${mode}); contexto em ${context.percent ?? 0}%.` }
    }
    const [verb = '', ...rest] = asked.toLowerCase().split(/\s+/)

    if (verb === 'teste') {
      return { text: await demo($) }
    }
    if (verb === 'estilo') {
      const bits = Number(rest[0])

      if (bits !== 16 && bits !== 32) {
        return { text: `Estilo atual: ${(await read($, style)).bits} bits. Use /gatos estilo 16 ou /gatos estilo 32.` }
      }
      await $.store.set('bits', bits)
      await loadStyle($)

      return { text: `Estilo: ${bits} bits.` }
    }
    if (verb === 'fuso') {
      const minutes = Number(rest[0])

      if (rest[0] === undefined || !Number.isInteger(minutes) || Math.abs(minutes) > 840) {
        return { text: 'Use /gatos fuso <minutos em relação a UTC>, por exemplo -180 para Brasília ou 60 para Lisboa no verão.' }
      }
      await $.store.set('tz', minutes)

      return { text: `Fuso guardado. Céu: ${describe((await refreshSky($, true)).now)}.` }
    }
    if (verb === 'clima') {
      const { now, problem } = await refreshSky($, true)
      const held = (await $.store.get('skyHold')) === undefined ? '' : ' (céu fixado, /gatos ceu auto para soltar)'

      return { text: `Céu: ${describe(now)}${held}. ${await pollLine($)}${problem === undefined ? '' : ` A leitura de agora falhou: ${problem}`}` }
    }
    if (verb === 'intervalo') {
      const minutes = Number(rest[0])

      if (rest[0] === 'auto') {
        await $.store.delete('poll')
      } else if (!Number.isInteger(minutes) || minutes < POLL_MIN || minutes > POLL_MAX) {
        return { text: `Use /gatos intervalo <${POLL_MIN}-${POLL_MAX} minutos>, ou /gatos intervalo auto para voltar a 10.` }
      } else {
        await $.store.set('poll', minutes)
      }
      await refreshSky($)

      return { text: await pollLine($) }
    }
    if (verb === 'festa') {
      const feast = FEAST_NAMES[rest[0] ?? '']

      if (rest[0] === 'auto') {
        await $.store.delete('feastHold')
      } else if (feast === undefined) {
        return { text: `Use /gatos festa <${Object.keys(FEAST_NAMES).join('|')}>, ou /gatos festa auto para seguir o calendário.` }
      } else {
        await $.store.set('feastHold', feast)
      }
      const { now } = await refreshSky($)

      return { text: now.feast === 'none' ? 'Sem enfeite de festa agora.' : `Céu: ${describe(now)}.` }
    }
    if (verb === 'cidade') {
      const city = asked.slice(verb.length).trim()

      if (city === '' || city.toLowerCase() === 'auto') {
        await $.store.delete('city')
      } else {
        await $.store.set('city', city)
      }
      const { now, problem } = await refreshSky($, true)

      return { text: problem === undefined ? `Céu: ${describe(now)}.` : `Cidade guardada, mas o clima não veio: ${problem}` }
    }
    if (verb === 'ceu' || verb === 'céu') {
      const phase = PHASE_NAMES[rest[0] ?? '']
      const weather = WEATHER_NAMES[rest[1] ?? 'limpo']

      if (rest[0] === 'auto') {
        await $.store.delete('skyHold')
      } else if (phase === undefined || weather === undefined) {
        return { text: `Use /gatos ceu <${Object.keys(PHASE_NAMES).join('|')}> <${Object.keys(WEATHER_NAMES).join('|')}>, ou /gatos ceu auto.` }
      } else {
        await $.store.set('skyHold', { phase, weather })
      }

      return { text: `Céu: ${describe((await refreshSky($, true)).now)}.` }
    }
    if (asked.toLowerCase() === 'auto') {
      await $.store.delete(MANUAL)
      await follow($)

      return { text: `Voltou a seguir o contexto: ${(await read($, colony)).count} gatos.` }
    }
    const target = Number(asked)

    if (!Number.isInteger(target) || target < 1 || target > MAX_CATS) {
      return { text: `Use um número de 1 a ${MAX_CATS}, ou auto.` }
    }
    await $.store.set(MANUAL, target)

    return { text: `${await resize($, target)} A contagem fica manual até /gatos auto.` }
  })

  // O contexto cresce a cada turno: a cena acompanha quando o turno principal termina.
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)

    if (e.agentId === undefined) {
      await follow($).catch(error => $.ui.log(String(error)))
    }

    return done
  })

  // Uma compactação esvazia o contexto antes da próxima medida: metade sai já.
  on('session.compact', async ($, e, next) => {
    const done = await next(e)

    if (e.agentId === undefined && e.trigger !== 'precompute' && !('skip' in done) && (await manual($).catch(() => undefined)) === undefined) {
      await read($, colony)
        .then(now => resize($, Math.max(1, Math.ceil(now.count / 2))))
        .catch(error => $.ui.log(String(error)))
    }

    return done
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    if (e.props.plugin !== 'context-cats' || e.props.scene !== 'gatos') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const now = await read($, colony)

    return <Svg source={gatos(now, await read($, sky), (await read($, style)).bits)} alt={`Um cômodo em pixel art com ${now.count} ${now.count === 1 ? 'gato' : 'gatos'}`} isInteractive />
  })
}
