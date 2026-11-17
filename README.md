# FSRS Parameter Optimizer

A browser extension built with WXT + React for importing local Anki `revlog.csv` files and computing FSRS parameters with a WASM-based optimizer.

The current implementation runs training inside a dedicated worker so the popup UI stays responsive. It also supports FSRS-6/FSRS-7 model selection, timezone selection, `next day starts at`, and `relearning steps` configuration.

## Features

- Import Anki review-log CSV files via drag and drop or file picker
- Validate file type and size locally, with a current limit of 100MB
- Parse review logs using the selected timezone
- Choose the model to train: `FSRS-6` (default, 21 weights) or `FSRS-7` (34 weights)
- Output a paired comparison per model: FSRS-6 trains `Short-Term Enabled` and `Short-Term Disabled`; FSRS-7 keeps short-term enabled and trains `Sched Penalties Enabled` and `Sched Penalties Disabled`
- Show parse time, item count, training progress, and final results during execution
- Include custom extension icon assets under `public/icon/`

## Tech Stack

- WXT
- React 19
- TypeScript
- Tailwind CSS 4
- Comlink
- `@open-spaced-repetition/binding-wasm32-wasip1` (threadless WASI/WASM)

## Getting Started

```bash
pnpm install
pnpm dev
```

Common commands:

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Chrome development mode |
| `pnpm dev:firefox` | Start Firefox development mode |
| `pnpm compile` | Run TypeScript type checking |
| `pnpm build` | Build the Chrome extension |
| `pnpm build:firefox` | Build the Firefox extension |
| `pnpm zip` | Package the Chrome extension as a zip |
| `pnpm zip:firefox` | Package the Firefox extension as a zip |
| `node scripts/smoke.mjs` | Train a synthetic CSV with the WASM binding in Node, for both models and both options per model |
| `node scripts/browser-smoke.mjs` | Train a synthetic CSV with FSRS-6, FSRS-7, then FSRS-6 in the built Chromium extension (needs an existing Playwright install; see the script header) |

These scripts follow the standard WXT package setup. Static assets under `public/` are copied directly into the build output.

## Usage

1. Export `revlog.csv` from Anki.
2. Open the extension popup (or use the top-right `Open in standalone window` button to keep the window open across file dialogs and app switches).
3. Upload the CSV file.
4. Choose the model, then configure the timezone, `Next Day Starts At`, and `Relearning Steps`.
5. Click `Optimize Parameters`.
6. Review the two generated FSRS parameter sets. Each result keeps the model and option it was trained with, even if the model selector changes afterwards.

If you only want to verify the flow quickly, you can use the sample CSV link provided in the UI.

## Project Structure

```text
.
├── assets/                 # Inline SVG assets used by the popup
├── entrypoints/popup/      # Popup entry files and styles
├── components/             # UI components for upload, config, and results
├── hooks/useTraining.ts    # Popup-side training orchestration
├── workers/training.worker.ts
├── lib/optimizer.ts        # Shared WASM optimizer singleton
├── lib/timezone.ts         # Timezone list and validation
├── scripts/                # Smoke tests with a synthetic CSV
├── public/icon/            # Extension icon assets
└── wxt.config.ts           # WXT, manifest, and Vite configuration
```

## Implementation Notes

### Training Flow

- The popup calls `training.worker.ts` through Comlink.
- The worker reuses the optimizer singleton exported by `lib/optimizer.ts` to avoid repeated WASM initialization.
- The threadless `wasm32-wasip1` binding runs on the training worker itself, without nested WASI workers, `SharedArrayBuffer`, or COOP/COEP headers. Both parameter sets are trained sequentially on that worker.
- CSV conversion and training use the same selected `modelVersion`. FSRS-6 returns 21 weights per set and FSRS-7 returns 34.
- FSRS-6 compares `enableShortTerm: true/false`. FSRS-7 keeps `enableShortTerm: true` and compares `enableSchedPenalties: true/false`; the penalties only change the FSRS-7 training loss, not the scheduling formulas.

### Timezone Handling

- The binding resolves IANA timezone offsets per review, including daylight saving transitions.
- The supported timezone list comes from `Intl.supportedValuesOf('timeZone')`.
- Timezones are validated before training starts.

### Static Assets

- Popup header icon source: `assets/popup-icon.svg`
- Flat extension icon source: `public/icon/icon.svg`
- Generated PNG sizes: `public/icon/16.png`, `32.png`, `48.png`, `96.png`, `128.png`

## Notes

- The extension currently expects a standard CSV input file with a `.csv` filename.
- Training runs entirely inside the local extension environment and does not require a backend service.
- `wxt.config.ts` includes `wasm-unsafe-eval` in the CSP so the WASM optimizer can run correctly.
