"use client";

import type { ReactNode } from "react";

import { Banner } from "@astryxdesign/core/Banner";
import { HStack } from "@astryxdesign/core/HStack";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { useCatalogo, type Base } from "~/lib/catalogo";
import { ativos, ehFederal } from "~/lib/estudo";
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
      <Banner
        status="error"
        title="Não consegui carregar as questões"
        description={
          <>
            Recarregue a página; se continuar, rode <code>python3 scripts/empacotar.py</code> e publique de novo. Detalhe: {erro}.
          </>
        }
        collapsible={false}
      />
    );
  if (!base)
    return (
      <HStack gap={2} align="center" role="status">
        <Spinner size="sm" aria-label="Carregando" />
        <Text color="secondary">Carregando questões e progresso…</Text>
      </HStack>
    );
  return <>{children(base)}</>;
}

export function SelosEdital({ base, qid }: { base: Base; qid: string }) {
  const p = useProgresso();
  const eds = ativos(base, p).filter((e) => base.rel(qid, e));
  return (
    <>
      {eds.map((e) => (
        <span key={e.id} className={`pill ${eds.length >= 2 ? "both" : ehFederal(e) ? "fed" : "tj"}`}>
          {base.rotulo(e)}
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
    // O trilho, o preenchimento e o traço da nota de corte são do painel.css (DESIGN.md, "Medidor").
    <VStack gap={1.5}>
      <HStack justify="between" align="end" gap={2}>
        <Text weight="semibold" className="min-w-0">
          {rotulo}
        </Text>
        <Text size="sm" color="secondary" hasTabularNumbers className="whitespace-nowrap">
          {v.a}/{v.t} · {v.t ? `${p}%` : "—"}
        </Text>
      </HStack>
      <div className="track">
        <div className={`fill${baixo ? " low" : ""}`} style={{ width: `${p}%` }} />
        {corte != null && (
          <div className="cut" style={{ left: `calc(${corte * 100}% - 1px)` }} title={`mínimo ${Math.round(corte * 100)}%`} />
        )}
      </div>
      {sub && (
        <Text size="sm" color="secondary">
          {sub}
        </Text>
      )}
    </VStack>
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
