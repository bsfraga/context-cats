import type { ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

// Um cômodo à noite: roxo quente com laranja.
const { theme, problems } = makeColors({
  label: 'Gatos',
  only: 'dark',
  roles: { accent: '#e08a3c', danger: '#e0605a', success: '#7fbf7a', warning: '#e6b93c', pro: '#b58ae0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1c1729',
        'surface-1': '#211b30',
        'surface-2': '#262037',
        'surface-3': '#2a243c',
        'text-primary': '#efe6da',
        'text-secondary': '#c9bfcf',
        'text-muted': '#a39aae',
      },
    },
  },
})

const plain: ThemeSetArgs = { colors: theme, backdrop: { scene: 'gatos', glass: { blur: 2, tint: '#1c1729', opacity: 0.55 } } }
const look: ThemeSetArgs = {
  ...plain,
  style: {
    Heading: { fontFamily: ['mono'], fontWeight: 'bold' },
    ToolUse: { fontFamily: ['mono'] },
  },
}

/** O tema: completo, e sem as fontes para um build que não aceita `style`. */
export const LOOK = { look, plain, problems }
