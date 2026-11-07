// Captures real, public TravalBee pages to video/public/shots/ for the walkthrough video.
// Only public pages are visited: no sign-in, no personal data. Usage: node capture/capture.mjs
import puppeteer from "puppeteer-core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://travalbee.com";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "shots");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
// Skip the cookie banner so it does not cover the pages.
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem("travalbee_cookie_consent", "acknowledged"); } catch {}
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 90 });
  console.log("saved", name);
};
const go = async (url, wait = 3500) => {
  await page.goto(BASE + url, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(wait);
};
// Clicks every button with this label (the timeline tab and the map's day selector both match).
const clickText = (text) =>
  page.evaluate((t) => {
    const els = [...document.querySelectorAll("button, a")].filter((e) => e.textContent?.trim().toLowerCase() === t.toLowerCase());
    els.forEach((e) => e.click());
    return els.length > 0;
  }, text);
const scrollToText = (text, block = "start") =>
  page.evaluate((t, b) => {
    const el = [...document.querySelectorAll("h1,h2,h3,p,span,div")].find(
      (e) => e.children.length === 0 && e.textContent?.trim().toLowerCase().startsWith(t.toLowerCase())
    );
    if (el) { el.scrollIntoView({ block: b }); window.scrollBy(0, -150); return true; }
    return false;
  }, text, block);

// Landing page
await go("/");
await shot("home");

// Sample itinerary: hotels and map at the top, then the day tabs and timeline below.
await go("/sample", 6000);
const setTier = async (val) => {
  await page.evaluate((v) => {
    const r = document.querySelector('input[type="range"]');
    if (!r) return;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(r, String(v));
    r.dispatchEvent(new Event("input", { bubbles: true }));
    r.dispatchEvent(new Event("change", { bubbles: true }));
  }, val);
  await sleep(1300);
};
await setTier(3);
await shot("stays-3");
await setTier(4);
await shot("stays-4");
await setTier(5);
await shot("stays-5");
await setTier(4);

// Scroll so the day tab bar sits just under the navigation, then step through the days.
// The timeline sits in its own scrolling column beside the map, so scroll that column.
const toTabs = (extra = 0) =>
  page.evaluate((more) => {
    const bar = [...document.querySelectorAll("button")].find((e) => e.textContent?.trim().toLowerCase() === "all days");
    if (!bar) return false;
    let el = bar.parentElement;
    while (el && !(el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
    const box = el ?? document.scrollingElement;
    const top = el ? el.getBoundingClientRect().top : 0;
    box.scrollTop += bar.getBoundingClientRect().top - top - 8 + more;
    return true;
  }, extra);
for (const d of [1, 2, 3]) {
  console.log("day", d, await clickText("Day " + d));
  await sleep(1200);
  console.log("tabs", await toTabs());
  await sleep(1500);
  await shot("sample-day" + d);
}
// A little further down the first day for a close-up of the timeline cards.
console.log("day1 again", await clickText("Day 1"));
await sleep(900);
await toTabs(340);
await sleep(1500);
await shot("sample-cards");

// Travel news
await go("/news", 4500);
await shot("news-top");
console.log("scroll map:", await scrollToText("Travel advisory levels worldwide"));
await sleep(1500);
await shot("news-map");
await go("/news/india", 3500);
console.log("scroll alerts:", await scrollToText("Current alerts"));
await sleep(1500);
await shot("news-india-alerts");
await go("/news/colombia", 3500);
await shot("news-colombia");

await browser.close();
console.log("done");
