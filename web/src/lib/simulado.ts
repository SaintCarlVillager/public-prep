// Simulados: montagem pela estrutura do edital, pontuação pela regra do edital e tempo.
// Funções puras, sem React nem navegador; testes em simulado.test.ts (npm test).

import { agruparTextos, embaralhar } from "./nucleo.ts";
import type { Objetiva } from "./tipos.ts";

export type Tamanho = "completo" | "reduzido";

/* ---------- distribuição das questões ---------- */

/**
 * Reparte `n` vagas entre itens, proporcionalmente aos pesos, pelo método do maior resto
 * (cada item recebe a parte inteira da sua cota; as vagas que sobram vão para os maiores restos,
 * e no empate para o item que vem antes). Com `tetos`, nenhum item passa do seu teto e o que
 * sobrar é redistribuído entre os outros, na mesma proporção.
 */
export function distribuir(n: number, pesos: number[], tetos?: number[]): number[] {
  const out = pesos.map(() => 0);
  let livres = pesos.map((_, i) => i).filter((i) => (pesos[i] ?? 0) > 0 && (tetos?.[i] ?? Infinity) > 0);
  let resta = Math.max(0, Math.floor(n));
  while (resta > 0 && livres.length) {
    const soma = livres.reduce((s, i) => s + pesos[i]!, 0);
    const cotas = livres.map((i) => (resta * pesos[i]!) / soma);
    const parte = cotas.map(Math.floor);
    let sobra = resta - parte.reduce((s, x) => s + x, 0);
    const ordem = livres.map((_, k) => k).sort((a, b) => cotas[b]! - parte[b]! - (cotas[a]! - parte[a]!) || a - b);
    for (const k of ordem)
      if (sobra > 0) {
        parte[k] = parte[k]! + 1;
        sobra--;
      }
    let estourou = false;
    livres.forEach((i, k) => {
      const teto = tetos?.[i] ?? Infinity;
      const add = Math.min(parte[k]!, teto - out[i]!);
      if (add < parte[k]!) estourou = true;
      out[i] = out[i]! + add;
      resta -= add;
    });
    livres = livres.filter((i) => out[i]! < (tetos?.[i] ?? Infinity));
    if (!estourou) break;
  }
  return out;
}

export interface BlocoEdital {
  id: string;
  nome: string;
  questoes: number;
  peso?: number;
  minimo?: number | null;
  eliminatorio?: boolean;
  cobertura?: { materia: string; rotulo?: string; questoes?: number }[];
}

export interface PlanoMateria {
  materia: string;
  rotulo?: string;
  /** Quantas o simulado pede desta matéria (a cota do edital; sem cota, uma parte igual do bloco). */
  pedidas: number;
  /** Quantas o banco tem (relevantes, válidas). */
  disponiveis: number;
  /** Quantas entram: min(pedidas, disponíveis). */
  montadas: number;
}
export interface PlanoBloco {
  id: string;
  nome: string;
  pedidas: number;
  montadas: number;
  materias: PlanoMateria[];
}

/**
 * Plano do simulado do edital: quantas questões de cada bloco e de cada matéria.
 *
 * - Bloco: `blocos[].questoes` (completo) ou a metade, arredondada para cima (reduzido).
 * - Matérias com cota no edital (`cobertura[].questoes`, como o Bloco III do TJ-SP): a cota,
 *   reduzida na mesma proporção do bloco (maior resto). Se o banco não tem a cota inteira,
 *   entra o que houver e a falta é registrada; a vaga não passa para outra matéria, para
 *   o simulado não fugir da estrutura da prova.
 * - Matérias sem cota: as vagas restantes do bloco são repartidas em partes iguais entre as
 *   matérias que o banco tem (maior resto). Quem não tem questões suficientes cede a vaga às
 *   outras, para o bloco sair inteiro; só falta questão quando o banco não tem o bloco todo.
 *   Partes iguais seguem melhor o edital do que a proporção do banco, que deixaria as matérias
 *   com muitas questões cadastradas (Português, Direito do TJ-SP) dominarem o bloco.
 */
export function planejar(
  blocos: BlocoEdital[],
  disponiveis: Record<string, Record<string, number>>,
  tamanho: Tamanho,
): PlanoBloco[] {
  return blocos.map((b) => {
    const n = tamanho === "completo" ? b.questoes : Math.ceil(b.questoes / 2);
    const mats: { materia: string; rotulo?: string; cota?: number }[] = [];
    for (const c of b.cobertura ?? []) {
      const ja = mats.find((m) => m.materia === c.materia);
      if (ja) {
        if (c.questoes != null) ja.cota = (ja.cota ?? 0) + c.questoes;
      } else mats.push({ materia: c.materia, rotulo: c.rotulo, cota: c.questoes ?? undefined });
    }
    const disp = (m: string) => disponiveis[b.id]?.[m] ?? 0;
    const comCota = mats.filter((m) => m.cota != null);
    const semCota = mats.filter((m) => m.cota == null);
    const somaCotas = comCota.reduce((s, m) => s + m.cota!, 0);
    // A parte do bloco que não tem cota fica numa vaga "resto", repartida depois pelo banco.
    const resto = Math.max(0, b.questoes - somaCotas);
    const partes = comCota.length ? distribuir(n, [...comCota.map((m) => m.cota!), resto]) : [n];
    const pedidas = new Map<string, number>();
    comCota.forEach((m, i) => pedidas.set(m.materia, partes[i]!));
    const nResto = comCota.length ? partes[comCota.length]! : n;
    if (semCota.length) {
      // Partes iguais, limitadas ao que existe; se o banco não tem o bloco inteiro, a falta fica no bloco.
      const d = semCota.map((m) => disp(m.materia));
      const iguais = distribuir(nResto, d.map(() => 1), d);
      semCota.forEach((m, i) => pedidas.set(m.materia, iguais[i]!));
    }
    const materias = mats.map((m) => {
      const p = pedidas.get(m.materia) ?? 0;
      return { materia: m.materia, rotulo: m.rotulo, pedidas: p, disponiveis: disp(m.materia), montadas: Math.min(p, disp(m.materia)) };
    });
    return {
      id: b.id,
      nome: b.nome,
      pedidas: n,
      montadas: materias.reduce((s, m) => s + m.montadas, 0),
      materias,
    };
  });
}

/* ---------- escolha das questões ---------- */

export interface Candidata {
  id: string;
  prova: string;
  /** Texto-base (questões do mesmo texto ficam juntas). */
  tx?: string;
  n?: number | string;
  /** Data da última resposta (AAAA-MM-DD); ausente = nunca respondida. */
  ultima?: string;
}

/**
 * Escolhe até `n` questões de uma matéria. Questões do mesmo texto-base formam uma unidade.
 * Ordem de prioridade: unidades com alguma questão nunca respondida (sorteadas entre si),
 * depois as respondidas há mais tempo. Primeiro entram as unidades inteiras que cabem; se
 * ainda sobrar vaga, entram as primeiras questões das unidades que não couberam.
 */
export function escolher<T extends Candidata>(cands: T[], n: number, aleatorio: () => number = Math.random): T[] {
  const grupos = new Map<string, T[]>();
  for (const q of embaralhar(cands, aleatorio)) {
    const k = q.tx ? q.prova + "|" + q.tx : q.id;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(q);
  }
  const unidades = [...grupos.values()].map((g) => ({
    g: g.sort((a, b) => Number(a.n ?? 0) - Number(b.n ?? 0)),
    nunca: g.some((q) => !q.ultima),
    ultima: g.reduce((m, q) => (q.ultima && q.ultima < m ? q.ultima : m), "9999-99-99"),
  }));
  unidades.sort((a, b) => (a.nunca === b.nunca ? (a.nunca ? 0 : a.ultima.localeCompare(b.ultima)) : a.nunca ? -1 : 1));
  const out: T[] = [];
  const sobra: T[][] = [];
  for (const u of unidades) {
    if (out.length + u.g.length <= n) out.push(...u.g);
    else sobra.push(u.g);
  }
  for (const g of sobra) for (const q of g) if (out.length < n) out.push(q);
  return agruparTextos(out);
}

/* ---------- pontuação ---------- */

export interface Contagem {
  acertos: number;
  total: number;
  branco: number;
}

/** Acertos, total e em branco de cada bloco. Anuladas: `"acerto"` (prova anterior, prática da banca) ou `"fora"` (não contam). */
export function contar(
  questoes: { id: string; bloco: string; gab?: string; anulada?: boolean }[],
  respostas: Record<string, string | undefined>,
  anuladas: "acerto" | "fora",
): Record<string, Contagem> {
  const out: Record<string, Contagem> = {};
  for (const q of questoes) {
    const c = (out[q.bloco] ??= { acertos: 0, total: 0, branco: 0 });
    const r = respostas[q.id];
    if (q.anulada) {
      if (anuladas === "fora") continue;
      c.total++;
      c.acertos++;
      continue;
    }
    c.total++;
    if (!r) c.branco++;
    else if (r === q.gab) c.acertos++;
  }
  return out;
}

export interface ResultadoBloco {
  id: string;
  nome: string;
  acertos: number;
  total: number;
  branco: number;
  /** De 0 à escala (10); null sem questões. */
  nota: number | null;
  /** Fração mínima de acertos (0.5); null = sem mínimo. */
  minimo: number | null;
  eliminatorio: boolean;
  eliminou: boolean;
  peso: number;
}

export interface Pontuacao {
  blocos: ResultadoBloco[];
  acertos: number;
  total: number;
  branco: number;
  nota: number | null;
  /** Nota mínima da objetiva na escala (5, 6), quando o edital tem. */
  corte: number | null;
  /** null quando não há regra de habilitação (prova anterior). */
  habilitado: boolean | null;
  /** "Eliminado no Bloco II", "Eliminado na nota final: 4,6 abaixo de 5". */
  motivo?: string;
}

/** "Bloco II" quando o id é romano; senão o nome ("Conhecimentos Gerais"). */
export const rotuloBloco = (b: { id: string; nome: string }) => (/^[IVX]+$/.test(b.id) ? `Bloco ${b.id}` : b.nome);
const noBloco = (b: { id: string; nome: string }) => (/^[IVX]+$/.test(b.id) ? `no Bloco ${b.id}` : `em ${b.nome}`);

export const fmtNota = (x: number | null | undefined) =>
  x == null ? "—" : x.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EPS = 1e-9;

/**
 * Nota pela regra do edital, lida dos campos (nada escrito por concurso):
 * - cada bloco vale de 0 a `objetiva.escala` (acertos / total × escala);
 * - bloco `eliminatorio` com `minimo`: elimina abaixo dessa fração de acertos;
 * - `objetiva.media_ponderada`: nota = média das notas dos blocos com `blocos[].peso`,
 *   e habilita com nota ≥ `objetiva.minimo_media`;
 * - senão: nota = acertos / total do conjunto × escala, e habilita com nota ≥ `minimo_total` × escala.
 * Blocos sem nenhuma questão no simulado ficam fora da média e não eliminam.
 */
export function pontuarEdital(
  edital: { blocos?: BlocoEdital[]; objetiva?: Objetiva },
  contagem: Record<string, Contagem>,
): Pontuacao {
  const ob = edital.objetiva ?? {};
  const escala = ob.escala ?? 10;
  const blocos: ResultadoBloco[] = (edital.blocos ?? []).map((b) => {
    const c = contagem[b.id] ?? { acertos: 0, total: 0, branco: 0 };
    const minimo = b.minimo ?? null;
    const eliminatorio = !!b.eliminatorio && minimo != null;
    return {
      id: b.id,
      nome: b.nome,
      ...c,
      nota: c.total ? (escala * c.acertos) / c.total : null,
      minimo,
      eliminatorio,
      eliminou: eliminatorio && c.total > 0 && c.acertos / c.total < minimo! - EPS,
      peso: b.peso ?? 1,
    };
  });
  const comQuestoes = blocos.filter((b) => b.total > 0);
  const acertos = blocos.reduce((s, b) => s + b.acertos, 0);
  const total = blocos.reduce((s, b) => s + b.total, 0);
  const branco = blocos.reduce((s, b) => s + b.branco, 0);
  let nota: number | null;
  let corte: number | null;
  if (ob.media_ponderada) {
    const pesos = comQuestoes.reduce((s, b) => s + b.peso, 0);
    nota = pesos ? comQuestoes.reduce((s, b) => s + b.peso * b.nota!, 0) / pesos : null;
    corte = ob.minimo_media ?? null;
  } else {
    nota = total ? (escala * acertos) / total : null;
    corte = ob.minimo_total != null ? ob.minimo_total * escala : null;
  }
  const elim = blocos.filter((b) => b.eliminou);
  const abaixo = corte != null && nota != null && nota < corte - EPS;
  const motivo = elim.length
    ? `Eliminado ${elim.map(noBloco).join(" e ")}`
    : abaixo
      ? `Eliminado na nota final: ${fmtNota(nota)} abaixo de ${fmtNota(corte)}`
      : undefined;
  return { blocos, acertos, total, branco, nota, corte, habilitado: nota == null ? null : !elim.length && !abaixo, motivo };
}

/** Prova anterior: acertos e nota de 0 a 10 por bloco do caderno e no total, sem regra de habilitação. */
export function pontuarSimples(blocos: { id: string; nome: string }[], contagem: Record<string, Contagem>, escala = 10): Pontuacao {
  const rb: ResultadoBloco[] = blocos.map((b) => {
    const c = contagem[b.id] ?? { acertos: 0, total: 0, branco: 0 };
    return { id: b.id, nome: b.nome, ...c, nota: c.total ? (escala * c.acertos) / c.total : null, minimo: null, eliminatorio: false, eliminou: false, peso: 1 };
  });
  const acertos = rb.reduce((s, b) => s + b.acertos, 0);
  const total = rb.reduce((s, b) => s + b.total, 0);
  const branco = rb.reduce((s, b) => s + b.branco, 0);
  return { blocos: rb, acertos, total, branco, nota: total ? (escala * acertos) / total : null, corte: null, habilitado: null };
}

/* ---------- provas anteriores ---------- */

/** "1-20" → [1, 20]; "7" → [7, 7]. */
export function parseFaixa(s: string): [number, number] | null {
  const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(String(s));
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] : null;
}

/** Id do bloco do caderno em que cai o número da questão; null se não cai em nenhum. */
export function blocoDoNumero(blocos: { id: string; questoes: string }[], n: number | string): string | null {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  for (const b of blocos) {
    const f = parseFaixa(b.questoes);
    if (f && x >= f[0] && x <= f[1]) return b.id;
  }
  return null;
}

/** Blocos da prova anterior a partir das faixas do caderno; sem faixas, um bloco só. */
export function blocosDaProva(
  blocos: { id: string; nome: string; questoes: string }[] | undefined,
  qs: { id: string; n: number | string }[],
): { id: string; nome: string; questoes: string[] }[] {
  if (!blocos?.length) return [{ id: "", nome: "Prova inteira", questoes: qs.map((q) => q.id) }];
  const out = blocos.map((b) => ({ id: b.id, nome: b.nome, questoes: [] as string[] }));
  const fora: string[] = [];
  for (const q of qs) {
    const b = blocoDoNumero(blocos, q.n);
    const alvo = out.find((x) => x.id === b);
    if (alvo) alvo.questoes.push(q.id);
    else fora.push(q.id);
  }
  if (fora.length) out.push({ id: "outras", nome: "Outras questões", questoes: fora });
  return out.filter((b) => b.questoes.length);
}

const normalizarCargo = (s?: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Mesmo cargo: os nomes coincidem, ignorando acentos, caixa e pontuação. */
export const mesmoCargo = (a?: string, b?: string) => !!a && normalizarCargo(a) === normalizarCargo(b);

/* ---------- tempo ---------- */

/**
 * Duração do simulado do edital, em minutos: a duração oficial inteira no completo; no reduzido,
 * a mesma proporção das questões pedidas sobre as da objetiva. null se o edital não traz duração.
 */
export function duracaoSimulado(ob: Objetiva | undefined, pedidas: number, tamanho: Tamanho): number | null {
  if (!ob?.duracao_min) return null;
  if (tamanho === "completo" || !ob.questoes) return ob.duracao_min;
  return Math.max(1, Math.round((ob.duracao_min * pedidas) / ob.questoes));
}

/** 75 → "1h15"; 300 → "5h"; 45 → "45 min". */
export function fmtMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Relógio: 3723000 ms → "1:02:03"; 125000 → "2:05". */
export function fmtRelogio(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
