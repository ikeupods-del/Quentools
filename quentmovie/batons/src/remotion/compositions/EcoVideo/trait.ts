// Traits « dessinés au feutre » : de petites irrégularités déterministes,
// renouvelées toutes les 4 images (« ligne qui frémit » des dessins animés à la main).
import { random } from 'remotion';

export type Pt = [number, number];

/** Graine qui change toutes les `pas` images : même dessin pendant 4 images, puis léger frémissement. */
export const graine = (base: string, frame: number, pas = 4) => `${base}-${Math.floor(frame / pas)}`;

const bouge = (g: string, i: number, amp: number) => (random(`${g}-${i}`) - 0.5) * 2 * amp;

/** Ligne à main levée passant par les points, avec un léger tremblement. */
export function main(points: Pt[], g: string, amp = 1.6): string {
  const p = points.map(([x, y], i) => [x + bouge(g, i * 2, amp), y + bouge(g, i * 2 + 1, amp)] as Pt);
  if (p.length < 2) return '';
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length; i++) {
    const [x0, y0] = p[i - 1], [x1, y1] = p[i];
    // point de contrôle légèrement décalé : le trait n'est jamais parfaitement droit
    const cx = (x0 + x1) / 2 + bouge(g, 100 + i, amp * 1.4), cy = (y0 + y1) / 2 + bouge(g, 200 + i, amp * 1.4);
    d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

/** Segment simple à main levée. */
export const segment = (a: Pt, b: Pt, g: string, amp = 1.6) => main([a, b], g, amp);

/** Cercle à main levée (tête, pièce) : polygone fermé de 14 points qui ne se referme pas tout à fait. */
export function cercle(cx: number, cy: number, r: number, g: string, amp = 1.2): string {
  const n = 14, pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const rr = r + bouge(g, i, amp);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  pts[n] = [pts[0][0] + 2, pts[0][1] + 1];
  return main(pts, g + 'c', 0);
}

/** Rectangle à main levée. */
export const rect = (x: number, y: number, w: number, h: number, g: string, amp = 1.6) =>
  main([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y + 1.5]], g, amp);
