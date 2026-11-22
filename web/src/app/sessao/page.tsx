"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { ComCatalogo } from "~/components/Comum";
import { CartaoQuestao, TextoBaseQuestao } from "~/components/Questao";
import { apagarSessao, criarSessao, entregar, marcar } from "~/lib/acoes";
import { useProvas, type Base } from "~/lib/catalogo";
import { ativos, ehFederal, montarAutomatica } from "~/lib/estudo";
import { fmtDia, hoje, pct, slugDe } from "~/lib/nucleo";
import { atualizar, useProgresso, type Progresso } from "~/lib/progresso";
import type { Questao, TextoBase } from "~/lib/tipos";
import { avisar, confirmar } from "~/components/Dialogo";

export default function PaginaSessao() {
  return (
    <ComCatalogo>
      {(b) => (
        <Suspense>
          <Sessao base={b} />
        </Suspense>
      )}
    </ComCatalogo>
  );
}

function sessaoAtual(p: Progresso): string | null {
  if (p.atual && p.sessoes[p.atual]) return p.atual;
  const ids = Object.keys(p.sessoes).sort().reverse();
  return ids.find((id) => !p.respostas[id]) ?? ids[0] ?? null;
}

function Sessao({ base }: { base: Base }) {
  const p = useProgresso();
  const router = useRouter();
  const params = useSearchParams();
  const pedidoNova = useRef(false);

  const nova = () => {
    const qs = montarAutomatica(base, p, p.config.tamanho_sessao, hoje());
    if (!criarSessao("Sessão automática", qs)) void avisar("Nenhuma questão disponível para uma sessão agora.");
  };
  useEffect(() => {
    if (params.get("nova") && !pedidoNova.current) {
      pedidoNova.current = true;
      nova();
      router.replace("/sessao");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const id = sessaoAtual(p);
  const lista = Object.entries(p.sessoes).sort((a, b) => (b[1].data + b[0]).localeCompare(a[1].data + a[0]));

  return (
    // min-w-0: a coluna do app é um grid, e sem isto um título longo alarga a página no celular.
    <VStack gap={6} className="min-w-0">
      <HStack justify="between" align="end" gap={3} wrap="wrap">
        <VStack gap={1.5} className="min-w-0">
          <Text type="supporting" color="secondary" hasTabularNumbers>
            {id ? `Sessão · ${fmtDia(p.sessoes[id]!.data)} · ${p.sessoes[id]!.questoes.length} questões` : "Sessão"}
          </Text>
          <Heading level={2}>{id ? p.sessoes[id]!.titulo : "Nenhuma sessão ainda"}</Heading>
          {id && <Mistura base={base} qids={p.sessoes[id]!.questoes} />}
        </VStack>
        <Selector
          label="Sessões"
          width={280}
          isDisabled={!lista.length}
          placeholder="Nenhuma sessão"
          value={id ?? undefined}
          onChange={(v) =>
            atualizar((x) => {
              if (v) x.atual = v;
            })
          }
          options={lista.map(([sid, s]) => ({
            value: sid,
            label: `${s.titulo} · ${fmtDia(s.data)}${p.respostas[sid] ? " · entregue" : ""}`,
          }))}
        />
      </HStack>
      <HStack gap={2} wrap="wrap">
        <Button label="Nova sessão automática" variant="primary" onClick={nova} />
        {id && !p.respostas[id] && (
          <Button
            label="Apagar sessão"
            variant="ghost"
            onClick={async () => {
              if (await confirmar({ titulo: "Apagar esta sessão não entregue?", ok: "Apagar sessão", perigo: true })) apagarSessao(id);
            }}
          />
        )}
      </HStack>
      {id ? (
        <Questoes key={id} base={base} p={p} id={id} />
      ) : (
        <Card>
          <EmptyState
            title="Monte a sua primeira sessão"
            headingLevel={3}
            description="Toque em “Nova sessão automática”: o app junta revisões vencidas, temas fracos e questões nunca vistas do edital de prova mais próxima."
          />
        </Card>
      )}
    </VStack>
  );
}

function Mistura({ base, qids }: { base: Base; qids: string[] }) {
  const p = useProgresso();
  return (
    <HStack gap={1.5} wrap="wrap" align="center">
      {ativos(base, p).map((e) => {
        const n = qids.filter((q) => base.rel(q, e)).length;
        return n ? (
          <span key={e.id} className={`pill ${ehFederal(e) ? "fed" : "tj"}`}>
            {n} no {base.rotulo(e)}
          </span>
        ) : null;
      })}
    </HStack>
  );
}

function Questoes({ base, p, id }: { base: Base; p: Progresso; id: string }) {
  const s = p.sessoes[id]!;
  const feito = p.respostas[id];
  const { provas, erro } = useProvas(s.questoes.map(slugDe));
  if (erro)
    return <Banner status="error" title="Não consegui carregar as questões desta sessão." description="Recarregue a página." />;
  if (!provas)
    return (
      <HStack gap={2} align="center">
        <Spinner aria-label="Carregando" />
        <Text color="secondary">Carregando as questões…</Text>
      </HStack>
    );

  const completa = (qid: string) => provas[slugDe(qid)]?.porId[qid];
  const textoDe = (q: Questao): TextoBase | null => (q.texto ? (provas[slugDe(q.id)]?.textos[q.texto] ?? null) : null);
  const picks = feito ? feito.respostas : (p.rascunhos[id] ?? {});
  const textosVistos = new Set<string>();
  const respondidas = s.questoes.filter((q) => picks[q]).length;
  const porId = Object.fromEntries(s.questoes.map((q) => [q, completa(q)]).filter(([, q]) => q)) as Record<string, Questao>;

  return (
    <>
      {feito && (
        <Card padding={6}>
          <HStack gap={4} align="center" wrap="wrap">
            {/* Carimbo da nota: identidade do app (painel.css). */}
            <span className={`stamp ${pct(feito.acertos, feito.total) < 50 ? "low" : ""}`}>
              {feito.acertos}/{feito.total}
            </span>
            <VStack gap={1} className="min-w-0">
              <Text weight="semibold">Sessão entregue</Text>
              <Text type="supporting" color="secondary" hasTabularNumbers>
                {new Date(feito.entregueEm).toLocaleString("pt-BR")}
              </Text>
              <Text as="p">Abaixo, cada questão com gabarito e explicação. As erradas voltam amanhã na aba Revisões.</Text>
            </VStack>
          </HStack>
        </Card>
      )}
      <VStack gap={4}>
        {s.questoes.map((qid, i) => {
          const q = completa(qid);
          const num = String(i + 1).padStart(2, "0");
          if (!q)
            return (
              <Card key={qid} padding={6}>
                <VStack gap={4}>
                  <HStack gap={2} align="center" wrap="wrap">
                    <Text weight="semibold" hasTabularNumbers>
                      {num}
                    </Text>
                    <span className="pill warn">indisponível</span>
                  </HStack>
                  <Text as="p" color="secondary">
                    A questão {qid} não está no catálogo publicado.
                  </Text>
                </VStack>
              </Card>
            );
          const t = textoDe(q);
          const kt = slugDe(qid) + "|" + (q.texto ?? "");
          const mostraTexto = t && !textosVistos.has(kt);
          if (t) textosVistos.add(kt);
          return (
            <VStack key={qid} gap={4} className="min-w-0">
              {mostraTexto && <TextoBaseQuestao t={t} />}
              <CartaoQuestao
                base={base}
                q={q}
                num={num}
                ancora={`q-${i + 1}`}
                escolhida={picks[qid]}
                corrigida={!!feito}
                onMarcar={(L) => marcar(id, qid, L)}
              />
            </VStack>
          );
        })}
      </VStack>
      {!feito && (
        // Barra presa no rodapé enquanto se rola (painel.css).
        <HStack className="submitbar">
          <Text hasTabularNumbers>
            {respondidas} de {s.questoes.length} respondidas
          </Text>
          <Button
            label="Entregar sessão"
            variant="primary"
            isDisabled={respondidas < s.questoes.length}
            onClick={() => {
              entregar(base, id, porId);
              const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              window.scrollTo({ top: 0, behavior: reduz ? "instant" : "smooth" });
            }}
          />
        </HStack>
      )}
    </>
  );
}
