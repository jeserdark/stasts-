// Actualiza stats.json con datos reales de la API de Instagram (Graph API de Meta).
// Uso:  IG_TOKEN=EAA... IG_USER_ID=17841400757869130 node scripts/update-stats.mjs
// El token NUNCA va en el HTML: se pasa como variable de entorno (secreto de GitHub).

import { readFile, writeFile } from 'node:fs/promises';

const TOKEN = process.env.IG_TOKEN;
const IG_ID = process.env.IG_USER_ID || '17841400757869130';
const API = process.env.IG_API || 'https://graph.facebook.com';
const FILE = new URL('../stats.json', import.meta.url);
const DAYS = 30; // ventana de las métricas de cuenta

if (!TOKEN) { console.error('Falta IG_TOKEN'); process.exit(1); }

async function api(path, params = {}) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries({ ...params, access_token: TOKEN })) url.searchParams.set(k, v);
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`${path}: ${json.error?.message || res.status}`);
  return json;
}

// Cada bloque va en su propio try: si una métrica falla, el resto se actualiza igual.
async function safe(label, fn) {
  try { return await fn(); } catch (e) { console.warn(`⚠️  ${label}: ${e.message}`); return null; }
}

const prev = JSON.parse(await readFile(FILE, 'utf8').catch(() => '{}'));
const out = { ...prev };

// 1) Seguidores de Instagram
const profile = await safe('perfil', () => api(IG_ID, { fields: 'username,followers_count,media_count' }));
if (profile) {
  out.seguidores = { ...(prev.seguidores || {}), instagram: profile.followers_count };
  console.log(`✓ @${profile.username}: ${profile.followers_count} seguidores`);
}

// 1b) Seguidores de la página de Facebook
//     Busca la página en este orden: secreto FB_PAGE_ID → páginas del token → usuario "soymillerleydi".
//     Si nada funciona, se conserva el número manual de stats.json.
{
  const FB_USER = process.env.FB_USERNAME || 'soymillerleydi';
  const candidates = [];
  if (process.env.FB_PAGE_ID) candidates.push(process.env.FB_PAGE_ID);
  const accounts = await safe('páginas del token', () => api('me/accounts', { fields: 'id,name,username', limit: 50 }));
  const list = accounts?.data || [];
  const mine = list.find(p => (p.username || '').toLowerCase() === FB_USER.toLowerCase()) || (list.length === 1 ? list[0] : null);
  if (mine) candidates.push(mine.id);
  candidates.push(FB_USER);
  for (const id of candidates) {
    const page = await safe(`página de Facebook (${id})`, () => api(id, { fields: 'name,followers_count,fan_count' }));
    const n = page?.followers_count ?? page?.fan_count;
    if (typeof n === 'number') {
      out.seguidores = { ...(out.seguidores || {}), facebook: n };
      console.log(`✓ Facebook "${page.name}": ${n} seguidores`);
      break;
    }
  }
}

// 2) Métricas de la cuenta, últimos 30 días
const until = Math.floor(Date.now() / 1000);
const since = until - DAYS * 86400;
const metrics = {};
for (const m of ['views', 'reach', 'total_interactions', 'accounts_engaged']) {
  const r = await safe(`métrica ${m}`, () =>
    api(`${IG_ID}/insights`, { metric: m, period: 'day', metric_type: 'total_value', since, until }));
  const v = r?.data?.[0]?.total_value?.value;
  if (typeof v === 'number') { metrics[m] = v; console.log(`✓ ${m}: ${v}`); }
}

const old = Object.fromEntries((prev.tarjetas || []).map(t => [t.id, t]));
const card = (id, titulo, valor, nota) => (valor == null ? old[id] : { id, titulo, valor, nota }) || { id, titulo, valor: null, nota };
if (Object.keys(metrics).length) out.tarjetas = [
  { id: 'total', titulo: 'Comunidad total', valor: null, nota: 'Instagram + Facebook + TikTok' },
  card('views', `Visualizaciones · ${DAYS} días`, metrics.views, 'Todo el contenido de Instagram'),
  card('reach', `Cuentas alcanzadas · ${DAYS} días`, metrics.reach, 'Cuentas únicas que vieron el contenido'),
  card('interactions', `Interacciones · ${DAYS} días`, metrics.total_interactions, 'Me gusta, comentarios, guardados y compartidos'),
];

// 3) Vistas de cada reel (por código corto del enlace)
const reels = { ...(prev.reels || {}) };
const media = [];
let page = await safe('lista de reels', () =>
  api(`${IG_ID}/media`, { fields: 'id,shortcode,media_product_type', limit: 100 }));
while (page) {
  media.push(...(page.data || []));
  const next = page.paging?.next;
  page = next && media.length < 300 ? await safe('siguiente página', async () => (await fetch(next)).json()) : null;
}
for (const m of media.filter(m => m.media_product_type === 'REELS')) {
  const r = await safe(`vistas ${m.shortcode}`, () => api(`${m.id}/insights`, { metric: 'views' }));
  const v = r?.data?.[0]?.values?.[0]?.value ?? r?.data?.[0]?.total_value?.value;
  if (typeof v === 'number') reels[m.shortcode] = v;
}
if (media.length) console.log(`✓ vistas de ${Object.keys(reels).length} reels`);
if (Object.keys(reels).length) out.reels = reels;

out.actualizado = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });
await writeFile(FILE, JSON.stringify(out, null, 2) + '\n');
console.log('✓ stats.json actualizado:', out.actualizado);
