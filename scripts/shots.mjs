/**
 * Captures the screenshots used on the public landing page.
 *
 * Run it with the dev server already up:
 *
 *   npm run dev          (in one terminal)
 *   npm run shots        (in another)
 *
 * It drives the copy of Chrome already installed on this machine through
 * puppeteer-core, so nothing extra gets downloaded. Plain headless Chrome
 * is not enough here: the report is fetched as a stream after the page
 * loads, so the capture has to *wait for the report to appear* rather than
 * fire after a fixed delay.
 */

import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];

const BASE = process.env.SHOTS_BASE ?? "http://localhost:3000";
const QUERY =
  process.env.SHOTS_QUERY ??
  "riotId=louder+than+you%23lty&platform=euw1&queue=420&count=50";
const OUT = "docs/shots";

/** Each shot waits for something that only exists once the data is in. */
const SHOTS = [
  { name: "overview", path: "/analyse", waitFor: "text/Start here", height: 1500 },
  { name: "map", path: "/analyse/map", waitFor: "text/Where you die", height: 1450 },
  { name: "jungle", path: "/analyse/jungle", waitFor: "text/Objective control", height: 1250 },
  { name: "matches", path: "/analyse/matches", waitFor: "text/All games", height: 1150 },
];

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error("Could not find Chrome. Set CHROME_PATH or edit this script.");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? chrome,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
  defaultViewport: { width: 1400, height: 1200, deviceScaleFactor: 2 },
});

for (const shot of SHOTS) {
  const page = await browser.newPage();
  // The app follows the OS theme; the screenshots want the dark one.
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "dark" },
  ]);
  await page.setViewport({
    width: 1400,
    height: shot.height,
    deviceScaleFactor: 1,
  });

  const url = `${BASE}${shot.path}?${QUERY}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    // This is the important bit - wait for real content, not a timer.
    await page.waitForSelector(shot.waitFor, { timeout: 120_000 });
    // A short settle so charts finish their first paint.
    await new Promise((done) => setTimeout(done, 1200));

    await page.screenshot({ path: `${OUT}/${shot.name}.png` });
    console.log(`  ok   ${shot.name}.png`);
  } catch (error) {
    console.error(`  FAIL ${shot.name}: ${error.message.split("\n")[0]}`);
  }
  await page.close();
}

await browser.close();
console.log("done");
