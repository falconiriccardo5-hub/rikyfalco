---
name: scroll-animations
description: "Scroll-driven web animation: GSAP ScrollTrigger (scrub, pin, snap, timelines), Lenis smooth scroll, native CSS scroll-driven animations (animation-timeline: scroll()/view()), and driving three.js scenes and cameras from scroll progress. Use when building scrollytelling pages, parallax, pinned sections, reveal-on-scroll, horizontal scroll sections, or 3D scenes that react to scrolling."
---

# Scroll animations

Pick the lightest tool that does the job:

| Need | Tool |
|---|---|
| Fade/slide in as elements enter, simple parallax | Native CSS `animation-timeline: view()` (with a fallback) |
| Scrubbed timelines, pinning, snapping, horizontal sections | GSAP + ScrollTrigger |
| Smooth/inertial scroll feel | Lenis, synced to ScrollTrigger |
| 3D scene moved by scroll | ScrollTrigger progress → three.js values, rendered in one rAF loop |

## Loading (pin exact versions)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>
```
npm: `npm i gsap lenis` then `import gsap from "gsap"; import { ScrollTrigger } from "gsap/ScrollTrigger"; gsap.registerPlugin(ScrollTrigger);`

## 1. Native CSS (no JS)

```css
@supports (animation-timeline: view()) {
  .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% cover 35%; }
}
@keyframes reveal { from { opacity: 0; transform: translateY(40px); } }
/* page progress bar */
.progress { transform-origin: 0 50%; animation: grow linear; animation-timeline: scroll(root); }
@keyframes grow { from { transform: scaleX(0); } }
```
Only animate from a visible-safe state: without `@supports`, content stays visible.

## 2. GSAP ScrollTrigger essentials

```js
gsap.registerPlugin(ScrollTrigger);

// Reveal once
gsap.utils.toArray(".reveal").forEach(el =>
  gsap.from(el, { y: 60, opacity: 0, duration: 0.8, ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none reverse" } }));

// Scrubbed, pinned timeline
const tl = gsap.timeline({ scrollTrigger: {
  trigger: ".story", start: "top top", end: "+=2000", scrub: 1, pin: true, snap: { snapTo: "labels", duration: 0.4 } } });
tl.addLabel("a").to(".card1", { xPercent: -100 }).addLabel("b").to(".card2", { scale: 1.2 }).addLabel("c");

// Horizontal section
const track = document.querySelector(".track");
gsap.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: "none",
  scrollTrigger: { trigger: ".h-wrap", pin: true, scrub: 1, end: () => "+=" + track.scrollWidth, invalidateOnRefresh: true } });
```
Key options: `start/end` = "triggerPos viewportPos"; `scrub: true|number` (number = smoothing seconds); `pin`; `markers: true` while debugging; `onUpdate: self => self.progress` (0..1).
Use `ease: "none"` for anything scrubbed linearly to scroll. Use function values + `invalidateOnRefresh` for sizes that depend on the viewport.

## 3. Lenis + ScrollTrigger sync

```js
const lenis = new Lenis({ lerp: 0.1 });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```
Never run a second rAF loop for Lenis when GSAP is present.

## 4. Driving three.js from scroll

Keep one render loop; scroll only writes *target* values, the loop eases toward them.
```js
const state = { p: 0 };
ScrollTrigger.create({ trigger: "#story", start: "top top", end: "bottom bottom",
  onUpdate: s => (state.p = s.progress) });

// or a scrubbed timeline that tweens three.js objects directly
gsap.timeline({ scrollTrigger: { trigger: "#story", start: "top top", end: "bottom bottom", scrub: 1 } })
  .to(mesh.rotation, { y: Math.PI * 2, ease: "none" }, 0)
  .to(camera.position, { z: 3, ease: "none" }, 0)
  .to(material.uniforms.uMix, { value: 1, ease: "none" }, 0.5);

renderer.setAnimationLoop(() => {
  mesh.position.y += (Math.sin(state.p * Math.PI) - mesh.position.y) * 0.08; // damped
  renderer.render(scene, camera);
});
```
Patterns: camera along a `CatmullRomCurve3` (`curve.getPointAt(p)`), morphing between shapes via a shader uniform, color/fog changes per section, canvas `position: fixed` behind scrolling HTML sections.

## Rules

- Respect `prefers-reduced-motion`: `gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {...})`; skip Lenis and scrubbed motion otherwise.
- Animate only `transform` and `opacity` on DOM; never `top/left/width`.
- Content must be readable with JS off / before load: animate *from* hidden in JS (`gsap.from`), not by setting `opacity:0` in CSS.
- Call `ScrollTrigger.refresh()` after images/fonts/3D models load; in SPAs `ctx = gsap.context(...)` and `ctx.revert()` on unmount (React: `useGSAP` from `@gsap/react`).
- Mobile: avoid heavy pins on tiny screens (use `matchMedia` breakpoints), cap `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, and set `ScrollTrigger.config({ ignoreMobileResize: true })`.
- Debug with `markers: true`; remove before shipping.
