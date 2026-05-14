import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'FSRS Parameter Optimizer',
    short_name: 'FSRS Optimizer',
    description:
      'Optimize FSRS parameters from local Anki review logs. All processing runs locally in your browser.',
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build:{
      minify: false,
    },
    worker: {
      format: 'es',
    },
  }),
});
