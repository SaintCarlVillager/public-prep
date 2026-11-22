"use client";

import { useEffect, useRef, useState } from "react";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { ComCatalogo, IconeCerto, IconeErrado, Md, SelosEdital } from "~/components/Comum";
import { Dispositivos } from "~/components/LeiSeca";
import { julgarCard } from "~/lib/acoes";
import { carregarProva, type Base, type ProvaCarregada } from "~/lib/catalogo";
import { estadoTreino, ordemNovos, placarTreino, todosCards } from "~/lib/estudo";
import { hoje, materiaDe, montarTreino, slugDe, type Card as CardVF } from "~/lib/nucleo";
import { useProgresso } from "~/lib/progresso";

const TREINO_N = 10;

export default function PaginaTreino() {
  return <ComCatalogo>{(b) => <Treino base={b} />}</ComCatalogo>;
}

interface Rodada {
  cards: CardVF[];
  provas: Record<string, ProvaCarregada>;
  pos: number;
  acertos: number;
  resposta: boolean | null;
}

function Treino({ base }: { base: Base }) {
  const p = useProgresso();
  const P = placarTreino(base, p, hoje());
  const [r, setR] = useState<Rodada | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "info" | "carregando" | "erro"; texto: string } | null>(null);
  const emAndamento = !!r && r.pos < r.cards.length;

  async function comecar() {
    const cards = montarTreino(ordemNovos(base, p, todosCards(base)), estadoTreino(p), hoje(), TREINO_N);
    if (!cards.length) return setAviso({ tipo: "info", texto: "Nada para revisar hoje e nenhum card novo. Volte amanhã." });
    setAviso({ tipo: "carregando", texto: "Carregando os cards…" });
    try {
      const slugs = [...new Set(cards.map((c) => slugDe(c.qid)))];
      const provas = Object.fromEntries(await Promise.all(slugs.map(async (s) => [s, await carregarProva(s)] as const)));
      setAviso(null);
      setR({ cards, provas, pos: 0, acertos: 0, resposta: null });
    } catch {
      setAviso({ tipo: "erro", texto: "Não consegui carregar as questões do treino. Recarregue a página." });
    }
  }

  return (
    // min-w-0: a coluna do app é um grid, e sem isto um texto longo alarga a página no celular.
    <VStack gap={6} className="min-w-0">
      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <VStack gap={1} className="min-w-0">
              <Heading level={2}>Treino</Heading>
              <Text type="supporting" color="secondary">
                Cada alternativa vira um card de verdadeiro ou falso
              </Text>
            </VStack>
            <Button label={`Começar ${TREINO_N} cards`} variant="primary" isDisabled={!P.total || emAndamento} onClick={comecar} />
          </HStack>
          {P.total ? (
            <HStack gap={4} wrap="wrap">
              <Text type="supporting" color="secondary" hasTabularNumbers>
                <Num>{P.total}</Num> cards de {P.questoes} questões
              </Text>
              <Text type="supporting" color="secondary" hasTabularNumbers>
                <Num>{P.vistos}</Num> vistos
              </Text>
              <Text type="supporting" color="secondary" hasTabularNumbers>
                <Num>{P.vencidos}</Num> para revisar hoje
              </Text>
              <Text type="supporting" color="secondary" hasTabularNumbers>
                {P.t ? (
                  <>
                    <Num>{`${Math.round((P.a / P.t) * 100)}%`}</Num> de acerto
                  </>
                ) : (
                  "nenhum respondido"
                )}
              </Text>
            </HStack>
          ) : (
            <Text type="supporting" color="secondary">
              Nenhuma questão marcada para o treino ainda.
            </Text>
          )}
        </VStack>
      </Card>
      {aviso &&
        (aviso.tipo === "carregando" ? (
          <HStack gap={2} align="center">
            <Spinner aria-label="Carregando" />
            <Text color="secondary">{aviso.texto}</Text>
          </HStack>
        ) : aviso.tipo === "erro" ? (
          <Banner status="error" title={aviso.texto} />
        ) : (
          <Text as="p" color="secondary" role="status">
            {aviso.texto}
          </Text>
        ))}
      {!r && !aviso && P.total > 0 && (
        <Card padding={6}>
          <Text as="p" color="secondary">
            Cada card mostra o enunciado de uma questão real e uma das alternativas. Diga se a afirmação é verdadeira ou falsa:
            toque nos botões ou arraste o card (esquerda = falso, direita = verdadeiro). Errou, o card volta amanhã; acertou,
            volta em 1, 3, 7, 15, 30 e 60 dias.
          </Text>
        </Card>
      )}
      {r && <CardTreino base={base} r={r} setR={setR} />}
    </VStack>
  );
}

/** Número em destaque no placar. */
function Num({ children }: { children: React.ReactNode }) {
  return (
    <Text type="inherit" weight="semibold" color="primary">
      {children}
    </Text>
  );
}

function CardTreino({ base, r, setR }: { base: Base; r: Rodada; setR: (r: Rodada | null) => void }) {
  const c = r.cards[r.pos];
  const q = c && r.provas[slugDe(c.qid)]?.porId[c.qid];
  const verdade = c && q?.vf?.[c.L];
  const proximo = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (r.resposta != null) proximo.current?.focus({ preventScroll: true });
  }, [r.resposta]);

  if (!c) {
    const n = r.cards.length;
    return (
      <Card padding={6}>
        <HStack gap={4} align="center" wrap="wrap">
          {/* Carimbo da nota: identidade do app (painel.css). */}
          <span className={`stamp ${r.acertos / n < 0.5 ? "low" : ""}`}>
            {r.acertos}/{n}
          </span>
          <VStack gap={1} className="min-w-0">
            <Text weight="semibold">Rodada concluída</Text>
            <Text as="p">Os cards errados voltam amanhã. Comece outra rodada quando quiser.</Text>
          </VStack>
        </HStack>
      </Card>
    );
  }
  if (!q || typeof verdade !== "boolean") {
    // Card que não se sustenta mais no arquivo publicado: pula.
    queueMicrotask(() => setR({ ...r, pos: r.pos + 1, resposta: null }));
    return null;
  }

  const julgar = (valor: boolean) => {
    if (r.resposta != null) return;
    const ok = valor === verdade;
    julgarCard(c.k, ok);
    setR({ ...r, resposta: valor, acertos: r.acertos + (ok ? 1 : 0) });
  };
  const tema = (q.temas ?? []).map(base.nomeTema).slice(0, 2).join(" · ");
  const ok = r.resposta === verdade;

  return (
    // .tf: o card de arrastar e o texto de leitura seguem no painel.css (identidade do Treino).
    <VStack gap={4} className="tf min-w-0">
      <Card padding={0}>
        <VStack gap={3} paddingBlock={6} paddingInline={4} className="min-w-0">
          <HStack gap={2} align="center" wrap="wrap">
            <Text weight="semibold" hasTabularNumbers>
              {r.pos + 1} de {r.cards.length}
            </Text>
            <Text className="eyebrow">
              {base.nomeMateria(materiaDe(q))}
              {tema ? ` · ${tema}` : ""}
            </Text>
            <SelosEdital base={base} qid={c.qid} />
          </HStack>
          <Md className="ctx" texto={q.enunciado} />
        </VStack>
      </Card>
      {r.resposta == null ? (
        <>
          <Arrastavel aoSoltar={julgar}>
            <span className="eyebrow">Alternativa {c.L} · verdadeira ou falsa?</span>
            <Md inline className="txt" texto={q.alt?.[c.L]} />
          </Arrastavel>
          <Grid columns={2} gap={3}>
            <Button label="← Falso" width="100%" onClick={() => julgar(false)} />
            <Button label="Verdadeiro →" width="100%" onClick={() => julgar(true)} />
          </Grid>
          <Text type="supporting" color="secondary" justify="center">
            Ou arraste o card: esquerda é falso, direita é verdadeiro.
          </Text>
        </>
      ) : (
        <>
          <div className={`afirm ${ok ? "ok" : "erro"}`}>
            <span className="veredito">
              {ok ? <IconeCerto /> : <IconeErrado />}
              {ok ? "Você acertou" : "Você errou"} · a afirmação é {verdade ? "verdadeira" : "falsa"}
            </span>
            <Md inline className="txt" texto={q.alt?.[c.L]} />
          </div>
          {q.exp_alt?.[c.L] ? (
            <VStack gap={1.5} className="exp">
              <Text className="eyebrow">Comentário da alternativa</Text>
              <Md texto={q.exp_alt[c.L]} />
            </VStack>
          ) : q.exp ? (
            <VStack gap={1.5} className="exp">
              <Text className="eyebrow">Comentário da questão · gabarito {q.gab}</Text>
              <Md texto={q.exp} />
            </VStack>
          ) : null}
          <Dispositivos base={base} lista={q.dispositivos} />
          <Button
            ref={proximo}
            label={r.pos + 1 < r.cards.length ? "Próximo card" : "Ver resultado"}
            variant="primary"
            onClick={() => setR({ ...r, pos: r.pos + 1, resposta: null })}
          />
        </>
      )}
    </VStack>
  );
}

function Arrastavel({ children, aoSoltar }: { children: React.ReactNode; aoSoltar: (v: boolean) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const x0 = useRef<number | null>(null);
  const [dx, setDx] = useState(0);
  const reduz = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const solta = () => {
    if (x0.current == null) return;
    x0.current = null;
    const w = el.current?.offsetWidth ?? 1;
    const d = dx;
    setDx(0);
    if (Math.abs(d) > w / 3) aoSoltar(d > 0);
  };
  return (
    <div
      ref={el}
      className={`afirm${x0.current != null ? " arrastando" : ""}${dx > 24 ? " lado-v" : ""}${dx < -24 ? " lado-f" : ""}`}
      style={{ transform: !reduz && dx ? `translateX(${dx}px) rotate(${dx / 30}deg)` : undefined }}
      onPointerDown={(e) => {
        x0.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => x0.current != null && setDx(e.clientX - x0.current)}
      onPointerUp={solta}
      onPointerCancel={solta}
    >
      {children}
    </div>
  );
}
