"use client";
// Carrega o catálogo (dados/catalogo.json) uma vez e as provas sob demanda (dados/provas/<slug>.json).

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { rotuloEdital } from "./estudo";
import { relevancia } from "./nucleo";
import type { ArquivoProva, Catalogo, Edital, IndiceQuestao, Lei, Questao, ResumoProva } from "./tipos";

export interface Base {
  cat: Catalogo;
  /** Índice de todas as questões, por id. */
  idx: Record<string, IndiceQuestao>;
  provas: Record<string, ResumoProva>;
  editais: Edital[];
  /** Relevância memorizada (questão × edital). */
  rel: (qid: string, ed: Edital) => { bloco: string; materia: string } | null;
  nomeTema: (t: string) => string;
  nomeMateria: (m: string) => string;
  /** Rótulo curto do edital ("TRF3 Oficial", "TJ-SP Escrevente"). */
  rotulo: (e: Edital) => string;
}

type Estado = { base: Base; erro?: undefined } | { base?: undefined; erro?: string };

const Ctx = createContext<Estado>({});

export const caminhoDados = (rel: string) => `/dados/${rel}`;

async function buscar<T>(url: string, ms = 10000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

function montarBase(cat: Catalogo): Base {
  const idx: Record<string, IndiceQuestao> = {};
  for (const [prova, lista] of Object.entries(cat.indice)) for (const q of lista) idx[q.id] = { ...q, prova };
  const provas = Object.fromEntries(cat.provas.map((p) => [p.id, p]));
  const memo = new Map<string, ReturnType<typeof relevancia>>();
  return {
    cat,
    idx,
    provas,
    editais: cat.editais,
    rel(qid, ed) {
      const k = qid + "|" + ed.id;
      if (!memo.has(k)) {
        const m = idx[qid];
        memo.set(k, m ? relevancia(m, ed) : null);
      }
      return memo.get(k) ?? null;
    },
    nomeTema: (t) => cat.temas[t] ?? t,
    nomeMateria: (m) => cat.materias[m] ?? m,
    rotulo: rotuloEdital,
  };
}

export function CatalogoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({});
  useEffect(() => {
    buscar<Catalogo>(caminhoDados("catalogo.json"))
      .then((cat) => setEstado({ base: montarBase(cat) }))
      .catch((e: unknown) => setEstado({ erro: String(e instanceof Error ? e.message : e) }));
  }, []);
  return <Ctx.Provider value={estado}>{children}</Ctx.Provider>;
}

export const useCatalogo = () => useContext(Ctx);

/* ---------- provas ---------- */

export interface ProvaCarregada extends ArquivoProva {
  porId: Record<string, Questao>;
}
const cacheProvas = new Map<string, Promise<ProvaCarregada>>();

export function carregarProva(slug: string): Promise<ProvaCarregada> {
  let p = cacheProvas.get(slug);
  if (!p) {
    p = buscar<ArquivoProva>(caminhoDados(`provas/${slug}.json`)).then((d) => ({
      ...d,
      porId: Object.fromEntries(d.questoes.map((q) => [q.id, q])),
    }));
    p.catch(() => cacheProvas.delete(slug));
    cacheProvas.set(slug, p);
  }
  return p;
}

/* ---------- lei seca ---------- */

export interface LeiCarregada extends Lei {
  porArt: Record<string, Lei["artigos"][number]>;
}
const cacheLeis = new Map<string, Promise<LeiCarregada>>();

export function carregarLei(sigla: string): Promise<LeiCarregada> {
  let p = cacheLeis.get(sigla);
  if (!p) {
    p = buscar<Lei>(caminhoDados(`leis/${encodeURIComponent(sigla)}.json`), 20000).then((d) => ({
      ...d,
      porArt: Object.fromEntries(d.artigos.map((a) => [a.art, a])),
    }));
    p.catch(() => cacheLeis.delete(sigla));
    cacheLeis.set(sigla, p);
  }
  return p;
}

/** Carrega uma lei; devolve null enquanto carrega e `erro` se falhar. */
export function useLei(sigla: string | null): { lei: LeiCarregada | null; erro?: string } {
  const [res, setRes] = useState<{ sigla: string | null; lei: LeiCarregada | null; erro?: string }>({ sigla: null, lei: null });
  useEffect(() => {
    if (!sigla) return;
    let vivo = true;
    carregarLei(sigla)
      .then((lei) => vivo && setRes({ sigla, lei }))
      .catch((e: unknown) => vivo && setRes({ sigla, lei: null, erro: String(e) }));
    return () => {
      vivo = false;
    };
  }, [sigla]);
  return res.sigla === sigla ? res : { lei: null };
}

/** Carrega as provas indicadas; devolve null enquanto carrega. */
export function useProvas(slugs: string[]): { provas: Record<string, ProvaCarregada> | null; erro?: string } {
  const chave = useMemo(() => [...new Set(slugs)].sort().join(","), [slugs]);
  const [res, setRes] = useState<{ chave: string; provas: Record<string, ProvaCarregada> | null; erro?: string }>({
    chave: "",
    provas: null,
  });
  useEffect(() => {
    let vivo = true;
    const lista = chave ? chave.split(",") : [];
    Promise.all(lista.map((s) => carregarProva(s).then((p) => [s, p] as const)))
      .then((pares) => vivo && setRes({ chave, provas: Object.fromEntries(pares) }))
      .catch((e: unknown) => vivo && setRes({ chave, provas: null, erro: String(e) }));
    return () => {
      vivo = false;
    };
  }, [chave]);
  return res.chave === chave ? res : { provas: null };
}
