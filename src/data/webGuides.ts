/**
 * Build guides served by the MONTERA web app (github.com/phintruong/MONTERA).
 *
 * This app is the landing page: home, catalogue, scanners. The build itself
 * (3D step player, parts, checks, voice) is the web app's phone layout,
 * opened in a WebView by app/guide/[id].tsx. The web page reports each step
 * change back with a `montera-progress` message, so Continue here stays right.
 */

/** Override with EXPO_PUBLIC_WEB_URL, e.g. a preview deployment. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://montera-nine.vercel.app').replace(/\/$/, '');

export type WebGuide = { id: string; name: string; steps: number; study?: boolean };

/** The web app's hand-made guides (src/data/products.ts there). */
export const WEB_GUIDES: WebGuide[] = [
  { id: 'hutten-mini-1', name: 'HUTTEN mini 1 of 3, bottom shelf', steps: 8, study: true },
  { id: 'hutten-mini-2', name: 'HUTTEN mini 2 of 3, middle shelf', steps: 8, study: true },
  { id: 'hutten-mini-3', name: 'HUTTEN mini 3 of 3, top shelf', steps: 8, study: true },
  { id: 'hutten', name: 'HUTTEN wine rack, 9 bottles', steps: 9 },
  { id: 'lack', name: 'LACK side table', steps: 4 },
  { id: 'lack-coffee', name: 'LACK coffee table', steps: 8 },
  { id: 'lack-tv', name: 'LACK TV bench', steps: 10 },
];

export const WEB_GUIDE_BY_ID: Record<string, WebGuide> = Object.fromEntries(WEB_GUIDES.map((g) => [g.id, g]));

/** Catalogue products here whose build is the web app's guide. */
const FROM_CATALOGUE: Record<string, string> = {
  'lack-side-table': 'lack',
  'hutten-wine-rack': 'hutten',
};

/** The web guide for an id from either app, if there is one. */
export function webGuideFor(id: string | undefined): WebGuide | undefined {
  if (!id) return undefined;
  return WEB_GUIDE_BY_ID[FROM_CATALOGUE[id] ?? id];
}

/** `step` is 0-based; the web app takes a 1-based ?step=. */
export function guideUrl(webId: string, step = 0): string {
  const q = new URLSearchParams({ product: webId, ui: 'mobile', shell: 'expo' });
  if (step > 0) q.set('step', String(step + 1));
  return `${WEB_URL}/?${q.toString()}`;
}
