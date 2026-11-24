"use client";
// Questão de múltipla escolha: enunciado, figuras, alternativas e, depois da entrega, a correção
// (gabarito, comentário por alternativa, explicação e lei seca). Usada na Sessão e no Simulado.

import type { ReactNode } from "react";

import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { IconeCerto, IconeErrado, Md, SelosEdital } from "~/components/Comum";
import { Dispositivos } from "~/components/LeiSeca";
import { caminhoDados, type Base } from "~/lib/catalogo";
import { materiaDe } from "~/lib/nucleo";
import type { Questao, TextoBase } from "~/lib/tipos";

/* Fica no painel.css (DESIGN.md): o texto de leitura em Literata (.stem, .exp, details.texto), a alternativa com a
   letra no quadrado e os estados depois da entrega (.alt) e os selos (.pill). O resto é Astryx. */

/** Texto-base num <details> nativo: abre sozinho na busca da página (Ctrl+F) e mantém a leitura em Literata. */
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
    <Card id={ancora} padding={0} className="min-w-0">
      <VStack as="article" gap={4} paddingBlock={6} paddingInline={4} className="min-w-0 sm:px-6">
        <HStack gap={2} align="center" wrap="wrap">
          <Text weight="semibold" hasTabularNumbers>
            {num}
          </Text>
          <Text className="eyebrow">
            {base.nomeMateria(materiaDe(q))}
            {tema ? ` · ${tema}` : ""}
          </Text>
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
        </HStack>
        <Md className="stem" texto={q.enunciado} />
        {!!q.imagens?.length && (
          <VStack gap={2} className="figs">
            {q.imagens.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={caminhoDados(src)} alt="Figura da questão" loading="lazy" />
            ))}
          </VStack>
        )}
        <VStack gap={3}>
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
                // Duplo clique/toque não desmarca o que o primeiro marcou (detail 2 = segundo clique seguido).
                onClick={(e) => !corrigida && e.detail < 2 && onMarcar?.(L)}
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
              <VStack key={L} gap={1.5}>
                {botao}
                <div className="exp exp-alt">
                  <Text className="eyebrow" display="block">
                    Comentário da alternativa {L}
                  </Text>
                  <Md texto={ca} />
                </div>
              </VStack>
            ) : (
              botao
            );
          })}
        </VStack>
        {corrigida && q.exp && faltaAlt && (
          <VStack gap={1.5} className="exp">
            {q.exp_alt && <Text className="eyebrow">Comentário da questão</Text>}
            <Md texto={q.exp} />
          </VStack>
        )}
        {corrigida && q.desatualizada && (
          // Atenção (--warn) com palavra, como pede o DESIGN.md; o texto vai no corpo, no tamanho de leitura.
          <Banner status="warning" title="Desatualizada" collapsible={false}>
            <Text as="p">
              <Md inline texto={q.desatualizada} />
            </Text>
          </Banner>
        )}
        {corrigida && !!q.observacoes?.length && (
          <Banner status="warning" title="Observações" collapsible={false}>
            <List listStyle="disc" density="compact" edge="flush">
              {q.observacoes.map((o) => (
                <ListItem
                  key={o}
                  label={
                    <Text className="whitespace-normal">
                      <Md inline texto={o} />
                    </Text>
                  }
                />
              ))}
            </List>
          </Banner>
        )}
        {corrigida && <Dispositivos base={base} lista={q.dispositivos} />}
      </VStack>
    </Card>
  );
}
