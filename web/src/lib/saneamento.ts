// Saneamento do progresso lido do navegador ou de um arquivo importado.
// Funções puras, sem React nem navegador; testes em saneamento.test.ts (npm test).
//
// O progresso vem de fora do app (localStorage editado à mão, export de versão antiga, arquivo
// truncado), então nada nele é confiável. Cada registro é conferido campo a campo: o que dá para
// consertar é consertado (um número fora da faixa, uma lista ausente) e o que não dá para usar
// (uma sessão sem questões, um simulado sem cronômetro) é deixado de fora, para que nenhuma tela
// quebre por causa de um registro ruim.

import type { EstadoItem } from "./nucleo.ts";
import type { BlocoSimulado, Config, Progresso, Resposta, ResultadoSimulado, Sessao, Simulado, TempoSimulado } from "./progresso.ts";

type Obj = Record<string, unknown>;

export const ehObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const txt = (v: unknown, padrao = ""): string => (typeof v === "string" ? v : padrao);
const num = (v: unknown, padrao = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : padrao);
const naoNeg = (v: unknown, padrao = 0) => Math.max(0, num(v, padrao));
const ids = (v: unknown): string[] | null => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null);
const DIA = /^\d{4}-\d{2}-\d{2}$/;
const dia = (v: unknown) => (typeof v === "string" && DIA.test(v) ? v : undefined);

/** Aplica `fn` a cada valor de um objeto; o que volta null fica de fora. */
function cada<T>(v: unknown, fn: (x: unknown, k: string) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!ehObj(v)) return out;
  for (const [k, x] of Object.entries(v)) {
    const y = fn(x, k);
    if (y != null) out[k] = y;
  }
  return out;
}

/** Respostas marcadas: só letras (texto). */
const marcacoes = (v: unknown) => cada(v, (x) => (typeof x === "string" ? x : null));

export function sanearConfig(v: unknown): Config {
  const c = ehObj(v) ? v : {};
  const n = Math.round(num(c.tamanho_sessao, 20));
  const out: Config = { tamanho_sessao: Math.max(5, Math.min(60, n)) };
  const eds = ids(c.editais_ativos);
  if (eds) out.editais_ativos = eds;
  return out;
}

export function sanearSessao(v: unknown): Sessao | null {
  if (!ehObj(v)) return null;
  const questoes = ids(v.questoes);
  if (!questoes) return null;
  return { titulo: txt(v.titulo, "Sessão"), data: dia(v.data) ?? "", origem: txt(v.origem, "auto"), questoes };
}

export function sanearResposta(v: unknown): Resposta | null {
  if (!ehObj(v)) return null;
  return {
    respostas: marcacoes(v.respostas),
    acertos: naoNeg(v.acertos),
    total: naoNeg(v.total),
    entregueEm: txt(v.entregueEm),
  };
}

export function sanearItem(v: unknown): EstadoItem | null {
  if (!ehObj(v) || !(num(v.t) > 0)) return null;
  const t = Math.round(num(v.t));
  const out: EstadoItem = { t, a: Math.min(t, Math.round(naoNeg(v.a))) };
  const u = dia(v.u);
  const p = dia(v.p);
  if (u) out.u = u;
  if (p) out.p = p;
  if (num(v.i) > 0) out.i = num(v.i);
  if (typeof v.r === "string") out.r = v.r;
  return out;
}

/** estado/treino: {<slug>: {<chave>: EstadoItem}} */
const estados = (v: unknown) =>
  cada(v, (doc) => {
    const d = cada(doc, sanearItem);
    return Object.keys(d).length ? d : null;
  });

function sanearTempo(v: unknown): TempoSimulado | null {
  if (!ehObj(v)) return null;
  const lim = num(v.limite_min, 0);
  const out: TempoSimulado = {
    limite_min: lim > 0 ? lim : null,
    usado_ms: naoNeg(v.usado_ms),
    pausas: Math.round(naoNeg(v.pausas)),
    pausado: v.pausado === true,
  };
  if (typeof v.inclui === "string") out.inclui = v.inclui;
  return out;
}

function sanearBlocoSimulado(v: unknown): BlocoSimulado | null {
  if (!ehObj(v) || typeof v.id !== "string") return null;
  return { id: v.id, nome: txt(v.nome, v.id), questoes: ids(v.questoes) ?? [] };
}

function sanearResultado(v: unknown): ResultadoSimulado | null {
  if (!ehObj(v) || !Array.isArray(v.blocos)) return null;
  const notaOuNull = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
  const blocos = v.blocos.filter(ehObj).map((b) => ({
    id: txt(b.id),
    nome: txt(b.nome, txt(b.id)),
    acertos: naoNeg(b.acertos),
    total: naoNeg(b.total),
    branco: naoNeg(b.branco),
    nota: notaOuNull(b.nota),
    minimo: notaOuNull(b.minimo),
    eliminatorio: b.eliminatorio === true,
    eliminou: b.eliminou === true,
    peso: num(b.peso, 1),
  }));
  const out: ResultadoSimulado = {
    blocos,
    acertos: naoNeg(v.acertos),
    total: naoNeg(v.total),
    branco: naoNeg(v.branco),
    nota: notaOuNull(v.nota),
    corte: notaOuNull(v.corte),
    habilitado: typeof v.habilitado === "boolean" ? v.habilitado : null,
    entregueEm: txt(v.entregueEm),
    usado_ms: naoNeg(v.usado_ms),
    pausas: Math.round(naoNeg(v.pausas)),
    esgotado: v.esgotado === true,
    anuladas: naoNeg(v.anuladas),
  };
  if (typeof v.motivo === "string") out.motivo = v.motivo;
  if (typeof v.regra === "string") out.regra = v.regra;
  return out;
}

export function sanearSimulado(v: unknown): Simulado | null {
  if (!ehObj(v)) return null;
  const questoes = ids(v.questoes);
  const tempo = sanearTempo(v.tempo);
  if (!questoes || !tempo) return null;
  const tipo = v.tipo === "prova" ? "prova" : "edital";
  const tamanho = v.tamanho === "completo" || v.tamanho === "inteira" ? v.tamanho : "reduzido";
  const out: Simulado = {
    titulo: txt(v.titulo, "Simulado"),
    edital: txt(v.edital),
    tipo,
    tamanho,
    criado: txt(v.criado),
    questoes,
    blocos: Array.isArray(v.blocos) ? v.blocos.map(sanearBlocoSimulado).filter((b): b is BlocoSimulado => !!b) : [],
    tempo,
    marcadas: marcacoes(v.marcadas),
    revisar: ids(v.revisar) ?? [],
    pos: Math.max(0, Math.min(Math.max(0, questoes.length - 1), Math.round(num(v.pos)))),
  };
  if (typeof v.prova === "string") out.prova = v.prova;
  // O plano só serve para avisar das faltas; se vier estranho, sai sem quebrar nada.
  if (Array.isArray(v.plano) && v.plano.every((b) => ehObj(b) && Array.isArray(b.materias))) out.plano = v.plano as Simulado["plano"];
  if (v.resultado !== undefined) {
    const r = sanearResultado(v.resultado);
    // Resultado ilegível: o simulado não dá para mostrar nem para retomar (já foi entregue).
    if (!r) return null;
    out.resultado = r;
  }
  return out;
}

/** Aceita um export deste app ou um dump do banco do painel antigo ({sessoes, respostas, estado, treino, meta: {config}}). */
export function sanearProgresso(dados: unknown): Progresso {
  const d = ehObj(dados) ? dados : {};
  const meta = ehObj(d.meta) ? d.meta : undefined;
  const sessoes = cada(d.sessoes, sanearSessao);
  const respostas = cada(d.respostas, sanearResposta);
  const atual = typeof d.atual === "string" && sessoes[d.atual] ? d.atual : undefined;
  const p: Progresso = {
    versao: 1,
    config: sanearConfig(ehObj(d.config) ? d.config : meta?.config),
    sessoes,
    respostas,
    estado: estados(d.estado),
    treino: estados(d.treino),
    rascunhos: cada(d.rascunhos, (r) => (ehObj(r) ? marcacoes(r) : null)),
    // Progresso de antes dos simulados não tem o campo.
    simulados: cada(d.simulados, sanearSimulado),
  };
  if (atual) p.atual = atual;
  return p;
}
