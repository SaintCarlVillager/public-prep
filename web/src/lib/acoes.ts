"use client";
// Ações que gravam progresso.

import { type Base } from "./catalogo";
import { registrar, slugDe, hoje } from "./nucleo";
import { atualizar, novoIdSessao } from "./progresso";
import type { IndiceQuestao, Questao } from "./tipos";

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

/** Corrige pelo gabarito, grava a entrega e agenda a revisão de cada questão. */
export function entregar(base: Base, sessao: string, questoes: Record<string, Questao>) {
  const hj = hoje();
  atualizar((p) => {
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
  });
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
