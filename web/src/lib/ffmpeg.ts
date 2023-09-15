import { FFmpeg } from '@ffmpeg/ffmpeg'

import coreURL from '../ffmpeg/ffmpeg-core.js?url'
import wasmURL from '../ffmpeg/ffmpeg-core.wasm?url'
import workerURL from '../ffmpeg/ffmpeg-worker.js?url'

// Só vai carregar no momento em que for utilizar ela
let ffmpeg: FFmpeg | null

/* Cria apenas uma instância do ffmpeg */
export async function getFFmpeg() {
  if (ffmpeg) {
    return ffmpeg
  }

  ffmpeg = new FFmpeg()

  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL, 
      wasmURL, 
      workerURL,
    })
  }

  return ffmpeg
}