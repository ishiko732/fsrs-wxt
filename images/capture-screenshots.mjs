/**
 * Capture screenshot HTML files as 1280x800 PNG images.
 * Usage: node images/capture-screenshots.mjs
 * Requires: npx playwright or puppeteer (uses puppeteer-core with system Chrome)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = [
  'screenshot-1-hero.html',
  'screenshot-2-workflow.html',
  'screenshot-3-features.html',
];

async function captureWithPuppeteer() {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({ headless: true });

  for (const file of files) {
    const htmlPath = resolve(__dirname, file);
    const outputPath = htmlPath.replace('.html', '.png');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: outputPath, type: 'png' });
    await page.close();
    console.log(`Saved: ${outputPath}`);
  }

  await browser.close();
}

captureWithPuppeteer().catch((err) => {
  console.error('Puppeteer failed:', err.message);
  console.log('\nAlternative: Open each HTML file in Chrome with window size 1280x800 and take screenshots manually.');
  console.log('Files:');
  files.forEach(f => console.log(`  file://${resolve(__dirname, f)}`));
  process.exit(1);
});
