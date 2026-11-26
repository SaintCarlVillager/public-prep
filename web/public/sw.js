/* Service worker da ServentIA: deixa o app abrir e estudar sem internet.
 *
 * Registrado por src/components/Pwa.tsx como /sw.js?v=<versão do deploy>. Trocar a versão instala um worker
 * novo, que guarda as telas e os arquivos da versão nova e apaga os da antiga.
 *
 * - Telas (navegação): rede primeiro; sem rede, a cópia guardada da mesma tela (nunca a de outra) ou um aviso.
 * - /_next/static e ícones: cache primeiro (os nomes já mudam a cada versão).
 * - /dados/catalogo.json: rede primeiro, com prazo curto; sem rede, a cópia guardada.
 * - /dados/provas, /dados/figuras, /dados/leis: cache primeiro. A cada versão nova, as cópias guardadas são
 *   conferidas com o servidor (If-None-Match), e só o que mudou é baixado de novo.
 *
 * Na instalação já ficam guardados as telas, o catálogo, todas as provas e as figuras (cerca de 1,5 MB):
 * Sessão, Revisões, Treino e Simulados funcionam offline. A lei seca (cerca de 12 MB) é guardada quando aberta
 * ou pelo botão "Baixar a lei seca" em Ajustes.
 */

const VERSAO = new URL(self.location.href).searchParams.get("v") || "dev";
const APP = `serventia-app-${VERSAO}`;
const DADOS = "serventia-dados";
const TELAS = ["/", "/sessao", "/revisoes", "/treino", "/simulados", "/banco", "/lei", "/lei/imprimir", "/ajustes"];
const FIXOS = ["/manifest.webmanifest", "/icon.svg", "/icones/icone-192.png", "/icones/icone-512.png"];

/** Endereço da tela sem consulta nem barra final: /lei?n=CF e /lei/ dão a mesma página estática. */
const chaveTela = (url) => {
  const p = new URL(url).pathname.replace(/\/+$/, "");
  return p || "/";
};

async function guardarTela(cache, caminho) {
  const r = await fetch(caminho, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${caminho}: HTTP ${r.status}`);
  const html = await r.clone().text();
  await cache.put(caminho, r);
  // Scripts, estilos e fontes que a tela carrega.
  return [...html.matchAll(/["'(](\/_next\/static\/[^"'()\s]+)/g)].map((m) => m[1].replace(/\\u0026/g, "&"));
}

async function guardarDados() {
  const cache = await caches.open(DADOS);
  const r = await fetch("/dados/catalogo.json", { cache: "no-cache" });
  if (!r.ok) return;
  const cat = await r.clone().json();
  await cache.put("/dados/catalogo.json", r);
  await Promise.allSettled(
    (cat.provas || []).map(async (p) => {
      const url = `/dados/${p.arquivo}`;
      let resp = await cache.match(url);
      if (!resp) {
        resp = await fetch(url);
        if (!resp.ok) return;
        await cache.put(url, resp.clone());
      }
      const prova = await resp.json();
      const figuras = (prova.questoes || []).flatMap((q) => q.imagens || []).map((f) => `/dados/${f}`);
      await Promise.allSettled(figuras.map(async (f) => (await cache.match(f)) || cache.add(f)));
    }),
  );
}

/** Confere as cópias guardadas de /dados com o servidor e troca só as que mudaram. */
async function revalidarDados() {
  const cache = await caches.open(DADOS);
  for (const req of await cache.keys()) {
    try {
      const antiga = await cache.match(req);
      const etag = antiga && antiga.headers.get("ETag");
      const r = await fetch(req.url, { cache: "no-store", headers: etag ? { "If-None-Match": etag } : {} });
      if (r.status === 200) await cache.put(req, r);
    } catch {
      return; // sem rede: tenta de novo na próxima versão
    }
  }
}

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    (async () => {
      const cache = await caches.open(APP);
      const estaticos = (await Promise.all(TELAS.map((t) => guardarTela(cache, t)))).flat();
      await Promise.allSettled([...new Set([...estaticos, ...FIXOS])].map((u) => cache.add(u)));
      await guardarDados().catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    (async () => {
      for (const nome of await caches.keys()) if (nome.startsWith("serventia-app-") && nome !== APP) await caches.delete(nome);
      await self.clients.claim();
    })(),
  );
  // Fora do waitUntil: o worker novo já atende enquanto confere os dados.
  revalidarDados();
});

async function daRede(req, cacheNome, chave, ms) {
  const cache = await caches.open(cacheNome);
  const rede = fetch(req).then((r) => {
    if (r.ok) cache.put(chave, r.clone());
    return r;
  });
  const prazo = ms ? new Promise((_, rej) => setTimeout(() => rej(new Error("prazo")), ms)) : null;
  try {
    return await (prazo ? Promise.race([rede, prazo]) : rede);
  } catch (e) {
    const guardada = await cache.match(chave);
    if (guardada) return guardada;
    // Passou do prazo e não há cópia: espera a rede mesmo.
    return rede;
  }
}

async function doCache(req, cacheNome) {
  const cache = await caches.open(cacheNome);
  const guardada = await cache.match(req, { ignoreSearch: false });
  if (guardada) return guardada;
  const r = await fetch(req);
  if (r.ok) cache.put(req, r.clone());
  return r;
}

async function tela(req) {
  const cache = await caches.open(APP);
  const chave = chaveTela(req.url);
  try {
    const r = await fetch(req);
    if (r.ok && TELAS.includes(chave)) cache.put(chave, r.clone());
    return r;
  } catch (e) {
    const guardada = await cache.match(chave);
    if (guardada) return guardada;
    // Nunca devolver a cópia de outra tela (o Painel no endereço do Treino, por exemplo): o React
    // montaria a página errada e quebraria a hidratação. Sem cópia desta tela, um aviso simples.
    return new Response(SEM_REDE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

const SEM_REDE = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sem internet · ServentIA</title><meta name="color-scheme" content="light dark"></head>
<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:0 auto;padding:2rem 1rem;line-height:1.5">
<h1 style="font-size:1.4rem">Sem internet</h1><p>Esta tela ainda não foi guardada para uso sem internet.</p>
<p><a href="/" style="display:inline-block;min-height:44px;line-height:44px">Abrir o Painel</a></p></body></html>`;

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Pedidos internos do roteador do Next (RSC, prefetch): sem rede, ele mesmo cai para a navegação comum.
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (req.mode === "navigate") return ev.respondWith(tela(req));
  if (url.pathname.startsWith("/_next/static/") || FIXOS.includes(url.pathname)) return ev.respondWith(doCache(req, APP));
  if (url.pathname === "/dados/catalogo.json") return ev.respondWith(daRede(req, DADOS, "/dados/catalogo.json", 4000));
  if (url.pathname.startsWith("/dados/")) return ev.respondWith(doCache(req, DADOS));
});
