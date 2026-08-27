/**
 * Empaqueta la app de escritorio para Windows (NSIS + AppX de Microsoft Store).
 *
 * Existe por una sola razón: **el `makeappx.exe` que trae electron-builder no
 * arranca en Windows moderno** — muere con «la configuración en paralelo no es
 * correcta» (error SxS), y electron-builder lo reporta como un críptico
 * `spawn UNKNOWN`. Aquí se localiza el `makeappx.exe` del SDK de Windows de
 * verdad y se le pasa por `ELECTRON_BUILDER_WINDOWS_KITS_PATH`.
 *
 * Ojo: esa variable hace que electron-builder busque TAMBIÉN ahí los mosaicos
 * por defecto del .appx. Por eso `icono-escritorio.mjs` genera los cuatro en
 * `electron/build/appx/`: al estar todos, el fallback al SDK nunca se usa.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const BIN = 'C:/Program Files (x86)/Windows Kits/10/bin'

/** El x64 del SDK más reciente instalado, o null si no hay ninguno. */
function kitDeWindows() {
  if (!existsSync(BIN)) return null
  const versiones = readdirSync(BIN)
    .filter((v) => /^\d+\./.test(v))
    .sort()
    .reverse()
  for (const v of versiones) {
    const dir = path.join(BIN, v, 'x64')
    if (existsSync(path.join(dir, 'makeappx.exe'))) return dir
  }
  return null
}

const kit = kitDeWindows()
if (!kit) {
  console.error(
    'Falta el SDK de Windows (makeappx.exe), necesario para el paquete de Microsoft Store.\n' +
      'Instálalo con:  winget install --id Microsoft.WindowsSDK.10.0.26100',
  )
  process.exit(1)
}
console.log(`makeappx del SDK: ${kit}`)

const r = spawnSync('npx', ['electron-builder', '--win', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ELECTRON_BUILDER_WINDOWS_KITS_PATH: kit },
})
process.exit(r.status ?? 1)
