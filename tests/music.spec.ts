import { expect, test } from '@playwright/test';
import { advance, observe, open, play, setOption } from './helpers';
import { AudioConfig } from '../src/game/configuration/AudioConfig';

test('one authored soundtrack survives navigation, pause and repeated match teardown', async ({ page }) => {
  await open(page);
  const track = page.locator('audio');
  await expect(track).toHaveCount(1);
  expect(await track.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  const original = await track.elementHandle();
  if (!original) throw new Error('The authored soundtrack element is missing.');
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect
    .poll(() => track.evaluate((element: HTMLAudioElement) => element.currentTime))
    .toBeGreaterThan(0);
  const started = await track.evaluate((element: HTMLAudioElement) => element.currentTime);
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  for (let cycle = 0; cycle < 3; cycle++) {
    await play(page);
    await page.getByRole('button', { name: 'Pause game', exact: true }).click();
    expect((await observe(page)).audio.music.playing).toBe(true);
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await page.getByRole('button', { name: 'Leave battle', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    expect(await original.evaluate((element) => element === document.querySelector('audio'))).toBe(true);
  }
  expect(await track.evaluate((element: HTMLAudioElement) => element.loop)).toBe(true);
  expect(await track.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(started);
  await track.evaluate((element: HTMLAudioElement) => {
    if (!Number.isFinite(element.duration)) throw new Error('The authored track must expose its duration.');
    element.currentTime = element.duration - 0.2;
  });
  await expect.poll(() => track.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeLessThan(2);
});

test('music volume persists, migrates legacy options and respects master mute and volume', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('pirate.options')) {
      localStorage.setItem(
        'pirate.options',
        JSON.stringify({ sessionSeconds: 60, spawnSeconds: 10, sound: true, volume: 0.5 }),
      );
    }
  });
  await open(page);
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(
    page.getByRole('group', { name: 'Game session time', exact: true }).locator('output'),
  ).toHaveText('60 s');
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Audio', exact: true })).toBeVisible();
  const musicSlider = page.getByRole('slider', { name: 'Music volume', exact: true });
  await musicSlider.focus();
  await musicSlider.press('Home');
  await musicSlider.press('ArrowRight');
  await musicSlider.press('ArrowRight');
  await musicSlider.press('ArrowRight');
  await expect(musicSlider).toHaveValue('0.3');
  await expect(page.getByRole('group', { name: 'Music volume', exact: true }).locator('output')).toHaveText(
    '30 %',
  );
  await expect
    .poll(() => page.locator('audio').evaluate((element: HTMLAudioElement) => element.volume))
    .toBeCloseTo(0.03);
  const sound = page.getByRole('switch', { name: 'Sound', exact: true });
  await sound.click();
  await expect(sound).not.toBeChecked();
  await expect
    .poll(() => page.locator('audio').evaluate((element: HTMLAudioElement) => element.paused))
    .toBe(true);
  await sound.press('Space');
  await expect(sound).toBeChecked();
  await expect
    .poll(() => page.locator('audio').evaluate((element: HTMLAudioElement) => element.paused))
    .toBe(false);
  await setOption(page, 'Volume', '20 %');
  await expect
    .poll(() => page.locator('audio').evaluate((element: HTMLAudioElement) => element.volume))
    .toBeCloseTo(0.012);
  await page.reload();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Music volume', exact: true }).locator('output')).toHaveText(
    '30 %',
  );
  await expect(musicSlider).toHaveValue('0.3');
  await setOption(page, 'Music volume', '0 %');
  await expect
    .poll(() => page.locator('audio').evaluate((element: HTMLAudioElement) => element.paused))
    .toBe(true);
  await page.getByRole('button', { name: 'Restore default options', exact: true }).click();
  await expect
    .poll(() => page.locator('audio').evaluate((element: HTMLAudioElement) => element.paused))
    .toBe(false);
});

test('leaving results or restarting restores the music before the death cue finishes', async ({ page }) => {
  await open(page);
  const track = page.locator('audio');
  for (const action of ['Main Menu', 'Play Again']) {
    await play(page);
    await expect
      .poll(async () => (await observe(page)).audio.decoded)
      .toBe(AudioConfig.requiredSounds().length);
    const normalVolume = await track.evaluate((element: HTMLAudioElement) => element.volume);
    await advance(page, 120);
    await expect(page.getByRole('heading', { name: 'Battle result' })).toBeVisible();
    expect(await track.evaluate((element: HTMLAudioElement) => element.volume)).toBeCloseTo(
      normalVolume * AudioConfig.DeathMusicGain,
    );
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect
      .poll(() => track.evaluate((element: HTMLAudioElement) => element.volume))
      .toBeCloseTo(normalVolume);
    expect(await track.evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);
  }
  await page.waitForFunction(() => !!window.pirateTest);
  expect((await observe(page)).audio.music.mixGain).toBe(1);
  expect((await observe(page)).snapshot.elapsed).toBe(0);
});

test('a soundtrack load failure is visible and a later gesture retries the authored MP3', async ({
  page,
}) => {
  let unavailable = true;
  await page.route('**/*ebunny-pirate-adventure*.mp3*', async (route) => {
    if (unavailable) await route.abort('failed');
    else await route.continue();
  });
  await open(page);
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.locator('.audio-notice')).toContainText(/soundtrack/i);
  unavailable = false;
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await expect
    .poll(() => page.locator('audio').evaluate((element: HTMLAudioElement) => element.currentTime))
    .toBeGreaterThan(0);
  await expect(page.locator('.audio-notice')).toHaveCount(0);
});
