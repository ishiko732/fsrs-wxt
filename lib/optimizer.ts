import type { WasiBinding } from '@open-spaced-repetition/binding-wasm32-wasip1/workerd'
import wasmUrl from '@open-spaced-repetition/binding-wasm32-wasip1/wasm.wasm?url'

let optimizerPromise: Promise<WasiBinding> | null = null

// Threadless wasm32-wasip1 binding instantiated in the calling (training) worker.
// The loader is imported lazily so Comlink.expose registers before it evaluates.
export function getOptimizer() {
  if (!optimizerPromise) {
    optimizerPromise = import(
      '@open-spaced-repetition/binding-wasm32-wasip1/workerd'
    ).then(({ instantiate }) =>
      instantiate(WebAssembly.compileStreaming(fetch(wasmUrl)))
    )
  }

  return optimizerPromise
}
