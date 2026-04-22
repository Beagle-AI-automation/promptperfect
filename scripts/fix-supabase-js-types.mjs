/**
 * @supabase/supabase-js declares `exports["."].import.types` as `./dist/index.d.mts`
 * but npm package may ship without that file (only `index.d.cts`). TS `moduleResolution: "bundler"`
 * then fails (TS7016). Copying the CTS definition to the expected MTS path fixes resolution.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(
  __dirname,
  '..',
  'node_modules',
  '@supabase',
  'supabase-js',
  'dist',
)
const from = path.join(dist, 'index.d.cts')
const to = path.join(dist, 'index.d.mts')

if (!fs.existsSync(from)) {
  console.warn('[fix-supabase-js-types] skip: not found', from)
  process.exit(0)
}
if (fs.existsSync(to)) {
  process.exit(0)
}
fs.copyFileSync(from, to)
console.log('[fix-supabase-js-types] wrote', to)
