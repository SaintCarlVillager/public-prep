"use client";
// Ações que gravam progresso.

import { type Base } from "./catalogo";
import { registrar, slugDe, hoje } from "./nucleo";
import { atualizar, novoIdSessao, novoIdSimulado, type Progresso, type Simulado } from "./progresso";
import { contar, pontuarEdital, pontuarSimples } from "./simulado";
import type { Edital, IndiceQuestao, Questao } from "./tipos";

/** Cria a sessão e a deixa como atual. Devolve o id, ou null se não houver questão. */
export function criarSessao(titulo: string, qs: IndiceQuestao[]): string | null {
  if (!qs.length) return null;
  let id = "";
  atualizar((p) => {
    id = novoIdSessao(p);
    p.sessoes[id] = { titulo, data: hoje(), origem: "auto", questoes: qs.map((q) => q.id) };
    p.atual = id;
  });
  return id;
}

export function marcar(sessao: string, qid: string, letra: string) {
  atualizar((p) => {
    if (p.respostas[sessao]) return;
    (p.rascunhos[sessao] ??= {})[qid] = letra;
  });
}

/** Corrige a sessão pelo gabarito (no progresso recebido), grava a entrega e agenda a revisão de cada questão. */
function corrigirSessao(p: Progresso, base: Base, sessao: string, questoes: Record<string, Questao>, hj: string) {
  const s = p.sessoes[sessao];
  if (!s || p.respostas[sessao]) return;
  const d = p.rascunhos[sessao] ?? {};
  let acertos = 0;
  let total = 0;
  for (const qid of s.questoes) {
    const q = questoes[qid];
    if (!q || q.anulada || base.idx[qid]?.anulada || q.tipo === "disc") continue;
    const ok = d[qid] === q.gab;
    total++;
    if (ok) acertos++;
    const doc = (p.estado[slugDe(qid)] ??= {});
    doc[qid] = registrar(doc[qid], ok, hj, d[qid] ?? "");
  }
  p.respostas[sessao] = { respostas: d, acertos, total, entregueEm: new Date().toISOString() };
  delete p.rascunhos[sessao];
}

/** Corrige pelo gabarito, grava a entrega e agenda a revisão de cada questão. */
export function entregar(base: Base, sessao: string, questoes: Record<string, Questao>) {
  const hj = hoje();
  atualizar((p) => corrigirSessao(p, base, sessao, questoes, hj));
}

export function julgarCard(k: string, acertou: boolean) {
  const hj = hoje();
  atualizar((p) => {
    const doc = (p.treino[slugDe(k.split("|")[0]!)] ??= {});
    doc[k] = registrar(doc[k], acertou, hj);
  });
}

export function apagarSessao(id: string) {
  atualizar((p) => {
    delete p.sessoes[id];
    delete p.rascunhos[id];
    if (p.atual === id) p.atual = undefined;
  });
}

/* ---------- simulados ---------- */

/** Grava um simulado novo e devolve o id. */
export function criarSimulado(s: Omit<Simulado, "criado" | "marcadas" | "revisar" | "pos">): string {
  let id = "";
  atualizar((p) => {
    id = novoIdSimulado(p);
    p.simulados[id] = { ...s, criado: new Date().toISOString(), marcadas: {}, revisar: [], pos: 0 };
  });
  return id;
}

const emAndamento = (p: Progresso, id: string) => {
  const s = p.simulados[id];
  return s && !s.resultado ? s : null;
};

/** Marca a resposta; marcar de novo a mesma letra deixa a questão em branco. */
export function marcarNoSimulado(id: string, qid: string, letra: string) {
  atualizar((p) => {
    const s = emAndamento(p, id);
    if (!s) return;
    if (s.marcadas[qid] === letra) delete s.marcadas[qid];
    else s.marcadas[qid] = letra;
  });
}

export function alternarRevisar(id: string, qid: string) {
  atualizar((p) => {
    const s = emAndamento(p, id);
    if (!s) return;
    s.revisar = s.revisar.includes(qid) ? s.revisar.filter((x) => x !== qid) : [...s.revisar, qid];
  });
}

export function irParaQuestao(id: string, pos: number) {
  atualizar((p) => {
    const s = emAndamento(p, id);
    if (s) s.pos = Math.max(0, Math.min(s.questoes.length - 1, pos));
  });
}

/** Soma tempo ativo ao cronômetro do simulado. */
export function somarTempo(id: string, ms: number) {
  if (!(ms > 0)) return;
  atualizar((p) => {
    const s = emAndamento(p, id);
    if (s && !s.tempo.pausado) s.tempo.usado_ms += ms;
  });
}

export function pausarSimulado(id: string, pausar: boolean) {
  atualizar((p) => {
    const s = emAndamento(p, id);
    if (!s || s.tempo.pausado === pausar) return;
    s.tempo.pausado = pausar;
    if (pausar) s.tempo.pausas += 1;
  });
}

export function descartarSimulado(id: string) {
  atualizar((p) => {
    if (emAndamento(p, id)) delete p.simulados[id];
  });
}

/**
 * Entrega o simulado: pontua pela regra do edital (ou, na prova anterior, por bloco do caderno,
 * com as anuladas como acerto) e grava as respostas como uma sessão entregue, com revisão espaçada.
 */
export function entregarSimulado(
  base: Base,
  id: string,
  questoes: Record<string, Questao>,
  opcoes: { edital?: Edital; esgotado?: boolean } = {},
) {
  const hj = hoje();
  atualizar((p) => {
    const s = emAndamento(p, id);
    if (!s) return;
    const blocoDe = new Map<string, string>();
    for (const b of s.blocos) for (const q of b.questoes) blocoDe.set(q, b.id);
    const lista = s.questoes
      .map((qid) => questoes[qid])
      .filter((q): q is Questao => !!q && q.tipo !== "disc")
      .map((q) => ({ id: q.id, bloco: blocoDe.get(q.id) ?? "", gab: q.gab, anulada: !!(q.anulada || base.idx[q.id]?.anulada) }));
    const prova = s.tipo === "prova";
    const cont = contar(lista, s.marcadas, prova ? "acerto" : "fora");
    const pont =
      !prova && opcoes.edital ? pontuarEdital(opcoes.edital, cont) : pontuarSimples(s.blocos.length ? s.blocos : [{ id: "", nome: "Prova" }], cont);
    if (s.tempo.limite_min) s.tempo.usado_ms = Math.min(s.tempo.usado_ms, s.tempo.limite_min * 60000);
    s.resultado = {
      ...pont,
      entregueEm: new Date().toISOString(),
      usado_ms: s.tempo.usado_ms,
      pausas: s.tempo.pausas,
      esgotado: !!opcoes.esgotado,
      anuladas: prova ? lista.filter((q) => q.anulada).length : 0,
      regra: !prova ? opcoes.edital?.objetiva?.nota : undefined,
    };
    s.tempo.pausado = false;
    // As respostas entram como uma sessão entregue: placar, evolução e revisões.
    p.sessoes[id] = { titulo: s.titulo, data: hj, origem: "simulado", questoes: s.questoes };
    p.rascunhos[id] = { ...s.marcadas };
    corrigirSessao(p, base, id, questoes, hj);
  });
}
