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
  nivelLinha,
  recorteNorma,
  rotuloArt,
  rotuloIntervalo,
  separarNotas,
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
// O TRF3 Oficial saiu do app, mas o edital continua como fixture: é o caso de média ponderada e da norma inteira ("*").
const trf = JSON.parse(
  readFileSync(new URL("./fixtures/edital-trf3-oficial-2026.json", import.meta.url), "utf-8"),
) as typeof tj;

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

test("lei seca impressa: rótulos de artigo, intervalo e recorte", () => {
  assert.equal(rotuloArt("1"), "1º");
  assert.equal(rotuloArt("9"), "9º");
  assert.equal(rotuloArt("10"), "10");
  assert.equal(rotuloArt("1015"), "1.015");
  assert.equal(rotuloArt("1091-A"), "1.091-A");
  assert.equal(rotuloArt("1-A"), "1º-A");
  assert.equal(rotuloArt("DT-1"), "DT-1");
  assert.equal(rotuloIntervalo("1-12"), "Arts. 1º a 12");
  assert.equal(rotuloIntervalo("396-396-A"), "Arts. 396 a 396-A");
  assert.equal(rotuloIntervalo("103-189-G"), "Arts. 103 a 189-G");
  assert.equal(rotuloIntervalo("311-A"), "Art. 311-A");
  assert.equal(rotuloIntervalo("*"), "Íntegra");
  assert.equal(recorteNorma(["1-12", "129", "994-1091-A"]), "artigos 1º a 12; 129; 994 a 1.091-A");
  assert.equal(recorteNorma(["129"]), "artigo 129");
  assert.equal(recorteNorma(["1-3"]), "artigos 1º a 3º");
  assert.equal(recorteNorma(["*"]), "íntegra");
});

test("lei seca impressa: recuo das linhas e notas de alteração", () => {
  assert.equal(nivelLinha("Art. 5º Todos são iguais"), 0);
  assert.equal(nivelLinha("§ 1º As normas"), 0);
  assert.equal(nivelLinha("IV - a transparência"), 1);
  assert.equal(nivelLinha("XII – o aprimoramento"), 1);
  assert.equal(nivelLinha("a) contra a vida"), 2);
  assert.equal(nivelLinha("1. o primeiro item"), 3);
  assert.equal(nivelLinha("1.015 é número"), 0);
  assert.deepEqual(separarNotas("Pena - reclusão, de 2 (dois) a 6 (seis) anos. (Redação dada pela Lei nº 7.209, de 1984)"), [
    { texto: "Pena - reclusão, de 2 (dois) a 6 (seis) anos. " },
    { texto: "(Redação dada pela Lei nº 7.209, de 1984)", nota: true },
  ]);
  assert.deepEqual(separarNotas("Art. 5º (Revogado)"), [{ texto: "Art. 5º " }, { texto: "(Revogado)", nota: true }]);
  assert.deepEqual(separarNotas("sem notas (cinco dias)"), [{ texto: "sem notas (cinco dias)" }]);
});
