"use client";
// Progresso de quem estuda, guardado no navegador (localStorage).
// O formato espelha as coleções do banco do painel antigo (sessoes, respostas, estado, treino, meta/config),
// para que um export dele possa ser importado aqui e, depois, sincronizado com um banco no servidor.

import { useSyncExternalStore } from "react";

import type { EstadoItem } from "./nucleo";
import type { PlanoBloco, Pontuacao } from "./simulado";

export interface Sessao {
  titulo: string;
  data: string;
  origem: "auto" | "claude" | string;
  questoes: string[];
}

export interface Resposta {
  respostas: Record<string, string>;
  acertos: number;
  total: number;
  entregueEm: string;
}

/** Um bloco do simulado: as questões dele, na ordem em que aparecem. */
export interface BlocoSimulado {
  id: string;
  nome: string;
  questoes: string[];
}

export interface TempoSimulado {
  /** Duração em minutos; null = sem cronômetro. */
  limite_min: number | null;
  /** Tempo ativo já gasto (só conta com o simulado aberto na tela e sem pausa). */
  usado_ms: number;
  pausas: number;
  pausado: boolean;
  /** O que a duração oficial inclui (ex.: a redação), quando vem do edital. */
  inclui?: string;
}

export interface ResultadoSimulado extends Pontuacao {
  entregueEm: string;
  usado_ms: number;
  pausas: number;
  /** Entregue sozinho quando o tempo acabou. */
  esgotado: boolean;
  /** Anuladas que contaram como acerto (prova anterior). */
  anuladas: number;
  /** A regra da nota, em texto (objetiva.nota do edital). */
  regra?: string;
}

/** Simulado: a prova do edital montada do banco, ou uma prova anterior inteira. */
export interface Simulado {
  titulo: string;
  /** Edital em que foi feito (dá a regra da nota e o rótulo). */
  edital: string;
  tipo: "edital" | "prova";
  tamanho: "completo" | "reduzido" | "inteira";
  /** Prova anterior (tipo "prova"). */
  prova?: string;
  criado: string;
  questoes: string[];
  blocos: BlocoSimulado[];
  /** Plano do edital (pedidas × montadas por bloco e matéria), para avisar quando o banco não tem tudo. */
  plano?: PlanoBloco[];
  tempo: TempoSimulado;
  /** Respostas marcadas (até a entrega e depois). */
  marcadas: Record<string, string>;
  /** Questões marcadas para revisar depois. */
  revisar: string[];
  /** Questão aberta (índice em `questoes`). */
  pos: number;
  resultado?: ResultadoSimulado;
}

export interface Config {
  /** Ausente = todos os editais com prova futura. */
  editais_ativos?: string[];
  tamanho_sessao: number;
}

export interface Progresso {
  versao: 1;
  config: Config;
  sessoes: Record<string, Sessao>;
  respostas: Record<string, Resposta>;
  /** estado[<slug da prova>][<id da questão>] */
  estado: Record<string, Record<string, EstadoItem>>;
  /** treino[<slug da prova>]["<id da questão>|<letra>"] */
  treino: Record<string, Record<string, EstadoItem>>;
  /** Marcações ainda não entregues, por sessão. */
  rascunhos: Record<string, Record<string, string>>;
  /** Sessão aberta por último. */
  atual?: string;
  /** Simulados feitos e em andamento, por id ("sim-AAAA-MM-DD-HHMM"). */
  simulados: Record<string, Simulado>;
}

const CHAVE = "public-prep:progresso";

export const vazio = (): Progresso => ({
  versao: 1,
  config: { tamanho_sessao: 20 },
  sessoes: {},
  respostas: {},
  estado: {},
  treino: {},
  rascunhos: {},
  simulados: {},
});

let cache: Progresso | null = null;
const ouvintes = new Set<() => void>();
const SERVIDOR = vazio();

function ler(): Progresso {
  if (cache) return cache;
  try {
    const bruto = localStorage.getItem(CHAVE);
    cache = bruto ? normalizar(JSON.parse(bruto)) : vazio();
  } catch {
    cache = vazio();
  }
  return cache;
}

/** Aceita um export deste app ou um dump do banco do painel antigo ({sessoes, respostas, estado, treino, meta: {config}}). */
export function normalizar(dados: unknown): Progresso {
  const d = (dados ?? {}) as Record<string, unknown>;
  const base = vazio();
  const obj = <T>(v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as T) : undefined);
  const meta = obj<Record<string, unknown>>(d.meta);
  const config = obj<Partial<Config>>(d.config) ?? obj<Partial<Config>>(meta?.config);
  return {
    versao: 1,
    config: { ...base.config, ...config },
    sessoes: obj(d.sessoes) ?? {},
    respostas: obj(d.respostas) ?? {},
    estado: obj(d.estado) ?? {},
    treino: obj(d.treino) ?? {},
    rascunhos: obj(d.rascunhos) ?? {},
    atual: typeof d.atual === "string" ? d.atual : undefined,
    // Progresso de antes dos simulados não tem o campo.
    simulados: obj(d.simulados) ?? {},
  };
}

export function atualizar(fn: (p: Progresso) => Progresso | void) {
  const atual = structuredClone(ler());
  const novo = fn(atual) ?? atual;
  cache = novo;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(novo));
  } catch {
    // Navegação privada ou cota cheia: o progresso vale nesta aba, mas não fica gravado.
  }
  ouvintes.forEach((f) => f());
}

export function substituir(p: Progresso) {
  atualizar(() => p);
}

function assinar(f: () => void) {
  ouvintes.add(f);
  const aoMudarOutraAba = (e: StorageEvent) => {
    if (e.key === CHAVE) {
      cache = null;
      f();
    }
  };
  window.addEventListener("storage", aoMudarOutraAba);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", aoMudarOutraAba);
  };
}

export function useProgresso(): Progresso {
  return useSyncExternalStore(assinar, ler, () => SERVIDOR);
}

export function novoIdSessao(p: Progresso, agora = new Date()): string {
  const d = agora;
  const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const base = `${dia}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  let id = base;
  let i = 2;
  while (p.sessoes[id]) id = `${base}-${i++}`;
  return id;
}

export function novoIdSimulado(p: Progresso, agora = new Date()): string {
  const base = "sim-" + novoIdSessao({ ...p, sessoes: {} }, agora);
  let id = base;
  let i = 2;
  while (p.simulados[id] || p.sessoes[id]) id = `${base}-${i++}`;
  return id;
}
