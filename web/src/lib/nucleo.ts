// Núcleo: funções puras, sem React nem navegador. Portado de painel/index.html.
// Testes em nucleo.test.ts (npm test).

export interface QuestaoRel {
  temas?: string[];
  dispositivos?: string[];
  disp?: string[];
  anulada?: boolean;
}
export interface EditalRel {
  blocos?: { id: string; cobertura?: { materia: string; temas?: string[]; normas?: Record<string, string[]> }[] }[];
}

/** Um tema do edital cobre o tema da questão quando é igual a ele ou é um ancestral. */
export function temaCobre(temaEdital: string, temaQuestao: string): boolean {
  return temaQuestao === temaEdital || String(temaQuestao).startsWith(temaEdital + ".");
}

type Artigo = [number, string];

/** "396-A" → [396, "A"]; "13" → [13, ""] */
export function parseArtigo(s: string): Artigo | null {
  const m = /^(\d+)(?:-([A-Z]{1,2}))?$/.exec(String(s).trim());
  return m ? [Number(m[1]), m[2] ?? ""] : null;
}

function cmpArtigo(a: Artigo, b: Artigo): number {
  return a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
}

/** "*" cobre tudo; "240-250"; "396-396-A"; "311-A" (exato); "129" (exato). */
export function intervaloCobre(intervalo: string, artigo: string | Artigo): boolean {
  if (intervalo === "*") return true;
  const art = Array.isArray(artigo) ? artigo : parseArtigo(artigo);
  const m = /^(\d+(?:-[A-Z]{1,2})?)(?:-(\d+(?:-[A-Z]{1,2})?))?$/.exec(String(intervalo).trim());
  if (!art || !m?.[1]) return false;
  const ini = parseArtigo(m[1]);
  const fim = m[2] ? parseArtigo(m[2]) : ini;
  if (!ini || !fim) return false;
  return cmpArtigo(art, ini) >= 0 && cmpArtigo(art, fim) <= 0;
}

/** "CPC 246 §1º-A" → {sigla: "CPC", artigo: "246"}; "CNJ-R354 8" → sigla "CNJ-R354"; "LC1111 DT-1" → artigo "DT-1". */
export function parseDispositivo(d: string): { sigla: string; artigo: string } | null {
  const m = /^(\S+)\s+((?:DT-)?\d+(?:-[A-Z]{1,2})?)(?=$|[\s,;])/.exec(String(d).trim());
  return m?.[1] && m[2] ? { sigla: m[1], artigo: m[2] } : null;
}

/** null ou {bloco, materia}: primeiro bloco/cobertura do edital em que um tema ou dispositivo da questão cai. */
export function relevancia(questao: QuestaoRel, edital: EditalRel): { bloco: string; materia: string } | null {
  const temas = questao.temas ?? [];
  const disps = (questao.dispositivos ?? questao.disp ?? []).map(parseDispositivo).filter((d) => d !== null);
  for (const b of edital.blocos ?? []) {
    for (const c of b.cobertura ?? []) {
      if ((c.temas ?? []).some((te) => temas.some((tq) => temaCobre(te, tq)))) return { bloco: b.id, materia: c.materia };
      const normas = c.normas ?? {};
      if (disps.some((d) => (normas[d.sigla] ?? []).some((iv) => intervaloCobre(iv, d.artigo))))
        return { bloco: b.id, materia: c.materia };
    }
  }
  return null;
}

/** Anuladas aparecem no banco, mas não contam no placar. */
export function contaNoPlacar(questao: QuestaoRel, edital: EditalRel): boolean {
  return !questao.anulada && !!relevancia(questao, edital);
}

/** Revisão espaçada: acerto sobe um degrau a partir do intervalo atual; erro volta para 1 dia. */
export const ESCADA = [1, 3, 7, 15, 30, 60] as const;
export function proximoIntervalo(atual: number | undefined, acertou: boolean): number {
  if (!acertou) return 1;
  return ESCADA.find((x) => x > (atual ?? 0)) ?? ESCADA[ESCADA.length - 1]!;
}

/** Estado de revisão de uma questão ou card: tentativas, acertos, última, próxima, intervalo, última resposta. */
export interface EstadoItem {
  t: number;
  a: number;
  u?: string;
  p?: string;
  i?: number;
  r?: string;
}

export function registrar(e: EstadoItem | undefined, acertou: boolean, hoje: string, resposta?: string): EstadoItem {
  const novo: EstadoItem = { t: 0, a: 0, ...e };
  novo.t += 1;
  novo.a += acertou ? 1 : 0;
  novo.u = hoje;
  novo.i = proximoIntervalo(novo.i, acertou);
  novo.p = addDias(hoje, novo.i);
  if (resposta !== undefined) novo.r = resposta;
  return novo;
}

export interface Card {
  k: string;
  qid: string;
  L: string;
}

/**
 * Treino de verdadeiro/falso: card = uma alternativa marcada em `vf`, chave "<id da questão>|<letra>".
 * Rodada: primeiro os vencidos (o mais atrasado primeiro), depois os nunca vistos, na ordem recebida;
 * no máximo um card por questão, para que um card não entregue a resposta de outro.
 */
export function montarTreino(cards: Card[], estado: Record<string, EstadoItem | undefined>, hoje: string, n: number): Card[] {
  const out: Card[] = [];
  const usadas = new Set<string>();
  const pegar = (c: Card) => {
    if (out.length < n && !usadas.has(c.qid)) {
      out.push(c);
      usadas.add(c.qid);
    }
  };
  cards
    .filter((c) => {
      const p = estado[c.k]?.p;
      return !!p && p <= hoje;
    })
    .sort((a, b) => estado[a.k]!.p!.localeCompare(estado[b.k]!.p!))
    .forEach(pegar);
  cards.filter((c) => !estado[c.k]?.t).forEach(pegar);
  return out;
}

export const isoDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const paraData = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d);
};
export function addDias(iso: string, n: number): string {
  const d = paraData(iso);
  d.setDate(d.getDate() + n);
  return isoDia(d);
}
export const hoje = () => isoDia(new Date());
export const diasAte = (iso: string) => Math.round((paraData(iso).getTime() - paraData(hoje()).getTime()) / 864e5);
export const fmtDia = (iso?: string) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
export const fmtData = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
export const pct = (a: number, t: number) => (t ? Math.round((a / t) * 100) : 0);

/** "vunesp/tj-sp/oficial-de-justica/2024#43" → "vunesp--tj-sp--oficial-de-justica--2024" */
export const slugDe = (qid: string) => String(qid).split("#")[0]!.replace(/\//g, "--");
export const provaDe = (qid: string) => String(qid).split("#")[0]!;
export const materiaDe = (q: { temas?: string[] }) => String(q.temas?.[0] ?? "").split(".")[0]!;

export function embaralhar<T>(lista: T[], aleatorio: () => number = Math.random): T[] {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Intercala matérias (round-robin), preservando a ordem dentro de cada uma. */
export function misturar<T extends { temas?: string[] }>(lista: T[]): T[] {
  const grupos = new Map<string, T[]>();
  for (const q of lista) {
    const k = materiaDe(q);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(q);
  }
  const out: T[] = [];
  const filas = [...grupos.values()];
  while (out.length < lista.length) for (const f of filas) if (f.length) out.push(f.shift()!);
  return out;
}

/** Questões do mesmo texto-base ficam juntas, na posição da primeira. */
export function agruparTextos<T extends { id: string; prova: string; tx?: string; n?: number | string }>(lista: T[]): T[] {
  const ordem: string[] = [];
  const grupos = new Map<string, T[]>();
  for (const q of lista) {
    const k = q.tx ? q.prova + "|" + q.tx : q.id;
    if (!grupos.has(k)) {
      grupos.set(k, []);
      ordem.push(k);
    }
    grupos.get(k)!.push(q);
  }
  return ordem.flatMap((k) => grupos.get(k)!.sort((a, b) => (a.tx ? Number(a.n ?? 0) - Number(b.n ?? 0) : 0)));
}

/** Linhas de folha de resposta: ~75 caracteres por linha, cada quebra começa linha nova. */
export function contarLinhas(texto: string, porLinha = 75): number {
  if (!String(texto || "").trim()) return 0;
  return String(texto)
    .replace(/\s+$/, "")
    .split("\n")
    .reduce((s, l) => s + Math.max(1, Math.ceil(l.length / porLinha)), 0);
}

/** Mini-markdown seguro: escapa HTML e só então aplica **negrito**, __sublinhado__, `código`, \n e \n\n. */
export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function mdInline(s: unknown): string {
  return String(s ?? "")
    .split(/(`[^`\n]+`)/)
    .map((parte) =>
      parte.length > 2 && parte.startsWith("`") && parte.endsWith("`")
        ? `<code>${esc(parte.slice(1, -1))}</code>`
        : esc(parte)
            .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
            .replace(/(?<!_)__(?!_)([^_]+?)__(?!_)/g, "<u>$1</u>"),
    )
    .join("")
    .replace(/\n/g, "<br>");
}

export function md(s: unknown): string {
  return String(s ?? "")
    .split(/\n[ \t]*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${mdInline(p.trim())}</p>`)
    .join("");
}
