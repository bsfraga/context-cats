/** Quantos gatos moram na cena, quantos estão saindo agora, e qual saída é esta. */
export type Colony = { count: number; leaving: number; seq: number }

export type Phase = 'night' | 'dawn' | 'day' | 'dusk'
export type Weather = 'clear' | 'partly' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog'

/** A fase do dia e o clima que a janela e a luz da cena mostram. */
export type Sky = { phase: Phase; weather: Weather }

declare module 'claude-code' {
  interface PluginState {
    'context-cats': { colony: Shaped<Colony>; sky: Shaped<Sky> }
  }
}
