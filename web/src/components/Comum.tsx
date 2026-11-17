"use client";

import type { ReactNode } from "react";

import { useCatalogo, type Base } from "~/lib/catalogo";
import { ativos, sigla } from "~/lib/estudo";
import { md, mdInline, pct } from "~/lib/nucleo";
import { useProgresso } from "~/lib/progresso";

/** Texto da prova com o mini-markdown do repositório (o HTML é escapado antes). */
export function Md({ texto, inline, className }: { texto?: string; inline?: boolean; className?: string }) {
  const html = inline ? mdInline(texto) : md(texto);
  return inline ? (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/** Mostra o conteúdo só quando o catálogo carregou; antes disso, o aviso de carregamento ou de erro. */
export function ComCatalogo({ children }: { children: (b: Base) => ReactNode }) {
  const { base, erro } = useCatalogo();
  if (erro)
    return (
      <div className="notice bad" role="status">
        Não consegui carregar as questões ({erro}). Recarregue a página; se continuar, rode{" "}
        <code>python3 scripts/empacotar.py</code> e publique de novo.
      </div>
    );
  if (!base)
    return (
      <div className="notice" role="status">
        Carregando questões e progresso…
      </div>
    );
  return <>{children(base)}</>;
}

export function SelosEdital({ base, qid }: { base: Base; qid: string }) {
  const p = useProgresso();
  const eds = ativos(base, p).filter((e) => base.rel(qid, e));
  return (
    <>
      {eds.map((e) => (
        <span key={e.id} className={`pill ${eds.length >= 2 ? "both" : /^TRF/i.test(sigla(e)) ? "fed" : "tj"}`}>
          {sigla(e)}
        </span>
      ))}
    </>
  );
}

export function Medidor({
  rotulo,
  v,
  corte,
  sub,
}: {
  rotulo: string;
  v: { a: number; t: number };
  corte?: number | null;
  sub?: string;
}) {
  const p = pct(v.a, v.t);
  const baixo = corte != null && v.t > 0 && v.a / v.t < corte;
  return (
    <div className="meter">
      <div className="top">
        <span>{rotulo}</span>
        <span className="mono">
          {v.a}/{v.t} · {v.t ? `${p}%` : "—"}
        </span>
      </div>
      <div className="track">
        <div className={`fill${baixo ? " low" : ""}`} style={{ width: `${p}%` }} />
        {corte != null && (
          <div className="cut" style={{ left: `calc(${corte * 100}% - 1px)` }} title={`mínimo ${Math.round(corte * 100)}%`} />
        )}
      </div>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export const IconeCerto = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IconeErrado = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
