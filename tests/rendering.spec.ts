import { expect, test } from '@playwright/test';
import { open, play } from './helpers';

test('static water stays continuous at fractional viewport and DPI scales', async ({ browser }) => {
  for (const deviceScaleFactor of [1, 1.25, 1.5, 2]) {
    const context = await browser.newContext({ deviceScaleFactor, viewport: { width: 1482, height: 962 } });
    const page = await context.newPage(); const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await open(page); await play(page);
      for (const viewport of [{ width: 1482, height: 962 }, { width: 1482, height: 947 },
        { width: 1365, height: 768 }, { width: 1600, height: 1000 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        await page.waitForFunction(() => {
          const canvas = document.querySelector('canvas')!; const host = canvas.parentElement!;
          const resolution = Math.min(devicePixelRatio, window.pirateTest!.observe().config.runtime.maxResolution);
          return canvas.width === Math.round(host.clientWidth * resolution)
            && canvas.height === Math.round(host.clientHeight * resolution);
        });
        const pixels = await page.evaluate(() => {
            // Render synchronously through the existing test clock, advancing no gameplay time.
            // WebGL's non-preserved backbuffer may otherwise be cleared after compositing.
            window.pirateTest!.advance!(0);
            const canvas = document.querySelector('canvas')!;
            const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
            if (!gl) throw new Error('The arena must have its initialized WebGL context.');
            const row = new Uint8Array(gl.drawingBufferWidth * 4);
            const y = gl.drawingBufferHeight - Math.ceil(15 * devicePixelRatio);
            gl.readPixels(0, y, gl.drawingBufferWidth, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
            const from = Math.ceil(gl.drawingBufferWidth * 0.3); const to = Math.floor(gl.drawingBufferWidth * 0.7);
            const blackColumns: number[] = [];
            for (let x = from; x <= to; x++) if (row[x * 4 + 1]! < 80) blackColumns.push(x);
            const samples = [from, Math.floor(gl.drawingBufferWidth / 2), to].map((x) => Array.from(row.slice(x * 4, x * 4 + 4)));
            return { width: gl.drawingBufferWidth, blackColumns, samples };
        });
        console.log(JSON.stringify({ deviceScaleFactor, viewport, width: pixels.width, gaps: pixels.blackColumns.length, samples: pixels.samples }));
        expect(pixels.blackColumns.length, `Water gaps at DPI ${deviceScaleFactor}, ${viewport.width}x${viewport.height}`).toBe(0);
        if (deviceScaleFactor === 1 && viewport.height === 962) {
          await test.info().attach('continuous-water-wide-viewport', { body: await page.screenshot(), contentType: 'image/png' });
        }
      }
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  }
});
