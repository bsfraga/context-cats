/** Quantos gatos moram na cena, quantos estão saindo agora, e qual saída é esta. */
export type Colony = { count: number; leaving: number; seq: number }

export type Phase = 'night' | 'dawn' | 'day' | 'dusk'
export type Weather = 'clear' | 'partly' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog'
export type Feast = 'none' | 'newyear' | 'carnival' | 'valentine' | 'easter' | 'junina' | 'halloween' | 'christmas'

/** A fase do dia e o clima que a janela e a luz da cena mostram, e a festa que enfeita o cômodo. */
export type Sky = { phase: Phase; weather: Weather; feast: Feast }

/** O estilo do desenho: pixels de 16 bits, ou os de 32, mais finos e sombreados. */
export type Style = { bits: 16 | 32 }

declare module 'claude-code' {
  interface PluginState {
    'context-cats': { colony: Shaped<Colony>; sky: Shaped<Sky>; style: Shaped<Style> }
  }
}
