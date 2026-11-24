// Rode com `npm test`. Progresso corrompido ou antigo não pode quebrar nenhuma tela (QA adversarial).
import assert from "node:assert/strict";
import { test } from "node:test";

import { sanearProgresso, sanearSimulado } from "./saneamento.ts";

const Q = "vunesp/tj-sp/oficial-de-justica/2024#43";
const tempo = { limite_min: 60, usado_ms: 0, pausas: 0, pausado: false };
const simulado = (extra: Record<string, unknown> = {}) => ({
  titulo: "t",
  edital: "e",
  tipo: "edital",
  tamanho: "reduzido",
  criado: "2026-01-01T00:00:00Z",
  questoes: [Q],
  blocos: [{ id: "I", nome: "I", questoes: [Q] }],
  tempo,
  marcadas: {},
  revisar: [],
  pos: 0,
  ...extra,
});

test("qualquer coisa vira um progresso vazio e válido", () => {
  for (const lixo of [null, undefined, 42, "x", [], [1, 2], true]) {
    const p = sanearProgresso(lixo);
    assert.equal(p.versao, 1);
    assert.equal(p.config.tamanho_sessao, 20);
    assert.deepEqual(p.sessoes, {});
    assert.deepEqual(p.simulados, {});
  }
});

test("config: tamanho fora da faixa é limitado e editais_ativos só aceita lista de textos", () => {
  assert.equal(sanearProgresso({ config: { tamanho_sessao: 999 } }).config.tamanho_sessao, 60);
  assert.equal(sanearProgresso({ config: { tamanho_sessao: "abc" } }).config.tamanho_sessao, 20);
  assert.equal(sanearProgresso({ config: { tamanho_sessao: Number.NaN } }).config.tamanho_sessao, 20);
  assert.equal(sanearProgresso({ config: { editais_ativos: { a: 1 } } }).config.editais_ativos, undefined);
  assert.equal(sanearProgresso({ config: { editais_ativos: "x" } }).config.editais_ativos, undefined);
  assert.deepEqual(sanearProgresso({ config: { editais_ativos: ["a", 3, null] } }).config.editais_ativos, ["a"]);
  // painel antigo: config dentro de meta
  assert.equal(sanearProgresso({ meta: { config: { tamanho_sessao: 30 } } }).config.tamanho_sessao, 30);
});

test("sessões sem lista de questões saem; atual só aponta para sessão que existe", () => {
  const p = sanearProgresso({
    sessoes: { a: null, b: { titulo: "x" }, c: { questoes: "abc" }, d: { questoes: [Q, 5], data: "ontem" } },
    atual: "a",
  });
  assert.deepEqual(Object.keys(p.sessoes), ["d"]);
  assert.deepEqual(p.sessoes.d, { titulo: "Sessão", data: "", origem: "auto", questoes: [Q] });
  assert.equal(p.atual, undefined);
  assert.equal(sanearProgresso({ sessoes: { d: { questoes: [] } }, atual: "d" }).atual, "d");
});

test("respostas e rascunhos ganham os campos que faltam e só guardam letras", () => {
  const p = sanearProgresso({
    respostas: { a: null, b: { acertos: 1 }, c: { respostas: { [Q]: "A", x: 3 }, acertos: -2, total: 4, entregueEm: "z" } },
    rascunhos: { a: null, b: { [Q]: "B", y: {} } },
  });
  assert.deepEqual(Object.keys(p.respostas), ["b", "c"]);
  assert.deepEqual(p.respostas.b, { respostas: {}, acertos: 1, total: 0, entregueEm: "" });
  assert.deepEqual(p.respostas.c!.respostas, { [Q]: "A" });
  assert.equal(p.respostas.c!.acertos, 0);
  assert.deepEqual(p.rascunhos, { b: { [Q]: "B" } });
});

test("estado e treino: itens sem tentativas ou com datas inválidas são consertados ou saem", () => {
  const p = sanearProgresso({
    estado: {
      x: null,
      w: "str",
      y: { [Q]: null },
      z: { [Q]: { t: 2, a: 5, p: 12345, u: "2026-01-02", i: "z", r: 7 } },
    },
    treino: { a: { [Q + "|A"]: { t: 0, a: 0 } }, b: { [Q + "|B"]: { t: 1, a: 1, p: "2026-01-03", i: 3, r: "V" } } },
  });
  assert.deepEqual(Object.keys(p.estado), ["z"]);
  assert.deepEqual(p.estado.z![Q], { t: 2, a: 2, u: "2026-01-02" });
  assert.deepEqual(p.treino, { b: { [Q + "|B"]: { t: 1, a: 1, p: "2026-01-03", i: 3, r: "V" } } });
});

test("simulado: sem questões ou sem cronômetro sai; o resto é consertado", () => {
  assert.equal(sanearSimulado(null), null);
  assert.equal(sanearSimulado({}), null);
  assert.equal(sanearSimulado(simulado({ tempo: undefined })), null);
  assert.equal(sanearSimulado(simulado({ questoes: "x" })), null);
  const s = sanearSimulado(
    simulado({ marcadas: null, revisar: null, pos: 99, blocos: [null, { id: "I" }], tempo: { ...tempo, usado_ms: -5, limite_min: 0 } }),
  )!;
  assert.deepEqual(s.marcadas, {});
  assert.deepEqual(s.revisar, []);
  assert.equal(s.pos, 0);
  assert.deepEqual(s.blocos, [{ id: "I", nome: "I", questoes: [] }]);
  assert.equal(s.tempo.usado_ms, 0);
  assert.equal(s.tempo.limite_min, null);
});

test("simulado entregue com resultado ilegível sai; resultado válido passa", () => {
  assert.equal(sanearSimulado(simulado({ resultado: { entregueEm: "x" } })), null);
  const r = {
    blocos: [{ id: "I", nome: "I", acertos: 1, total: 1, branco: 0, nota: 10, minimo: null, eliminatorio: false, eliminou: false, peso: 1 }],
    acertos: 1,
    total: 1,
    branco: 0,
    nota: 10,
    corte: null,
    habilitado: null,
    entregueEm: "2026-01-01T00:00:00Z",
    usado_ms: 1000,
    pausas: 0,
    esgotado: false,
    anuladas: 0,
  };
  assert.deepEqual(sanearSimulado(simulado({ resultado: r }))!.resultado, r);
});

test("um progresso válido passa sem mudança (ida e volta pelo JSON)", () => {
  const p = {
    versao: 1,
    config: { tamanho_sessao: 25, editais_ativos: ["e"] },
    sessoes: { s: { titulo: "Sessão automática", data: "2026-01-01", origem: "auto", questoes: [Q] } },
    respostas: { s: { respostas: { [Q]: "A" }, acertos: 1, total: 1, entregueEm: "2026-01-01T10:00:00Z" } },
    estado: { slug: { [Q]: { t: 1, a: 1, u: "2026-01-01", p: "2026-01-04", i: 3, r: "A" } } },
    treino: {},
    rascunhos: { t: { [Q]: "C" } },
    atual: "s",
    simulados: { "sim-1": { ...simulado(), tempo: { ...tempo, inclui: "redação" }, prova: "p" } },
  };
  assert.deepEqual(sanearProgresso(JSON.parse(JSON.stringify(p))), p);
});
