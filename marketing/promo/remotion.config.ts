import { Config } from '@remotion/cli/config'

// Configuración del CLI (Studio y `remotion render`); `render-todos.mjs` pasa
// lo mismo de forma explícita por la API de Node.
Config.setEntryPoint('src/index.ts')
Config.setPublicDir('public')
Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
Config.setCodec('h264')
Config.setCrf(18)
Config.setConcurrency(6)
