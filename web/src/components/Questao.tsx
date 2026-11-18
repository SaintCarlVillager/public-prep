"use client";
// Questão de múltipla escolha: enunciado, figuras, alternativas e, depois da entrega, a correção
// (gabarito, comentário por alternativa, explicação e lei seca). Usada na Sessão e no Simulado.

import type { ReactNode } from "react";

import { IconeCerto, IconeErrado, Md, SelosEdital } from "~/components/Comum";
import { Dispositivos } from "~/components/LeiSeca";
import { caminhoDados, type Base } from "~/lib/catalogo";
import { materiaDe } from "~/lib/nucleo";
import type { Questao, TextoBase } from "~/lib/tipos";

export function TextoBaseQuestao({ t, aberto = true }: { t: TextoBase; aberto?: boolean }) {
  return (
    <details className="texto" open={aberto}>
      <summary>{t.titulo ?? "Texto-base"}</summary>
      <Md className="corpo" texto={t.texto} />
      {t.fonte && (
        <small>
          <Md inline texto={t.fonte} />
        </small>
      )}
    </details>
  );
}

function SeloFonte({ base, q }: { base: Base; q: Questao }) {
  const pr = base.provas[q.prova];
  return (
    <span className="pill">
      {q.banca ?? pr?.banca} {q.ano ?? pr?.ano} · {pr?.orgao} · Q{q.numero}
    </span>
  );
}

export function CartaoQuestao({
  base,
  q,
  num,
  escolhida,
  corrigida,
  anuladaContaAcerto,
  ocultarAnulada,
  onMarcar,
  ancora,
  extraMeta,
}: {
  base: Base;
  q: Questao;
  /** Número exibido ("01"). */
  num: string;
  escolhida?: string;
  /** Depois da entrega: mostra gabarito, comentários e lei seca. */
  corrigida: boolean;
  /** Prova anterior: anulada conta como acerto para todos. */
  anuladaContaAcerto?: boolean;
  /** Antes da entrega, não avisa que a questão foi anulada (como na prova de verdade). */
  ocultarAnulada?: boolean;
  onMarcar?: (letra: string) => void;
  ancora?: string;
  extraMeta?: ReactNode;
}) {
  const anulada = !!(q.anulada || base.idx[q.id]?.anulada);
  const faltaAlt = !q.exp_alt || Object.keys(q.alt ?? {}).some((L) => !q.exp_alt?.[L]);
  const tema = (q.temas ?? []).map(base.nomeTema).slice(0, 2).join(" · ");
  return (
    <article className="q" id={ancora}>
      <div className="meta">
        <span className="num">{num}</span>
        <span className="eyebrow">
          {base.nomeMateria(materiaDe(q))}
          {tema ? ` · ${tema}` : ""}
        </span>
        {extraMeta}
        {corrigida &&
          (anulada ? (
            <span className="pill mute">{anuladaContaAcerto ? "anulada · conta como acerto" : "anulada · não conta"}</span>
          ) : !escolhida ? (
            <span className="pill bad">em branco · gabarito {q.gab}</span>
          ) : escolhida === q.gab ? (
            <span className="pill">acertou</span>
          ) : (
            <span className="pill bad">errou · gabarito {q.gab}</span>
          ))}
        {corrigida && <SeloFonte base={base} q={q} />}
        {corrigida && <SelosEdital base={base} qid={q.id} />}
        {corrigida && q.desatualizada && <span className="pill warn">desatualizada</span>}
        {!corrigida && anulada && !ocultarAnulada && <span className="pill mute">anulada</span>}
      </div>
      <Md className="stem" texto={q.enunciado} />
      {!!q.imagens?.length && (
        <div className="figs">
          {q.imagens.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={caminhoDados(src)} alt="Figura da questão" loading="lazy" />
          ))}
        </div>
      )}
      <div className="alts">
        {Object.entries(q.alt ?? {}).map(([L, txt]) => {
          let cls = "alt";
          if (corrigida) {
            if (L === q.gab && !anulada) cls += " right";
            else if (L === escolhida && !anulada) cls += " wrong";
          }
          const botao = (
            <button
              key={L}
              type="button"
              className={cls}
              aria-pressed={escolhida === L}
              aria-disabled={corrigida ? true : undefined}
              onClick={() => !corrigida && onMarcar?.(L)}
            >
              {corrigida && !anulada && L === q.gab && (
                <span className="v">
                  <IconeCerto />
                  {escolhida === L ? "Correta · sua resposta" : "Correta"}
                </span>
              )}
              {corrigida && !anulada && L !== q.gab && L === escolhida && (
                <span className="v">
                  <IconeErrado />
                  Sua resposta
                </span>
              )}
              <span className="l">{L}</span>
              <Md inline texto={txt} />
            </button>
          );
          const ca = corrigida && q.exp_alt?.[L];
          return ca ? (
            <div key={L} className="altbox">
              {botao}
              <div className="exp exp-alt">
                <span className="eyebrow">Comentário da alternativa {L}</span>
                <Md texto={ca} />
              </div>
            </div>
          ) : (
            botao
          );
        })}
      </div>
      {corrigida && q.exp && faltaAlt && (
        <div className="exp">
          {q.exp_alt && (
            <span className="eyebrow" style={{ display: "block", marginBottom: 6 }}>
              Comentário da questão
            </span>
          )}
          <Md texto={q.exp} />
        </div>
      )}
      {corrigida && q.desatualizada && (
        <div className="note">
          <b>Desatualizada:</b> <Md inline texto={q.desatualizada} />
        </div>
      )}
      {corrigida && !!q.observacoes?.length && (
        <div className="note">
          <b>Observações</b>
          <ul>
            {q.observacoes.map((o) => (
              <li key={o}>
                <Md inline texto={o} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {corrigida && <Dispositivos base={base} lista={q.dispositivos} />}
    </article>
  );
}
