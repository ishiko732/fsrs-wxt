# FSRS Parameter Optimizer

A browser extension built with WXT + React for importing local Anki `revlog.csv` files and computing FSRS parameters with a WASM-based optimizer.

The current implementation runs training inside a dedicated worker so the popup UI stays responsive. It also supports timezone selection, `next day starts at`, and `relearning steps` configuration.

## Features

- Import Anki review-log CSV files via drag and drop or file picker
- Validate file type and size locally, with a current limit of 100MB
- Parse review logs using the selected timezone
- Output both `Short-Term Enabled` and `Short-Term Disabled` parameter sets
- Show parse time, item count, training progress, and final results during execution
- Include custom extension icon assets under `public/icon/`

## Tech Stack

- WXT
- React 19
- TypeScript
- Tailwind CSS 4
- Comlink
- `@open-spaced-repetition/binding` + WASI/WASM

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

These scripts follow the standard WXT package setup. Static assets under `public/` are copied directly into the build output.

## Usage

1. Export `revlog.csv` from Anki.
2. Open the extension popup.
3. Upload the CSV file.
4. Configure the timezone, `Next Day Starts At`, and `Relearning Steps`.
5. Click `Optimize Parameters`.
6. Review the two generated FSRS parameter sets.

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
├── lib/timezone.ts         # Timezone validation and offset helpers
├── public/icon/            # Extension icon assets
└── wxt.config.ts           # WXT, manifest, and Vite configuration
```

## Implementation Notes

### Training Flow

- The popup calls `training.worker.ts` through Comlink.
- The worker reuses the optimizer singleton exported by `lib/optimizer.ts` to avoid repeated WASM initialization.
- Training is intentionally sequential to avoid WASM memory issues caused by parallel execution.

### Timezone Handling

- `lib/timezone.ts` computes timezone offsets with `Intl`.
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
