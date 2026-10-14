import { expect, test } from '@playwright/test';
import { observe, open, play } from './helpers';

test('a runtime devicePixelRatio change re-renders the canvas at the new density', async ({ browser }) => {
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await open(page);
    await play(page);
    const density = () =>
      page.evaluate(() => {
        const canvas = document.querySelector('canvas')!;
        return canvas.width / canvas.parentElement!.clientWidth;
      });
    expect(await density()).toBeCloseTo(1, 2);
    const before = await observe(page);
    // Moving the window to a denser monitor changes devicePixelRatio without resizing the viewport.
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
      mobile: false,
    });
    // Emulated density changes do not notify headless pages; a real zoom fires `resize` (and monitor
    // changes fire the resolution media query), so the test delivers the browser's resize notification.
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await expect.poll(density).toBeCloseTo(2, 2);
    // Density is presentation only: world coordinates and the simulation are unchanged.
    const after = await observe(page);
    expect(after.player).toEqual(before.player);
    expect(after.snapshot.elapsed).toBe(before.snapshot.elapsed);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('static water stays continuous at fractional viewport and DPI scales', async ({ browser }) => {
  for (const deviceScaleFactor of [1, 1.25, 1.5, 2]) {
    const context = await browser.newContext({ deviceScaleFactor, viewport: { width: 1482, height: 962 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await open(page);
      await play(page);
      for (const viewport of [
        { width: 1482, height: 962 },
        { width: 1482, height: 947 },
        { width: 1365, height: 768 },
        { width: 1600, height: 1000 },
        { width: 844, height: 390 },
      ]) {
        await page.setViewportSize(viewport);
        await page.waitForFunction(() => {
          const canvas = document.querySelector('canvas')!;
          const host = canvas.parentElement!;
          const resolution = Math.min(
            devicePixelRatio,
            window.pirateTest!.observe().config.runtime.maxResolution,
          );
          return (
            canvas.width === Math.round(host.clientWidth * resolution) &&
            canvas.height === Math.round(host.clientHeight * resolution)
          );
        });
        const pixels = await page.evaluate(() => {
          // Render synchronously through the existing test clock, advancing no gameplay time.
          // WebGL's non-preserved backbuffer may otherwise be cleared after compositing.
          window.pirateTest!.advance!(0);
          const canvas = document.querySelector('canvas')!;
          const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
          if (!gl) throw new Error('The arena must have its initialized WebGL context.');
          // The full-screen arena letterboxes the map; measure the row near the bottom of the drawn map,
          // located as the lowest non-background pixel of the centre column (WebGL rows start at the bottom).
          const background = window.pirateTest!.observe().config.runtime.background;
          const backgroundRgb = [1, 3, 5].map((offset) => parseInt(background.slice(offset, offset + 2), 16));
          const column = new Uint8Array(gl.drawingBufferHeight * 4);
          gl.readPixels(
            Math.floor(gl.drawingBufferWidth / 2),
            0,
            1,
            gl.drawingBufferHeight,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            column,
          );
          let mapBottom = 0;
          while (
            mapBottom < gl.drawingBufferHeight &&
            backgroundRgb.every((value, channel) => column[mapBottom * 4 + channel] === value)
          )
            mapBottom++;
          const row = new Uint8Array(gl.drawingBufferWidth * 4);
          const y = mapBottom + Math.ceil(15 * devicePixelRatio);
          gl.readPixels(0, y, gl.drawingBufferWidth, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
          const from = Math.ceil(gl.drawingBufferWidth * 0.3);
          const to = Math.floor(gl.drawingBufferWidth * 0.7);
          const blackColumns: number[] = [];
          for (let x = from; x <= to; x++) if (row[x * 4 + 1]! < 80) blackColumns.push(x);
          const samples = [from, Math.floor(gl.drawingBufferWidth / 2), to].map((x) =>
            Array.from(row.slice(x * 4, x * 4 + 4)),
          );
          return { width: gl.drawingBufferWidth, blackColumns, samples };
        });
        console.log(
          JSON.stringify({
            deviceScaleFactor,
            viewport,
            width: pixels.width,
            gaps: pixels.blackColumns.length,
            samples: pixels.samples,
          }),
        );
        expect(
          pixels.blackColumns.length,
          `Water gaps at DPI ${deviceScaleFactor}, ${viewport.width}x${viewport.height}`,
        ).toBe(0);
        if (deviceScaleFactor === 1 && viewport.height === 962) {
          await test.info().attach('continuous-water-wide-viewport', {
            body: await page.screenshot(),
            contentType: 'image/png',
          });
        }
      }
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  }
});
