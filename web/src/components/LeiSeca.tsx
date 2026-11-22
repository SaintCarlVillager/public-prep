"use client";
// Lei seca: o texto oficial de um artigo citado por uma questão, aberto ali mesmo.

import { useState } from "react";

import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { useLei, type Base } from "~/lib/catalogo";
import { parseDispositivo } from "~/lib/nucleo";
import type { ArtigoLei } from "~/lib/tipos";

export const linkArtigo = (sigla: string, art?: string) =>
  `/lei?n=${encodeURIComponent(sigla)}${art ? `#a-${encodeURIComponent(art)}` : ""}`;

/** Rótulo do artigo no começo da linha: "Art. 246.", "Artigo 1º -", "Art. 1.015". */
const ROTULO = /^\s*Art(?:igo|\.)\s*[\d.]+\s*[º°o]?(?:\s*[-–]\s*[A-Z]{1,2}\b)?\.?/;

/** Texto do artigo, uma linha por dispositivo (caput, parágrafos, incisos). Texto de leitura em Literata (.lei-texto). */
export function TextoArtigo({ artigo }: { artigo: ArtigoLei }) {
  return (
    <VStack className="lei-texto">
      {artigo.texto.split("\n").map((linha, i) => {
        if (!linha.trim()) return null;
        const m = ROTULO.exec(linha);
        return (
          <p key={i}>
            {m ? (
              <>
                <strong>{m[0]}</strong>
                {linha.slice(m[0].length)}
              </>
            ) : (
              linha
            )}
          </p>
        );
      })}
    </VStack>
  );
}

/** O que fazer quando a lei não carrega: sem internet, a norma só abre se já estiver guardada no aparelho. */
export const dicaErroLei = () =>
  typeof navigator !== "undefined" && !navigator.onLine
    ? "Você está sem internet e esta norma ainda não foi guardada no aparelho. Em Ajustes, dá para baixar a lei seca toda."
    : "Recarregue a página.";

function ArtigoAberto({ sigla, art, base }: { sigla: string; art: string; base: Base }) {
  const { lei, erro } = useLei(sigla);
  if (erro)
    return (
      <Text as="p" color="secondary" role="status">
        Não consegui carregar a lei seca. {dicaErroLei()}
      </Text>
    );
  if (!lei)
    return (
      <HStack gap={2} align="center" role="status">
        <Spinner size="sm" aria-label="Carregando" />
        <Text color="secondary">Carregando o artigo…</Text>
      </HStack>
    );
  const a = lei.porArt[art];
  return (
    <Card variant="muted" padding={4}>
      <VStack gap={2} align="start">
        <Text className="eyebrow">
          {base.cat.normas[sigla] ?? sigla}
          {a?.local ? ` · ${a.local}` : ""}
        </Text>
        {a ? (
          <TextoArtigo artigo={a} />
        ) : (
          <Text as="p" color="secondary">
            O art. {art} não está no texto vigente desta norma (pode ter sido renumerado ou revogado).
          </Text>
        )}
        <Link href={linkArtigo(sigla, art)} color="primary" hasUnderline>
          Abrir na lei seca
        </Link>
      </VStack>
    </Card>
  );
}

/** Dispositivos citados pela questão; os que têm lei seca abrem o texto do artigo. */
export function Dispositivos({ base, lista }: { base: Base; lista?: string[] }) {
  const [aberto, setAberto] = useState<string | null>(null);
  if (!lista?.length) return null;
  const temLei = (d: string) => {
    const p = parseDispositivo(d);
    return !!p && !!base.cat.leis?.[p.sigla];
  };
  const p = aberto ? parseDispositivo(aberto) : null;
  return (
    // Os chips ficam no painel.css: abrem o artigo ali mesmo (aria-expanded), com a borda de 2 px quando abertos.
    <VStack gap={2}>
      <Text className="eyebrow">Lei seca</Text>
      <HStack gap={2} wrap="wrap">
        {lista.map((d) =>
          temLei(d) ? (
            <button
              key={d}
              type="button"
              className="chip"
              aria-expanded={aberto === d}
              onClick={() => setAberto(aberto === d ? null : d)}
            >
              {d}
            </button>
          ) : (
            <span key={d} className="chip sem" title="Lei seca desta norma ainda não cadastrada">
              {d}
            </span>
          ),
        )}
      </HStack>
      {p && <ArtigoAberto key={aberto} sigla={p.sigla} art={p.artigo} base={base} />}
    </VStack>
  );
}
