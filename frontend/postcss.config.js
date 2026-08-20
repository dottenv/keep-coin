import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const configPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'tailwind.config.js',
)

export default {
  plugins: {
    tailwindcss: { config: configPath },
    autoprefixer: {},
  },
}