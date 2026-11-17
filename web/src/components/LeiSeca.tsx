"use client";
// Lei seca: o texto oficial de um artigo citado por uma questão, aberto ali mesmo.

import Link from "next/link";
import { useState } from "react";

import { useLei, type Base } from "~/lib/catalogo";
import { parseDispositivo } from "~/lib/nucleo";
import type { ArtigoLei } from "~/lib/tipos";

export const linkArtigo = (sigla: string, art?: string) =>
  `/lei?n=${encodeURIComponent(sigla)}${art ? `#a-${encodeURIComponent(art)}` : ""}`;

/** Rótulo do artigo no começo da linha: "Art. 246.", "Artigo 1º -", "Art. 1.015". */
const ROTULO = /^\s*Art(?:igo|\.)\s*[\d.]+\s*[º°o]?(?:\s*[-–]\s*[A-Z]{1,2}\b)?\.?/;

/** Texto do artigo, uma linha por dispositivo (caput, parágrafos, incisos). */
export function TextoArtigo({ artigo }: { artigo: ArtigoLei }) {
  return (
    <div className="lei-texto">
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
    </div>
  );
}

function ArtigoAberto({ sigla, art, base }: { sigla: string; art: string; base: Base }) {
  const { lei, erro } = useLei(sigla);
  if (erro) return <p className="empty">Não consegui carregar a lei seca. Recarregue a página.</p>;
  if (!lei) return <p className="empty">Carregando o artigo…</p>;
  const a = lei.porArt[art];
  return (
    <div className="artigo-aberto">
      <span className="eyebrow">
        {base.cat.normas[sigla] ?? sigla}
        {a?.local ? ` · ${a.local}` : ""}
      </span>
      {a ? (
        <TextoArtigo artigo={a} />
      ) : (
        <p className="empty">O art. {art} não está no texto vigente desta norma (pode ter sido renumerado ou revogado).</p>
      )}
      <Link href={linkArtigo(sigla, art)}>Abrir na lei seca</Link>
    </div>
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
    <div className="dispositivos">
      <span className="eyebrow">Lei seca</span>
      <div className="chips">
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
      </div>
      {p && <ArtigoAberto key={aberto} sigla={p.sigla} art={p.artigo} base={base} />}
    </div>
  );
}
