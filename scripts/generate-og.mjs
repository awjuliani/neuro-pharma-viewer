import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../public");

const synapseSvg = `
<svg viewBox="0 0 520 360" width="520" height="360" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M-40 60 C40 60 110 50 150 110 A120 120 0 0 1 150 250 C110 310 40 300 -40 300 Z"
        fill="#f7f9fa" stroke="#dfe3e6" stroke-width="4"/>
  <path d="M560 60 C480 60 410 50 370 110 A120 120 0 0 0 370 250 C410 310 480 300 560 300 Z"
        fill="#f7f9f8" stroke="#dce3e1" stroke-width="4"/>
  <circle cx="205" cy="150" r="13" fill="#6f5bd6" opacity="0.92"/>
  <circle cx="250" cy="200" r="11" fill="#6f5bd6" opacity="0.8"/>
  <circle cx="225" cy="250" r="9" fill="#6f5bd6" opacity="0.6"/>
  <circle cx="290" cy="160" r="8" fill="#6f5bd6" opacity="0.5"/>
  <g stroke="#2478a6" stroke-width="5" stroke-linecap="round" fill="none">
    <path d="M372 120 a26 26 0 0 1 0 52"/>
    <path d="M372 196 a26 26 0 0 1 0 52"/>
  </g>
  <circle cx="360" cy="146" r="9" fill="#2d9df0"/>
  <circle cx="360" cy="222" r="9" fill="#2d9df0"/>
</svg>`;

const ogHtml = `<!doctype html><html><head><meta charset="utf-8"/><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; display: flex; align-items: center;
    font-family: ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
    background:
      radial-gradient(900px 520px at 78% 18%, rgba(45,157,240,0.10), transparent 60%),
      radial-gradient(760px 520px at 20% 96%, rgba(111,91,214,0.10), transparent 62%),
      linear-gradient(160deg, #ffffff, #eef3f2);
    color: #18272f;
  }
  .wrap { display: flex; align-items: center; gap: 36px; padding: 0 84px; width: 100%; }
  .copy { flex: 1 1 auto; }
  .eyebrow {
    font-size: 22px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
    color: #6d7880; margin-bottom: 22px;
  }
  h1 { font-size: 76px; line-height: 1.02; font-weight: 800; letter-spacing: -0.015em; color: #18272f; }
  p.lede { font-size: 30px; line-height: 1.4; color: #63717a; margin-top: 28px; max-width: 18ch; font-weight: 500; }
  .art {
    flex: 0 0 520px; height: 360px;
    background: rgba(255,255,255,0.86); border: 1px solid rgba(108,125,133,0.2);
    border-radius: 24px; box-shadow: 0 26px 70px rgba(48,72,82,0.14);
    display: flex; align-items: center; justify-content: center;
  }
  .url { position: absolute; left: 84px; bottom: 52px; font-size: 22px; font-weight: 700; color: #2478a6; }
</style></head><body>
  <div class="wrap">
    <div class="copy">
      <div class="eyebrow">Interactive educational visualizer</div>
      <h1>Receptor-level<br/>neuropharmacology</h1>
      <p class="lede">Watch a synapse respond to drug interventions, molecule by molecule.</p>
    </div>
    <div class="art">${synapseSvg}</div>
  </div>
  <div class="url">awjuliani.github.io/neuro-pharma-viewer</div>
</body></html>`;

const iconHtml = `<!doctype html><html><head><meta charset="utf-8"/><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 180px; height: 180px; background: #18272f;
    display: flex; align-items: center; justify-content: center;
  }
  svg { width: 132px; height: 132px; }
</style></head><body>
  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M24.5 7a10 10 0 0 0 0 18" fill="none" stroke="#2d9df0" stroke-width="3" stroke-linecap="round"/>
    <circle cx="22" cy="16" r="3.1" fill="#2d9df0"/>
    <circle cx="12.5" cy="16" r="4.3" fill="#6f5bd6"/>
    <circle cx="6.6" cy="11.4" r="2.2" fill="#6f5bd6" opacity="0.72"/>
    <circle cx="7.4" cy="20.6" r="1.7" fill="#6f5bd6" opacity="0.55"/>
  </svg>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(ogHtml, { waitUntil: "networkidle" });
await page.screenshot({ path: resolve(publicDir, "og-image.png") });

await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(iconHtml, { waitUntil: "networkidle" });
await page.screenshot({ path: resolve(publicDir, "apple-touch-icon.png") });

await browser.close();
console.log("Wrote og-image.png and apple-touch-icon.png to public/");
