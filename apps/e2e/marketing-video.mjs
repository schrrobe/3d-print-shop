// Records a tilted "3D" walkthrough of kaliberbox.de into ./marketing_videos/kaliberbox[-mobile].webm
// Run: node apps/e2e/marketing-video.mjs [baseUrl] [--mobile]
//   default:  desktop page, 1920x1080
//   --mobile: phone layout floating on a dark stage, portrait 1080x1920 for Reels/Stories
/* global document, scrollY, scrollTo, innerHeight, requestAnimationFrame -- used inside page.evaluate */
import { chromium, devices } from '@playwright/test'

const mobile = process.argv.includes('--mobile')
const BASE = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'https://kaliberbox.de'
const out = `./marketing_videos/kaliberbox${mobile ? '-mobile' : ''}.webm`
const size = mobile ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: size,
  recordVideo: { dir: './marketing_videos/', size },
  ...(mobile && { userAgent: devices['Pixel 7'].userAgent, hasTouch: true }),
})
// Pre-dismiss cookie banner and opening promo so neither shows up in the video (runs in the iframe too).
// The promo key embeds code + title; if the promo changes, update it from localStorage after closing it once.
await context.addInitScript(() => {
  localStorage.setItem(
    'print-shop-consent',
    JSON.stringify({
      necessary: true,
      statistics: false,
      marketing: false,
      version: '2.0',
      updatedAt: new Date().toISOString(),
    }),
  )
  localStorage.setItem('kb-promo-seen', 'OPEN10|Wir haben eröffnet!')
})
const page = await context.newPage()

// Video capture runs in CSS pixels and ignores deviceScaleFactor, so a 360px phone viewport would come out
// as a 360x640 picture. Instead the shop runs in a 360x640 iframe (= mobile layout) scaled up on a 1080x1920 page.
let app = page // where the shop runs: the page itself, or the "phone" iframe
if (mobile) {
  await page.setContent(`<style>
    html { perspective: 150vh; background: #111; }
    body { margin: 0; height: 100vh; display: grid; place-items: center; overflow: hidden; }
    iframe { width: 360px; height: 640px; border: 0; border-radius: 28px; box-shadow: 0 30px 80px #000c;
             transition: transform 3.5s cubic-bezier(0.25, 1, 0.5, 1); }
  </style><iframe></iframe>`)
  app = await (await page.$('iframe')).contentFrame()
}

// Camera = transform on the Nuxt root (desktop) or on the phone iframe (mobile).
const [camTarget, camScale] = mobile ? ['iframe', ' scale(2.6)'] : ['#__nuxt', '']
const camera = (t) =>
  page.evaluate(
    ([sel, t]) => {
      document.querySelector(sel).style.transform = t
    },
    [camTarget, t + camScale],
  )
// Desktop only: html gets the perspective and a dark stage around the tilted page.
const stage = () =>
  mobile ||
  page.addStyleTag({
    content: `
  html { perspective: 150vh; background: #111 !important; }
  body { background: transparent !important; overflow-x: hidden; }
  #__nuxt { transform-origin: 50% 30vh; transition: transform 3.5s cubic-bezier(0.25, 1, 0.5, 1); }
`,
  })
const smoothScrollTo = async (y, ms) => {
  await app.evaluate(
    ([y, ms]) =>
      new Promise((done) => {
        const from = scrollY,
          t0 = performance.now()
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms),
            e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
          scrollTo(0, from + (y - from) * e)
          if (k < 1) requestAnimationFrame(step)
          else done()
        }
        requestAnimationFrame(step)
      }),
    [y, ms],
  )
}

// 1. Home, tilted start shot
await app.goto(BASE, { waitUntil: 'networkidle' })
await stage()
await camera('rotateY(-18deg) rotateX(12deg) scale(0.9) translateX(2.5vw)')
await page.waitForTimeout(3000)

// 2. Push in, then glide down to the caliber list
await camera('rotateY(-22deg) rotateX(15deg) scale(0.95) translateX(1vw)')
await page.waitForTimeout(1500)
const card = app.getByRole('link', { name: /\.357 Magnum.*100 Schuss/s }).first()
const cardY = await card.evaluate(
  (el) => el.getBoundingClientRect().top + scrollY - innerHeight / 3,
)
await smoothScrollTo(cardY, 4000)

// 3. Straighten up on the product and open it
await camera('rotateY(-8deg) rotateX(6deg) scale(1.02)')
await page.waitForTimeout(1500)
// Real mouse clicks miss under the 3D transform (hit-testing lands on a neighbour), so dispatch DOM clicks.
await card.dispatchEvent('click')
await app.getByRole('heading', { name: 'Farben konfigurieren' }).waitFor()
await app.waitForLoadState('networkidle')
await stage() // Nuxt keeps #__nuxt, but re-apply in case of a full reload
await camera('rotateY(-14deg) rotateX(8deg) scale(0.95)')
await page.waitForTimeout(2000)

// 4. Play with the colors (matched by name fragment, so small renames in the shop don't break the run)
const swatch = (group, color) =>
  app.getByRole('group', { name: new RegExp(`^${group}`) }).getByRole('button', { name: color })
for (const [box, label] of [
  ['Grün', 'Weiß'],
  ['Schwarz', 'Grün'],
  ['Weiß', 'Schwarz'],
  ['Grün', 'Schwarz'],
]) {
  await swatch('Box', box).dispatchEvent('click')
  await page.waitForTimeout(500)
  await swatch('Schriftfarbe', label).dispatchEvent('click')
  await page.waitForTimeout(1200)
}

// 5. Outro: pull back to a wide shot
await camera('rotateY(-30deg) rotateX(20deg) scale(0.8) translateY(-10vh)')
await page.waitForTimeout(3500)

const video = page.video()
await context.close() // finalises the video file
await video.saveAs(out)
await video.delete()
await browser.close()
console.log(`Video gespeichert: ${out}`)
