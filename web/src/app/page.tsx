"use client";

import { useState } from "react";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { ComCatalogo, Medidor } from "~/components/Comum";
import { OfertaInstalar } from "~/components/Pwa";
import type { Base } from "~/lib/catalogo";
import { ativos, disponiveis, placar, temasFracos } from "~/lib/estudo";
import { fmtDia, hoje, isoDia, pct } from "~/lib/nucleo";
import { useProgresso, type Progresso } from "~/lib/progresso";

export default function PaginaPainel() {
  return <ComCatalogo>{(b) => <Painel base={b} />}</ComCatalogo>;
}

/** Cor do número do cartão: acerto em azul e erro em laranja (DESIGN.md), sempre com a frase embaixo dizendo o quê. */
const COR = {
  bom: "text-(--color-success)",
  ruim: "text-(--color-error)",
  atencao: "text-(--color-warning)",
} as const;

/** Cartão de número do topo: rótulo, número em algarismos tabulares e uma linha explicando. */
function Numero({ rotulo, valor, nota, cor }: { rotulo: string; valor: string; nota: string; cor?: string }) {
  return (
    <Card padding={4}>
      <VStack gap={1} className="min-w-0">
        <Text type="label" color="secondary">
          {rotulo}
        </Text>
        <Text as="p" size="2xl" weight="semibold" hasTabularNumbers className={cor}>
          {valor}
        </Text>
        <Text type="supporting" color="secondary">
          {nota}
        </Text>
      </VStack>
    </Card>
  );
}

/** Título do cartão com a legenda ao lado (quebra para baixo no celular). */
function Cabecalho({ titulo, legenda, children }: { titulo: string; legenda?: string; children?: React.ReactNode }) {
  return (
    <HStack justify="between" align="center" gap={3} wrap="wrap">
      <VStack gap={1}>
        <Heading level={2}>{titulo}</Heading>
        {legenda && (
          <Text type="supporting" color="secondary">
            {legenda}
          </Text>
        )}
      </VStack>
      {children}
    </HStack>
  );
}

function Painel({ base }: { base: Base }) {
  const p = useProgresso();
  const hj = hoje();
  const P = placar(base, p, hj);
  const eds = ativos(base, p);
  const disp = disponiveis(base, p);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const ed = eds.find((e) => e.id === escolhido) ?? eds[0];
  const cor = (v: { a: number; t: number }) => (v.t ? (v.a / v.t >= 0.5 ? COR.bom : COR.ruim) : undefined);
  const fracos = temasFracos(P);

  return (
    // min-w-0: a coluna do app é um grid, e sem isto um rótulo longo alarga a página no celular.
    <VStack gap={6} className="min-w-0">
      <OfertaInstalar />
      <Grid columns={{ minWidth: 160 }} gap={3}>
        <Numero
          rotulo="Acertos"
          valor={`${P.geral.a}/${P.geral.t}`}
          nota={P.geral.t ? `${pct(P.geral.a, P.geral.t)}% de aproveitamento` : "nenhuma questão respondida"}
        />
        {eds.map((e) => {
          const v = P.ed[e.id]!;
          return (
            <Numero
              key={e.id}
              rotulo={`Rumo ao ${base.rotulo(e)}`}
              valor={v.t ? `${pct(v.a, v.t)}%` : "—"}
              nota={`${v.a}/${v.t} nas questões que caem no ${base.rotulo(e)}`}
              cor={cor(v)}
            />
          );
        })}
        <Numero rotulo="Questões vistas" valor={`${P.vistas}/${disp.total}`} nota={`${disp.rels} caem nos editais ativos`} />
        <Numero
          rotulo="Revisões hoje"
          valor={String(P.vencidas)}
          nota={P.vencidas ? "vencidas até hoje" : "nada vencido"}
          cor={P.vencidas ? COR.atencao : undefined}
        />
      </Grid>

      <HStack gap={2} wrap="wrap">
        <Button label="Nova sessão automática" variant="primary" href="/sessao?nova=1" />
        <Button label="Treino de verdadeiro ou falso" href="/treino" />
      </HStack>

      <Card padding={6}>
        <VStack gap={5}>
          <Cabecalho titulo="Por bloco do edital" legenda="Traço dourado = mínimo do bloco">
            {eds.length > 1 && ed && (
              // Lista em vez de botões lado a lado: os rótulos dos editais não cabem em segmentos a 360 px.
              <Selector
                label="Edital"
                isLabelHidden
                variant="secondary"
                value={ed.id}
                onChange={(v) => v && setEscolhido(v)}
                options={eds.map((e) => ({ value: e.id, label: base.rotulo(e) }))}
              />
            )}
          </Cabecalho>
          {!ed ? (
            <Text as="p" color="secondary">
              Nenhum edital ativo. Marque um edital em <Link href="/ajustes">Ajustes</Link>.
            </Text>
          ) : (
            <VStack gap={4}>
              {(ed.blocos ?? []).map((b) => {
                const v = P.ed[ed.id]!.blocos[b.id] ?? { a: 0, t: 0 };
                const partes = [`${b.questoes} questões`];
                if (b.peso) partes.push(`peso ${b.peso}`);
                if (b.minimo != null)
                  partes.push(`${b.eliminatorio ? "eliminatório: " : ""}mínimo ${Math.ceil(b.minimo * b.questoes - 1e-9)}/${b.questoes}`);
                else partes.push("só classificatório");
                return (
                  <Medidor
                    key={b.id}
                    rotulo={`${/^[IVX]+$/.test(b.id) ? `Bloco ${b.id} · ` : ""}${b.nome}`}
                    v={v}
                    corte={b.minimo ?? null}
                    sub={partes.join(" · ")}
                  />
                );
              })}
            </VStack>
          )}
        </VStack>
      </Card>

      <Grid columns={{ minWidth: 380, max: 2 }} gap={6} align="start">
        <Card padding={6}>
          <VStack gap={5}>
            <Cabecalho titulo="Por matéria" legenda={ed ? `Edital ${base.rotulo(ed)}` : undefined} />
            {ed && Object.keys(P.ed[ed.id]!.materias).length ? (
              <VStack gap={3}>
                {Object.entries(P.ed[ed.id]!.materias)
                  .sort((x, y) => x[1].a / x[1].t - y[1].a / y[1].t)
                  .map(([m, v]) => (
                    <Medidor key={m} rotulo={base.nomeMateria(m)} v={v} corte={0.5} />
                  ))}
              </VStack>
            ) : (
              <Text as="p" color="secondary">
                Nenhuma questão deste edital respondida ainda. Faça uma sessão para ver o placar por matéria.
              </Text>
            )}
          </VStack>
        </Card>
        <Card padding={6}>
          <VStack gap={3}>
            <Cabecalho titulo="Temas mais fracos" legenda="3 tentativas ou mais" />
            {fracos.length ? (
              <List hasDividers edge="flush">
                {fracos.map((f) => (
                  <ListItem
                    key={f.id}
                    itemKey={f.id}
                    align="first-line"
                    label={<Text className="whitespace-normal">{base.nomeTema(f.id)}</Text>}
                    description={
                      <Text type="supporting" color="secondary" className="whitespace-normal">
                        {base.nomeMateria(f.id.split(".")[0]!)}
                      </Text>
                    }
                    endContent={
                      <Text type="supporting" weight="semibold" hasTabularNumbers className={`${COR.ruim} whitespace-nowrap`}>
                        errou {f.t - f.a} de {f.t}
                      </Text>
                    }
                  />
                ))}
              </List>
            ) : (
              <Text as="p" color="secondary">
                Aparece aqui quando um tema tiver 3 tentativas ou mais com algum erro.
              </Text>
            )}
          </VStack>
        </Card>
      </Grid>

      <Card padding={6}>
        <VStack gap={5}>
          <Cabecalho titulo="Evolução por sessão" legenda="Tracejado = 50%" />
          <Grafico p={p} />
        </VStack>
      </Card>
    </VStack>
  );
}

/* Gráfico próprio em SVG (o Astryx não traz gráficos sem o recharts); cores pelos tokens do painel.css. */
function Grafico({ p }: { p: Progresso }) {
  const hist = Object.entries(p.respostas)
    .filter(([, r]) => r.total)
    .map(([id, r]) => ({
      id,
      data: isoDia(new Date(r.entregueEm)),
      pct: pct(r.acertos, r.total),
      rotulo: p.sessoes[id]?.titulo ?? id,
    }))
    .sort((a, b) => (a.data + a.id).localeCompare(b.data + b.id));
  if (!hist.length)
    return (
      <Text as="p" color="secondary">
        Nenhuma sessão entregue ainda. Cada sessão entregue vira uma barra aqui.
      </Text>
    );
  const W = Math.max(640, hist.length * 40 + 50);
  const H = 210;
  const padL = 34;
  const padB = 30;
  const padT = 16;
  const step = (W - padL - 10) / hist.length;
  const bw = Math.min(28, step - 8);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / 100);
  // No celular o gráfico rola para o lado: tabIndex deixa rolar pelo teclado também.
  return (
    <VStack isScrollable className="chart" tabIndex={0} role="region" aria-label="Gráfico de aproveitamento por sessão (role para o lado)">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Aproveitamento por sessão">
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line
              x1={padL}
              x2={W - 6}
              y1={y(g)}
              y2={y(g)}
              stroke={g === 50 ? "var(--brass)" : "var(--rule)"}
              strokeWidth={1}
              strokeDasharray={g === 50 ? "5 4" : undefined}
            />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end">
              {g}%
            </text>
          </g>
        ))}
        {hist.map((h, i) => {
          const x = padL + i * step + (step - bw) / 2;
          const yy = y(h.pct);
          return (
            <g key={h.id}>
              <rect x={x} y={yy} width={bw} height={Math.max(1, y(0) - yy)} rx={3} fill={h.pct >= 50 ? "var(--accent)" : "var(--bad)"}>
                <title>{`${h.rotulo} · ${fmtDia(h.data)} · ${h.pct}%`}</title>
              </rect>
              <text x={x + bw / 2} y={yy - 4} textAnchor="middle">
                {h.pct}
              </text>
              <text x={x + bw / 2} y={H - 12} textAnchor="middle">
                {fmtDia(h.data)}
              </text>
            </g>
          );
        })}
      </svg>
    </VStack>
  );
}
