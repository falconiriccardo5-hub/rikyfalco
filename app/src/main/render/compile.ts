// Adattatore Node per il compilatore condiviso: scrive grafo e sottotitoli
// nella cartella del job, da cui viene eseguito FFmpeg.

import fs from 'fs'
import path from 'path'
import { buildRender, type CompileInput, type Compiled } from '../../shared/render/graph'

export type { CompileMode, Compiled, RenderSettings } from '../../shared/render/graph'
export { mapCues } from '../../shared/render/graph'

export function compile(input: Omit<CompileInput, 'exists'> & { dir: string }): Compiled {
  const c = buildRender({ ...input, exists: (p) => fs.existsSync(p) })
  for (const f of c.files) fs.writeFileSync(path.join(input.dir, f.name), f.content, 'utf8')
  return c
}
