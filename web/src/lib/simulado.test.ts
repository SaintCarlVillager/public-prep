// Rode com `npm test` (node --test, com remoção de tipos nativa do Node 22+).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  blocoDoNumero,
  contar,
  distribuir,
  duracaoSimulado,
  escolher,
  fmtRelogio,
  mesmoCargo,
  planejar,
  pontuarEdital,
  pontuarSimples,
  type BlocoEdital,
  type Contagem,
} from "./simulado.ts";
import type { Objetiva } from "./tipos.ts";

type EditalPont = { blocos: BlocoEdital[]; objetiva: Objetiva };
const editalJson = (caminho: string) =>
  JSON.parse(readFileSync(new URL(`../../../editais/${caminho}/edital.json`, import.meta.url), "utf-8")) as EditalPont;
const tj = editalJson("tj-sp/oficial-de-justica/2026");
const trf = editalJson("trf3/oficial-de-justica-avaliador-federal/2026");
const c = (acertos: number, total: number, branco = 0): Contagem => ({ acertos, total, branco });

test("TJ-SP: habilitado com nota ≥ 5 e 50% nos blocos eliminatórios", () => {
  const r = pontuarEdital(tj, { I: c(8, 15), II: c(20, 40), III: c(10, 15) });
  assert.equal(r.habilitado, true);
  assert.equal(r.acertos, 38);
  assert.ok(Math.abs(r.nota! - (10 * 38) / 70) < 1e-9);
  assert.equal(r.corte, 5);
  assert.equal(r.blocos.find((b) => b.id === "III")!.eliminatorio, false);
});

test("TJ-SP: bloco eliminatório abaixo de 50% elimina, mesmo com nota final alta", () => {
  const r = pontuarEdital(tj, { I: c(7, 15), II: c(40, 40), III: c(15, 15) });
  assert.ok(r.nota! > 8.5);
  assert.equal(r.habilitado, false);
  assert.equal(r.motivo, "Eliminado no Bloco I");
  assert.equal(r.blocos[0]!.eliminou, true);
});

test("TJ-SP: Bloco III só classifica, mas o total abaixo de 5 elimina", () => {
  const r = pontuarEdital(tj, { I: c(8, 15), II: c(20, 40), III: c(0, 15) });
  assert.equal(r.blocos.some((b) => b.eliminou), false);
  assert.ok(r.nota! < 5);
  assert.equal(r.habilitado, false);
  assert.match(r.motivo!, /^Eliminado na nota final: 4,00 abaixo de 5,00$/);
});

test("TRF3: média ponderada (Gerais peso 1, Específicos peso 2) e mínimo 6", () => {
  // Gerais 18/24 = 7,5; Específicos 18/36 = 5 → (7,5 + 2 × 5) / 3 = 5,83: passa nos 50%, fica abaixo de 6.
  const r = pontuarEdital(trf, { gerais: c(18, 24), especificos: c(18, 36) });
  assert.ok(Math.abs(r.nota! - 17.5 / 3) < 1e-9);
  assert.equal(r.corte, 6);
  assert.equal(r.habilitado, false);
  assert.match(r.motivo!, /nota final/);
  // Inverter as notas muda a média: 5 e 7,5 → (5 + 15) / 3 = 6,67, habilitado.
  const r2 = pontuarEdital(trf, { gerais: c(12, 24), especificos: c(27, 36) });
  assert.ok(Math.abs(r2.nota! - 20 / 3) < 1e-9);
  assert.equal(r2.habilitado, true);
  // Abaixo de 50% numa prova elimina, mesmo com média alta.
  const r3 = pontuarEdital(trf, { gerais: c(11, 24), especificos: c(36, 36) });
  assert.equal(r3.habilitado, false);
  assert.equal(r3.motivo, "Eliminado em Conhecimentos Gerais");
  const r4 = pontuarEdital(trf, { gerais: c(1, 24), especificos: c(2, 36) });
  assert.equal(r4.motivo, "Eliminado em Conhecimentos Gerais e em Conhecimentos Específicos");
});

test("simulado reduzido: blocos sem questões ficam fora da média", () => {
  const r = pontuarEdital(trf, { gerais: c(0, 0), especificos: c(10, 18) });
  assert.ok(Math.abs(r.nota! - (10 * 10) / 18) < 1e-9);
  assert.equal(r.blocos[0]!.eliminou, false);
});

test("contagem: em branco erra; anuladas contam como acerto na prova anterior", () => {
  const qs = [
    { id: "1", bloco: "I", gab: "A" },
    { id: "2", bloco: "I", gab: "B" },
    { id: "3", bloco: "I", gab: "C", anulada: true },
    { id: "4", bloco: "II", gab: "D" },
  ];
  const resp = { "1": "A", "2": "C", "4": undefined };
  assert.deepEqual(contar(qs, resp, "acerto"), { I: c(2, 3), II: c(0, 1, 1) });
  assert.deepEqual(contar(qs, resp, "fora"), { I: c(1, 2), II: c(0, 1, 1) });
  const s = pontuarSimples([{ id: "I", nome: "a" }, { id: "II", nome: "b" }], contar(qs, resp, "acerto"));
  assert.equal(s.habilitado, null);
  assert.equal(s.acertos, 2);
  assert.equal(s.total, 4);
  assert.equal(s.nota, 5);
});

test("distribuição: maior resto, com teto", () => {
  assert.deepEqual(distribuir(8, [3, 3, 4, 5]), [2, 1, 2, 3]);
  assert.deepEqual(distribuir(10, [5, 5]), [5, 5]);
  assert.deepEqual(distribuir(10, [1, 9], [1, 9]), [1, 9]);
  assert.deepEqual(distribuir(10, [9, 1], [3, 100]), [3, 7]);
  assert.deepEqual(distribuir(5, [0, 2], [0, 2]), [0, 2]);
});

test("plano: cotas do edital no Bloco III e proporção do banco nos outros", () => {
  const disp = {
    I: { portugues: 64 },
    II: { penal: 25, "processo-penal": 19, "processo-civil": 23, constitucional: 23, administrativo: 17, civil: 18, "legislacao-especial": 15 },
    III: { atualidades: 2, matematica: 18, "raciocinio-logico": 16, informatica: 25 },
  };
  const completo = planejar(tj.blocos, disp, "completo");
  assert.deepEqual(completo.map((b) => b.pedidas), [15, 40, 15]);
  const iii = completo[2]!;
  assert.deepEqual(iii.materias.map((m) => [m.materia, m.pedidas, m.montadas]), [
    ["atualidades", 3, 2],
    ["matematica", 3, 3],
    ["raciocinio-logico", 4, 4],
    ["informatica", 5, 5],
  ]);
  assert.equal(iii.montadas, 14);
  const ii = completo[1]!;
  assert.equal(ii.materias.reduce((s, m) => s + m.pedidas, 0), 40);
  assert.equal(ii.montadas, 40);
  const reduzido = planejar(tj.blocos, disp, "reduzido");
  assert.deepEqual(reduzido.map((b) => b.pedidas), [8, 20, 8]);
  assert.deepEqual(reduzido[2]!.materias.map((m) => m.pedidas), [2, 1, 2, 3]);
  // Banco menor que o bloco: entra tudo o que há.
  const pouco = planejar(tj.blocos, { II: { penal: 5, civil: 3 } }, "completo")[1]!;
  assert.equal(pouco.montadas, 8);
  assert.equal(pouco.pedidas, 40);
});

test("escolha: nunca respondidas primeiro, depois as mais antigas; texto-base junto", () => {
  const q = (id: string, ultima?: string, tx?: string, n = 0) => ({ id, prova: "p", ultima, tx, n });
  const lista = [q("a", "2026-01-05"), q("b"), q("c", "2026-01-01"), q("t1", "2026-01-02", "T1", 1), q("t2", undefined, "T1", 2)];
  const r = escolher(lista, 4, () => 0.5).map((x) => x.id);
  assert.equal(r.length, 4);
  assert.ok(r.includes("b") && r.includes("t1") && r.includes("t2") && r.includes("c"));
  assert.equal(r.indexOf("t2"), r.indexOf("t1") + 1);
  assert.deepEqual(escolher(lista, 1, () => 0.5).length, 1);
});

test("faixas, cargos e tempo", () => {
  const bl = [
    { id: "I", questoes: "1-20" },
    { id: "II", questoes: "21-78" },
  ];
  assert.equal(blocoDoNumero(bl, 20), "I");
  assert.equal(blocoDoNumero(bl, 21), "II");
  assert.equal(blocoDoNumero(bl, "d1"), null);
  assert.ok(mesmoCargo("Oficial de Justiça", "oficial de justica"));
  assert.ok(!mesmoCargo("Analista Judiciário – Área Judiciária", trf.blocos[0]!.nome));
  assert.equal(duracaoSimulado(tj.objetiva, 70, "completo"), 300);
  assert.equal(duracaoSimulado(tj.objetiva, 36, "reduzido"), Math.round((300 * 36) / 70));
  assert.equal(duracaoSimulado({}, 10, "completo"), null);
  assert.equal(fmtRelogio(3723000), "1:02:03");
  assert.equal(fmtRelogio(125000), "2:05");
});
