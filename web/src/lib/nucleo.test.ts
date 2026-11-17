// Rode com `npm test` (node --test, com remoção de tipos nativa do Node 22+).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  agruparTextos,
  contaNoPlacar,
  intervaloCobre,
  md,
  misturar,
  montarTreino,
  parseDispositivo,
  proximoIntervalo,
  registrar,
  relevancia,
  temaCobre,
  type Card,
  type EditalRel,
} from "./nucleo.ts";

const editalJson = (caminho: string) =>
  JSON.parse(readFileSync(new URL(`../../../editais/${caminho}/edital.json`, import.meta.url), "utf-8")) as EditalRel;
const tj = editalJson("tj-sp/oficial-de-justica/2026");
const trf = editalJson("trf3/oficial-de-justica-avaliador-federal/2026");

test("relevância pelos editais reais", () => {
  assert.equal(relevancia({ dispositivos: ["CPP 245"] }, tj)?.bloco, "II");
  const q2 = { dispositivos: ["L8112 13"] };
  assert.equal(relevancia(q2, tj), null);
  assert.ok(relevancia(q2, trf));
  assert.ok(relevancia({ temas: ["tributario.execucao-fiscal.citacao"] }, trf));
  assert.equal(contaNoPlacar({ dispositivos: ["CPP 245"], anulada: true }, tj), false);
});

test("intervalos, artigos com letra e siglas com hífen", () => {
  assert.ok(intervaloCobre("396-396-A", "396-A"));
  assert.ok(!intervaloCobre("396-396-A", "397"));
  assert.ok(intervaloCobre("311-A", "311-A"));
  assert.ok(!intervaloCobre("311-A", "311"));
  assert.ok(intervaloCobre("*", "1"));
  assert.ok(!intervaloCobre("240-250", "251"));
  assert.equal(parseDispositivo("CPC 246 §1º-A")?.artigo, "246");
  assert.equal(parseDispositivo("CNJ-R354 8")?.sigla, "CNJ-R354");
  assert.equal(parseDispositivo("CPP 396-A")?.artigo, "396-A");
  assert.equal(parseDispositivo("LC1111 DT-1")?.artigo, "DT-1");
  assert.ok(temaCobre("a.b", "a.b.c") && !temaCobre("a.b", "a.bc"));
});

test("revisão espaçada", () => {
  assert.equal(proximoIntervalo(undefined, true), 1);
  assert.equal(proximoIntervalo(1, true), 3);
  assert.equal(proximoIntervalo(60, true), 60);
  assert.equal(proximoIntervalo(30, false), 1);
  const e = registrar({ t: 1, a: 1, i: 3 }, true, "2026-01-10", "B");
  assert.deepEqual(e, { t: 2, a: 2, i: 7, u: "2026-01-10", p: "2026-01-17", r: "B" });
});

test("treino: vencidos primeiro, um por questão, sem os futuros", () => {
  const cd = (qid: string, L: string): Card => ({ k: qid + "|" + L, qid, L });
  const cards = [cd("q1", "A"), cd("q1", "B"), cd("q2", "A"), cd("q3", "C"), cd("q4", "D"), cd("q5", "E")];
  const est = { "q2|A": { t: 1, a: 0, p: "2026-01-05" }, "q4|D": { t: 1, a: 0, p: "2026-01-02" }, "q5|E": { t: 2, a: 1, p: "2026-02-01" } };
  assert.equal(montarTreino(cards, est, "2026-01-10", 3).map((x) => x.k).join(","), "q4|D,q2|A,q1|A");
  assert.equal(montarTreino([cd("q5", "E")], est, "2026-01-10", 10).length, 0);
});

test("ordem da sessão: matérias intercaladas e textos-base juntos", () => {
  const q = (id: string, tema: string, tx?: string, n = 0) => ({ id, prova: "p", temas: [tema], tx, n });
  assert.deepEqual(misturar([q("1", "a"), q("2", "a"), q("3", "b")]).map((x) => x.id), ["1", "3", "2"]);
  assert.deepEqual(agruparTextos([q("1", "a", "T1", 1), q("2", "b"), q("3", "a", "T1", 3)]).map((x) => x.id), ["1", "3", "2"]);
});

test("markdown escapa HTML", () => {
  assert.equal(md("**a** <b>\n\n`x<y`"), "<p><strong>a</strong> &lt;b&gt;</p><p><code>x&lt;y</code></p>");
});
