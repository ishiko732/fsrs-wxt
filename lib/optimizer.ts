import { initOptimizer } from '@open-spaced-repetition/binding/dynamic-wasi'
import wasmUrl from '@open-spaced-repetition/binding-wasm32-wasi/wasm?url'
import WasiWorker from '@open-spaced-repetition/binding-wasm32-wasi/wasi-worker?worker'

let optimizerPromise: ReturnType<typeof initOptimizer> | null = null

export function getOptimizer() {
  if (!optimizerPromise) {
    optimizerPromise = initOptimizer({
      wasm: wasmUrl,
      worker: () => new WasiWorker(),
    })
  }

  return optimizerPromise
}
