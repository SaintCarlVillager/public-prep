// Regras de estudo que juntam catálogo e progresso: placar, sessões automáticas, revisões e treino.
// Portado de painel/index.html, sem as partes que dependiam do Claude.

import type { Base } from "./catalogo";
import {
  agruparTextos,
  diasAte,
  embaralhar,
  materiaDe,
  misturar,
  slugDe,
  temaCobre,
  type Card,
  type EstadoItem,
} from "./nucleo";
import type { Progresso } from "./progresso";
import type { Edital, IndiceQuestao } from "./tipos";

const passou = (e: Edital) => !!e.prova && diasAte(e.prova) < 0;

export const orgaoDe = (e: Edital) => e.orgao ?? e.id.split("/")[0]!.toUpperCase();
export const cargoCurto = (e: Edital) => e.cargo_curto ?? (e.cargo ?? e.id.split("/")[1] ?? "").split(/\s+/)[0]!;
/** Pílula de edital federal (contorno) ou estadual (grifo). */
export const ehFederal = (e: Edital) => /^TRF/i.test(orgaoDe(e));

/** Rótulo curto do edital, sempre com órgão e cargo: "TRF3 Oficial", "TJ-SP Escrevente". */
export const rotuloEdital = (e: Edital) => `${orgaoDe(e)} ${cargoCurto(e)}`;

export const vigentes = (b: Base) => b.editais.filter((e) => !passou(e));

/** Editais ativos, do de prova mais próxima ao mais distante. */
export function ativos(b: Base, p: Progresso): Edital[] {
  const ids = p.config.editais_ativos;
  return vigentes(b)
    .filter((e) => !ids || ids.includes(e.id))
    .sort((x, y) => (x.prova ?? "").localeCompare(y.prova ?? ""));
}

export const estadoDe = (p: Progresso, qid: string): EstadoItem | undefined => p.estado[slugDe(qid)]?.[qid];

type Soma = { a: number; t: number };
export interface Placar {
  geral: Soma;
  ed: Record<string, Soma & { blocos: Record<string, Soma>; materias: Record<string, Soma> }>;
  temas: Record<string, Soma>;
  vistas: number;
  vencidas: number;
}

export function placar(b: Base, p: Progresso, hj: string): Placar {
  const eds = ativos(b, p);
  const P: Placar = { geral: { a: 0, t: 0 }, ed: {}, temas: {}, vistas: 0, vencidas: 0 };
  const add = (bag: Record<string, Soma>, k: string, a: number, t: number) => {
    const v = (bag[k] ??= { a: 0, t: 0 });
    v.a += a;
    v.t += t;
  };
  for (const e of eds) P.ed[e.id] = { a: 0, t: 0, blocos: {}, materias: {} };
  for (const doc of Object.values(p.estado)) {
    for (const [qid, e] of Object.entries(doc ?? {})) {
      const m = b.idx[qid];
      if (!m || m.anulada || !e?.t) continue;
      P.geral.a += e.a || 0;
      P.geral.t += e.t;
      P.vistas++;
      if (e.p && e.p <= hj) P.vencidas++;
      for (const t of m.temas) add(P.temas, t, e.a || 0, e.t);
      for (const ed of eds) {
        const r = b.rel(qid, ed);
        if (!r) continue;
        const E = P.ed[ed.id]!;
        E.a += e.a || 0;
        E.t += e.t;
        add(E.blocos, r.bloco, e.a || 0, e.t);
        add(E.materias, r.materia, e.a || 0, e.t);
      }
    }
  }
  return P;
}

export function temasFracos(P: Placar, n = 8) {
  return Object.entries(P.temas)
    .filter(([, v]) => v.t >= 3 && v.a < v.t)
    .sort((x, y) => x[1].a / x[1].t - y[1].a / y[1].t || y[1].t - x[1].t)
    .slice(0, n)
    .map(([id, v]) => ({ id, ...v }));
}

export function disponiveis(b: Base, p: Progresso) {
  const eds = ativos(b, p);
  let total = 0;
  let rels = 0;
  for (const m of Object.values(b.idx)) {
    if (m.anulada || m.tipo === "disc") continue;
    total++;
    if (eds.some((e) => b.rel(m.id, e))) rels++;
  }
  return { total, rels };
}

/** Questões de sessões ainda não entregues (não entram em sessões novas). */
export function emSessaoAberta(p: Progresso): Set<string> {
  const s = new Set<string>();
  for (const [id, x] of Object.entries(p.sessoes)) if (!p.respostas[id]) for (const q of x.questoes) s.add(q);
  return s;
}

const chaveRel = (b: Base, eds: Edital[]) => (q: IndiceQuestao) => {
  const i = eds.findIndex((e) => b.rel(q.id, e));
  return i < 0 ? 99 : i;
};

/** Ordem de uma sessão: edital mais próximo primeiro, matérias intercaladas, textos-base juntos. */
export function ordenar(b: Base, p: Progresso, lista: IndiceQuestao[]): IndiceQuestao[] {
  const k = chaveRel(b, ativos(b, p));
  return agruparTextos(misturar(lista.slice().sort((x, y) => k(x) - k(y))));
}

/** Sessão automática: revisões vencidas, temas fracos (até ~40%) e nunca vistas do edital mais próximo. */
export function montarAutomatica(b: Base, p: Progresso, n: number, hj: string): IndiceQuestao[] {
  const eds = ativos(b, p);
  const alvo = eds[0];
  const k = chaveRel(b, eds);
  const aberta = emSessaoAberta(p);
  const est = (id: string) => estadoDe(p, id);
  const cands = Object.values(b.idx).filter((q) => q.tipo === "me" && !q.anulada && !aberta.has(q.id));
  const nova = (q: IndiceQuestao) => !est(q.id)?.t;
  const escolha: IndiceQuestao[] = [];
  const ja = new Set<string>();
  const pegar = (q: IndiceQuestao, lim = n) => {
    if (escolha.length < lim && !ja.has(q.id)) {
      escolha.push(q);
      ja.add(q.id);
    }
  };
  // 1. revisões vencidas (a mais atrasada primeiro)
  cands
    .filter((q) => {
      const pr = est(q.id)?.p;
      return !!pr && pr <= hj;
    })
    .sort((x, y) => est(x.id)!.p!.localeCompare(est(y.id)!.p!))
    .forEach((q) => pegar(q));
  // 2. temas fracos: questões ainda não vistas desses temas, até ~40% da sessão
  const fracos = temasFracos(placar(b, p, hj), 12).map((f) => f.id);
  if (fracos.length) {
    const lim = Math.min(n, escolha.length + Math.ceil(n * 0.4));
    misturar(
      embaralhar(cands.filter((q) => nova(q) && q.temas.some((t) => fracos.some((f) => temaCobre(f, t))))).sort(
        (x, y) => k(x) - k(y),
      ),
    ).forEach((q) => pegar(q, lim));
  }
  // 3. nunca vistas relevantes ao edital mais próximo; depois aos outros ativos; depois qualquer uma
  if (alvo) misturar(embaralhar(cands.filter((q) => nova(q) && b.rel(q.id, alvo)))).forEach((q) => pegar(q));
  misturar(embaralhar(cands.filter((q) => nova(q) && eds.some((e) => b.rel(q.id, e))))).forEach((q) => pegar(q));
  misturar(embaralhar(cands.filter(nova))).forEach((q) => pegar(q));
  return ordenar(b, p, escolha);
}

export interface ItemRevisao extends EstadoItem {
  qid: string;
  m: IndiceQuestao;
  p: string;
  vence: boolean;
}

export function revisoes(b: Base, p: Progresso, hj: string): ItemRevisao[] {
  const out: ItemRevisao[] = [];
  for (const doc of Object.values(p.estado))
    for (const [qid, e] of Object.entries(doc ?? {})) {
      const m = b.idx[qid];
      if (m && !m.anulada && e?.p) out.push({ ...e, qid, m, p: e.p, vence: e.p <= hj });
    }
  return out;
}

/** Fila de revisão fora das sessões abertas: atrasadas e de hoje primeiro, depois as que vencem em seguida. */
export function filaRevisao(b: Base, p: Progresso, hj: string): ItemRevisao[] {
  const aberta = emSessaoAberta(p);
  return revisoes(b, p, hj)
    .filter((x) => !aberta.has(x.qid))
    .sort((x, y) => x.p.localeCompare(y.p) || x.a / x.t - y.a / y.t);
}

/* ---------- treino ---------- */

export function todosCards(b: Base): Card[] {
  const out: Card[] = [];
  for (const m of Object.values(b.idx)) {
    if (m.anulada || m.desat || !m.vf?.length) continue;
    for (const L of m.vf) out.push({ k: m.id + "|" + L, qid: m.id, L });
  }
  return out;
}

export const estadoTreino = (p: Progresso) => Object.assign({}, ...Object.values(p.treino)) as Record<string, EstadoItem>;

export function placarTreino(b: Base, p: Progresso, hj: string) {
  const cards = todosCards(b);
  const est = estadoTreino(p);
  let vistos = 0;
  let vencidos = 0;
  let a = 0;
  let t = 0;
  for (const c of cards) {
    const e = est[c.k];
    if (!e?.t) continue;
    vistos++;
    a += e.a || 0;
    t += e.t;
    if (e.p && e.p <= hj) vencidos++;
  }
  return { total: cards.length, vistos, vencidos, a, t, questoes: new Set(cards.map((c) => c.qid)).size };
}

/** Nunca vistos: primeiro os do edital mais próximo, depois os outros ativos; sorteio dentro de cada grupo. */
export function ordemNovos(b: Base, p: Progresso, cards: Card[]): Card[] {
  const eds = ativos(b, p);
  const peso = (c: Card) => {
    const i = eds.findIndex((e) => b.rel(c.qid, e));
    return i < 0 ? 99 : i;
  };
  return embaralhar(cards).sort((x, y) => peso(x) - peso(y));
}

export const rotuloProva = (b: Base, pid: string) => {
  const pr = b.provas[pid];
  return pr ? `${pr.orgao} ${pr.ano}` : pid.split("/").slice(-3).join(" ");
};

export const nomeMateriaDe = (b: Base, q: { temas?: string[] }) => b.nomeMateria(materiaDe(q));
