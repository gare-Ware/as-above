// A real glass lens — feDisplacementMap refraction, ported from the
// glass-demo project (after Aave Labs' "Building Glass for the Web").
//
// One lens = one SVG filter applied to one element (here: the key's
// windowed copy of the wave field). The filter's heart is a displacement
// map generated on a canvas from the pill's rounded-rect SDF: R = horizontal
// push, G = vertical push, rgb(128,128,128) = don't move. Edge pixels are
// displaced inward (the magnifying squeeze) so the backdrop visibly BENDS
// at the rim — real refraction, not painted-on light.
//
// Cheap path:  setStrength (press deepens the bend) — attribute updates.
// Costly path: shape changes — map regeneration (resize only, via RO).
//
// Cross-browser per the article: color-interpolation-filters="sRGB" (in
// linearRGB 128 is NOT neutral and the whole element drifts), and Safari
// caches filter output by ID, so every update assigns a fresh one.

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

let instanceCount = 0;
let defsSvg: SVGSVGElement | null = null;

/** All filters live in one hidden SVG — in the DOM, never display:none
    (some engines drop the filter entirely). */
function defsRoot(): SVGSVGElement {
  if (!defsSvg) {
    defsSvg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    defsSvg.setAttribute('aria-hidden', 'true');
    defsSvg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    document.body.appendChild(defsSvg);
  }
  return defsSvg;
}

/** Signed distance to a rounded rectangle centered at the origin. */
function sdfRoundRect(px: number, py: number, hx: number, hy: number, r: number): number {
  const qx = Math.abs(px) - (hx - r);
  const qy = Math.abs(py) - (hy - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(ax, ay) - r;
}

/** Displacement map for the lens shape (PNG data URL). Four-fold symmetry:
    only the top-left quadrant is computed, mirrored to the rest. */
function generateMapURL(W: number, H: number, radius: number, depth: number): string {
  W = Math.max(2, Math.round(W));
  H = Math.max(2, Math.round(H));
  const rr = Math.min(radius, W / 2, H / 2);
  const hx = W / 2 - 1;
  const hy = H / 2 - 1;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(W, H);
  const px = img.data;

  const qw = Math.ceil(W / 2);
  const qh = Math.ceil(H / 2);
  const eps = 0.75;

  const put = (X: number, Y: number, dx: number, dy: number) => {
    const i = (Y * W + X) * 4;
    px[i] = Math.round(128 + dx * 127); // R: horizontal push
    px[i + 1] = Math.round(128 + dy * 127); // G: vertical push
    px[i + 2] = 128;
    px[i + 3] = 255;
  };

  for (let y = 0; y < qh; y += 1) {
    for (let x = 0; x < qw; x += 1) {
      const sx = x + 0.5 - W / 2;
      const sy = y + 0.5 - H / 2;
      const d = sdfRoundRect(sx, sy, hx, hy, rr);

      let dx = 0;
      let dy = 0;
      if (d <= 0) {
        // Bend strength: 1 at the rim, easing to 0 by `depth` px inward.
        let t = Math.min(Math.max(1 + d / depth, 0), 1);
        t = t * t * (3 - 2 * t); // smoothstep
        const mag = Math.pow(t, 1.4); // hardened profile

        if (mag > 0.001) {
          // Numerical SDF gradient = outward normal; displace inward so
          // edge pixels sample toward the center: the magnifying squeeze.
          const gx =
            sdfRoundRect(sx + eps, sy, hx, hy, rr) - sdfRoundRect(sx - eps, sy, hx, hy, rr);
          const gy =
            sdfRoundRect(sx, sy + eps, hx, hy, rr) - sdfRoundRect(sx, sy - eps, hx, hy, rr);
          const len = Math.hypot(gx, gy) || 1;
          dx = -(gx / len) * mag;
          dy = -(gy / len) * mag;
        }
      }

      put(x, y, dx, dy);
      put(W - 1 - x, y, -dx, dy);
      put(x, H - 1 - y, dx, -dy);
      put(W - 1 - x, H - 1 - y, -dx, -dy);
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export interface LensOptions {
  /** Bend reach inward from the rim, px. */
  depth: number;
  /** Displacement scale (px-ish; negative = concave). */
  strength: number;
  /** Per-channel scale spread (0 = no chromatic fringe). */
  chroma: number;
  /** CSS filter functions appended after the lens url() — the glass body
      grade (brightness/saturate) rides the same filter chain. */
  post?: string;
}

export class Lens {
  private target: HTMLElement;
  private depth: number;
  private strength: number;
  private chroma: number;
  private post: string;
  private instId: number;
  private serial = 0;
  private mapURL = '';
  private filter!: SVGFilterElement;
  private feImage!: SVGFEImageElement;
  private dm!: NodeListOf<SVGFEDisplacementMapElement>;
  private ro: ResizeObserver;
  private w = 0;
  private h = 0;

  constructor(target: HTMLElement, opts: LensOptions) {
    this.target = target;
    this.depth = opts.depth;
    this.strength = opts.strength;
    this.chroma = opts.chroma;
    this.post = opts.post ?? '';
    this.instId = ++instanceCount;

    this.buildFilter();
    // Shape follows the element: regenerate the map whenever it resizes
    // (the costly path — happens on viewport changes only).
    this.ro = new ResizeObserver(() => this.syncShape());
    this.ro.observe(target);
    this.syncShape();
  }

  private buildFilter() {
    const f = document.createElementNS(SVG_NS, 'filter') as SVGFilterElement;
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.setAttribute('x', '0');
    f.setAttribute('y', '0');
    f.setAttribute('width', '100');
    f.setAttribute('height', '100');

    f.innerHTML =
      '<feFlood flood-color="rgb(128,128,128)" result="neutral"/>' +
      '<feImage result="lensmap" preserveAspectRatio="none"/>' +
      '<feComposite in="lensmap" in2="neutral" operator="over" result="map"/>' +
      // Chromatic fringe: three displacement passes at slightly spread
      // strengths, one channel each, summed back together.
      '<feDisplacementMap in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dispR"/>' +
      '<feColorMatrix in="dispR" type="matrix" result="chR" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dispG"/>' +
      '<feColorMatrix in="dispG" type="matrix" result="chG" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dispB"/>' +
      '<feColorMatrix in="dispB" type="matrix" result="chB" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/>' +
      '<feComposite in="chR" in2="chG" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg"/>' +
      '<feComposite in="rg" in2="chB" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>';

    defsRoot().appendChild(f);
    this.filter = f;
    this.feImage = f.querySelector('feImage') as SVGFEImageElement;
    this.dm = f.querySelectorAll('feDisplacementMap');
  }

  /** Costly path: element size changed — remap and reapply. */
  private syncShape() {
    const rect = this.target.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    this.w = rect.width;
    this.h = rect.height;
    this.filter.setAttribute('width', String(Math.ceil(this.w)));
    this.filter.setAttribute('height', String(Math.ceil(this.h)));
    this.mapURL = generateMapURL(this.w, this.h, this.h / 2, this.depth);
    this.apply();
  }

  /** Cheap path: the press deepens the bend. */
  setStrength(s: number) {
    this.strength = s;
    this.apply();
  }

  private apply() {
    if (!this.mapURL) return;
    const img = this.feImage;
    img.setAttribute('href', this.mapURL);
    img.setAttributeNS(XLINK_NS, 'xlink:href', this.mapURL); // older Safari
    img.setAttribute('x', '0');
    img.setAttribute('y', '0');
    img.setAttribute('width', String(this.w));
    img.setAttribute('height', String(this.h));

    const s = this.strength;
    const c = this.chroma;
    this.dm[0].setAttribute('scale', String(s * (1 + c)));
    this.dm[1].setAttribute('scale', String(s));
    this.dm[2].setAttribute('scale', String(s * (1 - c)));

    // Safari caches SVG filter output by ID and serves stale pixels; a
    // fresh ID on every update forces a re-read.
    const id = `lens-${this.instId}-${++this.serial}`;
    this.filter.setAttribute('id', id);
    this.target.style.filter = `url(#${id})${this.post ? ` ${this.post}` : ''}`;
  }

  destroy() {
    this.ro.disconnect();
    this.filter.remove();
    this.target.style.filter = '';
  }
}
