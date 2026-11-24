"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";

import { ComCatalogo, Medidor } from "~/components/Comum";
import { avisar, confirmar, fecharDialogo } from "~/components/Dialogo";
import { CartaoQuestao, TextoBaseQuestao } from "~/components/Questao";
import {
  alternarRevisar,
  criarSimulado,
  descartarSimulado,
  entregarSimulado,
  irParaQuestao,
  marcarNoSimulado,
  pausarSimulado,
  somarTempo,
} from "~/lib/acoes";
import { useProvas, type Base } from "~/lib/catalogo";
import { ativos, disponiveisSimulado, montarSimuladoEdital, provasDoOrgao } from "~/lib/estudo";
import { fmtData, isoDia, slugDe } from "~/lib/nucleo";
import { useProgresso, type Progresso, type Simulado } from "~/lib/progresso";
import {
  blocosDaProva,
  duracaoSimulado,
  fmtMinutos,
  fmtNota,
  fmtRelogio,
  planejar,
  rotuloBloco,
  type PlanoBloco,
  type Tamanho,
} from "~/lib/simulado";
import type { Edital, Questao } from "~/lib/tipos";

/*
 * Tela feita com componentes Astryx (ver DESIGN.md, "Astryx"). Ficam com o CSS próprio do painel.css, por serem a
 * identidade do app: a barra presa com o cronômetro (.sim-bar, .relogio), o corpo em duas colunas no desktop
 * (.sim-corpo, .sim-questao), a grade de questões (.grade, .cel, canto dobrado) e o carimbo da nota (.stamp).
 */

export default function PaginaSimulados() {
  return (
    <ComCatalogo>
      {(b) => (
        <Suspense>
          <Simulados base={b} />
        </Suspense>
      )}
    </ComCatalogo>
  );
}

function Simulados({ base }: { base: Base }) {
  const p = useProgresso();
  const id = useSearchParams().get("id");
  const s = id ? p.simulados[id] : undefined;
  if (id && !s)
    return (
      <VStack gap={6} className="min-w-0">
        <Banner
          status="info"
          title="Este simulado não está no progresso deste navegador."
          endContent={<Button label="Voltar aos simulados" href="/simulados" size="sm" />}
        />
      </VStack>
    );
  if (id && s?.resultado) return <Resultado key={id} base={base} s={s} />;
  if (id && s) return <Andamento key={id} base={base} id={id} s={s} />;
  return <Inicio base={base} p={p} />;
}

/* ---------- textos auxiliares ---------- */

const rotuloCompleto = (b: { id: string; nome: string }) => (/^[IVX]+$/.test(b.id) ? `Bloco ${b.id} · ${b.nome}` : b.nome);
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** "Bloco II: 18 de 30 questões, o banco ainda não tem mais (Atualidades: 2 de 3)". */
function faltas(base: Base, plano: PlanoBloco[] | undefined): string[] {
  return (plano ?? [])
    .filter((b) => b.montadas < b.pedidas)
    .map((b) => {
      const mats = b.materias
        .filter((m) => m.montadas < m.pedidas)
        .map((m) => `${m.rotulo ?? base.nomeMateria(m.materia)}: ${m.montadas} de ${m.pedidas}`);
      return `${rotuloBloco(b)}: ${b.montadas} de ${b.pedidas} questões, o banco ainda não tem mais${mats.length ? ` (${mats.join("; ")})` : ""}.`;
    });
}

function textoTempo(s: Simulado) {
  const usado = fmtRelogio(s.resultado?.usado_ms ?? s.tempo.usado_ms);
  const lim = s.tempo.limite_min ? ` de ${fmtRelogio(s.tempo.limite_min * 60000)}` : " (sem cronômetro)";
  const pausas = s.tempo.pausas ? `com ${plural(s.tempo.pausas, "pausa", "pausas")}` : "sem pausa";
  return `${usado}${lim} · ${pausas}`;
}

/** Título de cartão com a linha de apoio embaixo (o antigo .eyebrow). */
function Titulo({ titulo, apoio, nivel = 2 }: { titulo: string; apoio?: string; nivel?: 2 | 3 }) {
  return (
    <VStack gap={1} className="min-w-0">
      <Heading level={nivel}>{titulo}</Heading>
      {apoio && (
        <Text type="supporting" color="secondary">
          {apoio}
        </Text>
      )}
    </VStack>
  );
}

/** Lista de avisos de questões que faltaram no banco. */
function AvisosFalta({ avisos, titulo }: { avisos: string[]; titulo: string }) {
  if (!avisos.length) return null;
  return (
    <Banner status="warning" title={titulo} collapsible={false}>
      <VStack gap={1}>
        {avisos.map((a) => (
          <Text key={a} as="p" type="supporting">
            {a}
          </Text>
        ))}
      </VStack>
    </Banner>
  );
}

/* ---------- início: escolher e começar ---------- */

function Inicio({ base, p }: { base: Base; p: Progresso }) {
  const eds = ativos(base, p);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const ed = eds.find((e) => e.id === escolhido) ?? eds[0];
  const todos = Object.entries(p.simulados);
  const andamento = todos.filter(([, s]) => !s.resultado).sort((a, b) => b[1].criado.localeCompare(a[1].criado));
  const feitos = todos
    .filter(([, s]) => s.resultado)
    .sort((a, b) => b[1].resultado!.entregueEm.localeCompare(a[1].resultado!.entregueEm));

  return (
    // min-w-0: a coluna do app é um grid, e sem isto um texto longo alarga a página no celular.
    <VStack gap={6} className="min-w-0">
      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="end" gap={3} wrap="wrap">
            <Titulo titulo="Simulados" apoio="A prova inteira, com tempo e nota pela regra do edital" />
            {eds.length > 1 && (
              <Selector
                label="Edital"
                isLabelHidden
                options={eds.map((e) => ({ value: e.id, label: base.rotulo(e) }))}
                value={ed?.id}
                onChange={(v) => v && setEscolhido(v)}
                width={220}
              />
            )}
          </HStack>
          {ed ? (
            <Text as="p" color="secondary" textWrap="pretty">
              Nada de correção no meio: o gabarito só aparece na entrega, com a nota de cada bloco e se você estaria
              habilitado no {base.rotulo(ed)}. As respostas entram no placar e nas Revisões, como numa sessão.
            </Text>
          ) : (
            <Text as="p" color="secondary">
              Nenhum edital ativo. Marque o concurso que você vai fazer em <Link href="/ajustes">Ajustes</Link>.
            </Text>
          )}
        </VStack>
      </Card>

      {andamento.map(([id, s]) => (
        <Card key={id} padding={6}>
          <VStack gap={4}>
            <VStack gap={1} className="min-w-0">
              <Text type="supporting" color="secondary">
                {s.tempo.pausado ? "Em andamento · pausado" : "Em andamento"}
              </Text>
              <Heading level={2}>{s.titulo}</Heading>
            </VStack>
            <Text as="p" color="secondary" hasTabularNumbers>
              {Object.keys(s.marcadas).length} de {s.questoes.length} respondidas · tempo {textoTempo(s)}
            </Text>
            <HStack gap={2} wrap="wrap">
              <Button label="Retomar simulado" variant="primary" href={`/simulados?id=${encodeURIComponent(id)}`} />
              <Button
                label="Descartar"
                variant="ghost"
                onClick={async () => {
                  if (
                    await confirmar({
                      titulo: "Descartar este simulado?",
                      texto: "As respostas marcadas se perdem.",
                      ok: "Descartar simulado",
                      perigo: true,
                    })
                  )
                    descartarSimulado(id);
                }}
              />
            </HStack>
          </VStack>
        </Card>
      ))}

      {ed && <SimuladoDoEdital key={ed.id} base={base} p={p} ed={ed} bloqueado={andamento.length > 0} />}
      {ed && <ProvaAnterior key={"p" + ed.id} base={base} ed={ed} bloqueado={andamento.length > 0} />}

      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <Heading level={2}>Simulados feitos</Heading>
            <Text type="supporting" color="secondary" hasTabularNumbers>
              {plural(feitos.length, "simulado", "simulados")}
            </Text>
          </HStack>
          {feitos.length ? (
            <List hasDividers edge="flush">
              {feitos.map(([id, s]) => {
                const r = s.resultado!;
                const e = base.editais.find((x) => x.id === s.edital);
                return (
                  <ListItem
                    key={id}
                    href={`/simulados?id=${encodeURIComponent(id)}`}
                    align="first-line"
                    label={
                      <Text weight="semibold" className="whitespace-normal">
                        {s.titulo}
                      </Text>
                    }
                    description={
                      <Text type="supporting" color="secondary" className="whitespace-normal" hasTabularNumbers>
                        {fmtData(isoDia(new Date(r.entregueEm)))}
                        {e ? ` · ${base.rotulo(e)}` : ""} · {s.tipo === "prova" ? "prova anterior" : s.tamanho} ·{" "}
                        {r.acertos}/{r.total} acertos · tempo {textoTempo(s)}
                      </Text>
                    }
                    endContent={
                      <VStack gap={1} align="end">
                        <Text weight="semibold" hasTabularNumbers className="whitespace-nowrap">
                          nota {fmtNota(r.nota)}
                        </Text>
                        {r.habilitado === true && <Token label="Habilitado" size="sm" color="blue" />}
                        {r.habilitado === false && <Token label="Eliminado" size="sm" color="orange" />}
                      </VStack>
                    }
                  />
                );
              })}
            </List>
          ) : (
            <Text as="p" color="secondary">
              Os simulados entregues aparecem aqui, com data, nota, tempo e se você foi habilitado.
            </Text>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}

function SimuladoDoEdital({ base, p, ed, bloqueado }: { base: Base; p: Progresso; ed: Edital; bloqueado: boolean }) {
  const router = useRouter();
  const [tamanho, setTamanho] = useState<Tamanho>("reduzido");
  const disp = useMemo(() => disponiveisSimulado(base, p, ed), [base, p, ed]);
  const plano = planejar(ed.blocos ?? [], disp, tamanho);
  const pedidas = plano.reduce((s, b) => s + b.pedidas, 0);
  const montadas = plano.reduce((s, b) => s + b.montadas, 0);
  const minutos = duracaoSimulado(ed.objetiva, pedidas, tamanho);
  const avisos = faltas(base, plano);

  const comecar = () => {
    const m = montarSimuladoEdital(base, p, ed, tamanho);
    if (!m.questoes.length) return void avisar("O banco ainda não tem questões deste edital.");
    const id = criarSimulado({
      titulo: `Simulado ${base.rotulo(ed)} · ${tamanho}`,
      edital: ed.id,
      tipo: "edital",
      tamanho,
      questoes: m.questoes,
      blocos: m.blocos,
      plano: m.plano,
      tempo: { limite_min: minutos, usado_ms: 0, pausas: 0, pausado: false, inclui: ed.objetiva?.duracao_inclui },
    });
    router.push(`/simulados?id=${encodeURIComponent(id)}`);
  };

  return (
    <Card padding={6}>
      <VStack gap={4}>
        <HStack justify="between" align="end" gap={3} wrap="wrap">
          <Titulo titulo="Simulado do edital" apoio={`Montado do banco, na estrutura do ${base.rotulo(ed)}`} />
          <SegmentedControl label="Tamanho" value={tamanho} onChange={(v) => setTamanho(v as Tamanho)}>
            <SegmentedControlItem value="completo" label="Completo" />
            <SegmentedControlItem value="reduzido" label="Reduzido" />
          </SegmentedControl>
        </HStack>
        <List hasDividers edge="flush">
          {plano.map((b) => {
            const falta = b.montadas < b.pedidas;
            const mats = b.materias.filter((m) => m.pedidas);
            return (
              <ListItem
                key={b.id}
                align="first-line"
                label={<Text className="whitespace-normal">{rotuloCompleto(b)}</Text>}
                description={
                  mats.length ? (
                    <Text type="supporting" color="secondary" className="whitespace-normal">
                      {mats
                        .map(
                          (m) =>
                            `${m.rotulo ?? base.nomeMateria(m.materia)} ${m.montadas < m.pedidas ? `${m.montadas} de ${m.pedidas}` : m.pedidas}`,
                        )
                        .join(" · ")}
                    </Text>
                  ) : undefined
                }
                endContent={
                  <Text hasTabularNumbers weight={falta ? "semibold" : undefined} className="whitespace-nowrap">
                    {falta ? `${b.montadas} de ${b.pedidas}` : b.pedidas} questões
                  </Text>
                }
              />
            );
          })}
        </List>
        {ed.provisorio && <Banner status="info" title="Edital provisório" description={ed.provisorio} collapsible={false} />}
        <VStack gap={1.5}>
          <Text as="p" textWrap="pretty">
            <Text weight="semibold">{montadas} questões</Text>
            {tamanho === "reduzido" ? " (metade de cada bloco)" : ""} ·{" "}
            {minutos ? (
              <>
                <Text weight="semibold">{fmtMinutos(minutos)}</Text>
                {tamanho === "reduzido"
                  ? ` (proporcional às ${ed.objetiva?.duracao_min ? fmtMinutos(ed.objetiva.duracao_min) : ""} da prova)`
                  : " (duração oficial)"}
              </>
            ) : (
              "sem cronômetro: o edital não traz a duração"
            )}
          </Text>
          {minutos && ed.objetiva?.duracao_inclui && (
            <Text as="p" type="supporting" color="secondary" textWrap="pretty">
              {ed.objetiva.duracao_inclui} Aqui você faz só a objetiva{tamanho === "completo" ? ", então sobra tempo." : "."}
            </Text>
          )}
          {ed.objetiva?.nota && (
            <Text as="p" type="supporting" color="secondary" textWrap="pretty">
              Nota: {ed.objetiva.nota}
            </Text>
          )}
        </VStack>
        <AvisosFalta
          avisos={avisos}
          titulo="O banco ainda não tem questões para a prova inteira. O simulado sai com o que houver:"
        />
        <VStack gap={2} align="start">
          <Button
            label={`Começar simulado (${montadas} questões)`}
            variant="primary"
            isDisabled={bloqueado || !montadas}
            onClick={comecar}
          />
          {bloqueado && (
            <Text as="p" type="supporting" color="secondary">
              Entregue ou descarte o simulado em andamento antes de começar outro.
            </Text>
          )}
        </VStack>
      </VStack>
    </Card>
  );
}

type OpcaoTempo = "edital" | "livre" | "outro";

function ProvaAnterior({ base, ed, bloqueado }: { base: Base; ed: Edital; bloqueado: boolean }) {
  const router = useRouter();
  const lista = provasDoOrgao(base, ed);
  const [pid, setPid] = useState<string | null>(null);
  const sel = lista.find((x) => x.prova.id === pid) ?? lista[0];
  const durEdital = sel?.editalDoCargo?.objetiva?.duracao_min;
  const [opcao, setOpcao] = useState<OpcaoTempo | null>(null);
  const tempo: OpcaoTempo = opcao === "edital" && !durEdital ? "livre" : (opcao ?? (durEdital ? "edital" : "livre"));
  const [minutos, setMinutos] = useState(120);

  if (!lista.length)
    return (
      <Card padding={6}>
        <VStack gap={4}>
          <Heading level={2}>Prova anterior</Heading>
          <Text as="p" color="secondary">
            O banco ainda não tem provas do {ed.orgao ?? base.rotulo(ed)}.
          </Text>
        </VStack>
      </Card>
    );

  const comecar = () => {
    if (!sel) return;
    const pr = sel.prova;
    const qs = (base.cat.indice[pr.id] ?? []).filter((q) => q.tipo === "me").map((q) => ({ id: q.id, n: q.n }));
    if (!qs.length) return void avisar("Esta prova ainda não tem questões no banco.");
    const limite = tempo === "edital" ? (durEdital ?? null) : tempo === "outro" ? Math.max(1, Math.round(minutos)) : null;
    const id = criarSimulado({
      titulo: `Prova ${pr.orgao} ${pr.ano} · ${pr.cargo}`,
      edital: ed.id,
      tipo: "prova",
      tamanho: "inteira",
      prova: pr.id,
      questoes: qs.map((q) => q.id),
      blocos: blocosDaProva(pr.blocos, qs),
      tempo: {
        limite_min: limite,
        usado_ms: 0,
        pausas: 0,
        pausado: false,
        inclui: tempo === "edital" ? sel.editalDoCargo?.objetiva?.duracao_inclui : undefined,
      },
    });
    router.push(`/simulados?id=${encodeURIComponent(id)}`);
  };

  const opcoesTempo = [
    ...(durEdital
      ? [
          {
            value: "edital",
            label: `${fmtMinutos(durEdital)}, do edital ${sel?.editalDoCargo ? base.rotulo(sel.editalDoCargo) : ""}`.trim(),
          },
        ]
      : []),
    { value: "livre", label: "Sem cronômetro" },
    { value: "outro", label: "Escolher o tempo" },
  ];

  return (
    <Card padding={6}>
      <VStack gap={4}>
        <Titulo titulo="Prova anterior" apoio="Inteira, na ordem original, sem as discursivas" />
        <RadioList
          label={`Provas do ${ed.orgao ?? base.rotulo(ed)} no banco`}
          value={sel?.prova.id ?? ""}
          onChange={setPid}
        >
          {lista.map(({ prova: pr, mesmoCargo }) => {
            const me = (base.cat.indice[pr.id] ?? []).filter((q) => q.tipo === "me").length;
            const nome = `${pr.orgao} ${pr.ano} · ${pr.cargo}`;
            return (
              <RadioListItem
                key={pr.id}
                value={pr.id}
                align="first-line"
                aria-label={nome}
                label={
                  <Text weight="semibold" className="whitespace-normal">
                    {nome}
                  </Text>
                }
                endContent={mesmoCargo ? undefined : <Token label="outro cargo" size="sm" color="gray" />}
                description={
                  <Text type="supporting" color="secondary" className="whitespace-normal">
                    {[
                      pr.banca,
                      `${me} questões`,
                      pr.anuladas.length ? plural(pr.anuladas.length, "anulada", "anuladas") : null,
                      pr.blocos?.length ? pr.blocos.map((b) => b.nome).join(", ") : "sem divisão em blocos",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                }
              />
            );
          })}
        </RadioList>
        <HStack gap={3} wrap="wrap" align="end">
          <Selector
            label="Tempo"
            options={opcoesTempo}
            value={tempo}
            onChange={(v) => v && setOpcao(v as OpcaoTempo)}
            width={260}
          />
          {tempo === "outro" && (
            <NumberInput
              label="Minutos"
              min={5}
              max={600}
              isIntegerOnly
              hasNumberSteppers
              width={160}
              value={minutos}
              onChange={(v) => setMinutos(Math.max(5, Math.min(600, Math.round(v) || 120)))}
            />
          )}
        </HStack>
        <VStack gap={1.5}>
          {tempo === "edital" && sel?.editalDoCargo?.objetiva?.duracao_inclui && (
            <Text as="p" type="supporting" color="secondary" textWrap="pretty">
              {sel.editalDoCargo.objetiva.duracao_inclui}
            </Text>
          )}
          {!durEdital && (
            <Text as="p" type="supporting" color="secondary" textWrap="pretty">
              Não há edital deste cargo no banco para dar o tempo: escolha um ou faça sem cronômetro.
            </Text>
          )}
          <Text as="p" type="supporting" color="secondary" textWrap="pretty">
            Anuladas aparecem e contam como acerto para todos, como a banca faz.
          </Text>
        </VStack>
        <VStack gap={2} align="start">
          <Button
            label={`Começar prova ${sel ? `${sel.prova.orgao} ${sel.prova.ano}` : ""}`.trim()}
            variant="primary"
            isDisabled={bloqueado || !sel}
            onClick={comecar}
          />
          {bloqueado && (
            <Text as="p" type="supporting" color="secondary">
              Entregue ou descarte o simulado em andamento antes de começar outro.
            </Text>
          )}
        </VStack>
      </VStack>
    </Card>
  );
}

/* ---------- durante o simulado ---------- */

/** Intervalo entre tiques (1 s) acima do qual a página esteve parada e o tempo não conta. */
const PULO_MS = 10000;

/** Cabeçalho das telas de um simulado: rótulo, título e o botão de voltar. */
function Cabeca({ apoio, titulo, voltar }: { apoio: string; titulo: string; voltar: string }) {
  return (
    <HStack justify="between" align="end" gap={3} wrap="wrap">
      <VStack gap={1.5} className="min-w-0">
        <Text type="supporting" color="secondary">
          {apoio}
        </Text>
        <Heading level={2}>{titulo}</Heading>
      </VStack>
      <Button label={voltar} variant="secondary" href="/simulados" />
    </HStack>
  );
}

function Andamento({ base, id, s }: { base: Base; id: string; s: Simulado }) {
  const { provas, erro } = useProvas(s.questoes.map(slugDe));
  const edital = base.editais.find((e) => e.id === s.edital);
  const porId = useMemo(() => {
    const out: Record<string, Questao> = {};
    if (provas) for (const qid of s.questoes) {
      const q = provas[slugDe(qid)]?.porId[qid];
      if (q) out[qid] = q;
    }
    return out;
  }, [provas, s.questoes]);

  // Cronômetro: só conta com o simulado na tela e sem pausa; grava no progresso a cada 5 s e ao sair da página.
  const [agora, setAgora] = useState(() => Date.now());
  const inicio = useRef<number | null>(null);
  // Último tique do relógio. Se o próximo chega muito depois (computador suspenso com a tela aberta,
  // aba congelada, relógio do sistema adiantado), esse intervalo não conta: só o tempo com a página viva.
  const ultimo = useRef(0);
  const entregue = useRef(false);
  const rodando = !s.tempo.pausado && !!provas;
  const gravar = () => {
    if (inicio.current == null) return;
    const ag = Date.now();
    const fim = ag - ultimo.current > PULO_MS ? ultimo.current : ag;
    somarTempo(id, fim - inicio.current);
    inicio.current = document.visibilityState === "visible" ? ag : null;
    ultimo.current = ag;
  };
  useEffect(() => {
    if (!rodando) return;
    const comecar = () => {
      if (document.visibilityState === "visible" && inicio.current == null) inicio.current = ultimo.current = Date.now();
      setAgora(Date.now());
    };
    comecar();
    const tique = setInterval(() => {
      const ag = Date.now();
      if (ag - ultimo.current > PULO_MS || ag < ultimo.current) gravar();
      else ultimo.current = ag;
      setAgora(ag);
    }, 1000);
    const salvar = setInterval(gravar, 5000);
    const aoMudar = () => (document.visibilityState === "visible" ? comecar() : gravar());
    document.addEventListener("visibilitychange", aoMudar);
    window.addEventListener("pagehide", gravar);
    return () => {
      clearInterval(tique);
      clearInterval(salvar);
      document.removeEventListener("visibilitychange", aoMudar);
      window.removeEventListener("pagehide", gravar);
      gravar();
      inicio.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodando, id]);

  const usado =
    s.tempo.usado_ms + (inicio.current != null ? Math.max(0, Math.min(agora, ultimo.current + PULO_MS) - inicio.current) : 0);
  const limite = s.tempo.limite_min ? s.tempo.limite_min * 60000 : null;
  const esgotou = limite != null && usado >= limite;

  const entregarAgora = (esgotado: boolean) => {
    if (entregue.current) return;
    entregue.current = true;
    fecharDialogo();
    gravar();
    inicio.current = null;
    entregarSimulado(base, id, porId, { edital, esgotado });
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    if (esgotou && provas) entregarAgora(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esgotou, provas]);

  if (erro)
    return (
      <VStack gap={6} className="min-w-0">
        <Banner status="error" title="Não consegui carregar as questões do simulado. Recarregue a página." />
      </VStack>
    );
  if (!provas)
    return (
      <Text as="p" color="secondary">
        Carregando as questões…
      </Text>
    );

  const pos = Math.max(0, Math.min(s.questoes.length - 1, s.pos));
  const qid = s.questoes[pos]!;
  const q = porId[qid];
  const indice = new Map(s.questoes.map((x, i) => [x, i]));
  const respondidas = s.questoes.filter((x) => s.marcadas[x]).length;
  const brancas = s.questoes.length - respondidas;
  const blocoAtual = s.blocos.find((b) => b.questoes.includes(qid));
  const t = q?.texto ? provas[slugDe(q.id)]?.textos[q.texto] : undefined;
  const anterior = pos > 0 ? porId[s.questoes[pos - 1]!] : undefined;
  const mesmoTextoQueAnterior = !!q?.texto && anterior?.prova === q.prova && anterior.texto === q.texto;
  const restante = limite != null ? limite - usado : null;
  const pouco = restante != null && restante <= Math.min(5 * 60000, limite! * 0.1);
  const avisos = faltas(base, s.plano);
  const revisar = s.revisar.includes(qid);

  const ir = (i: number) => {
    irParaQuestao(id, i);
    const alvo = document.getElementById("sim-questao");
    if (alvo && alvo.getBoundingClientRect().top < 0) alvo.scrollIntoView({ block: "start" });
  };
  const pausar = () => {
    gravar();
    inicio.current = null;
    pausarSimulado(id, true);
  };
  const pedirEntrega = async () => {
    const ok = await confirmar({
      titulo: "Entregar o simulado?",
      texto: brancas
        ? `${plural(brancas, "questão está em branco", "questões estão em branco")} e ${brancas === 1 ? "conta" : "contam"} como erro.`
        : "Todas as questões estão respondidas.",
      ok: "Entregar simulado",
      cancelar: "Continuar respondendo",
    });
    if (ok) entregarAgora(false);
  };

  return (
    <VStack gap={6} className="min-w-0">
      <Cabeca
        apoio={`Simulado · ${s.tipo === "prova" ? "prova anterior" : s.tamanho} · ${s.questoes.length} questões`}
        titulo={s.titulo}
        voltar="Sair (fica salvo)"
      />
      <AvisosFalta avisos={avisos} titulo="O banco não tinha questões para a prova inteira:" />

      {/* Barra presa no topo (painel.css): cronômetro à esquerda, Pausar e Entregar à direita. */}
      <div className="sim-bar">
        <div className={`relogio${pouco ? " pouco" : ""}`} role="timer" aria-live="off">
          <span className="eyebrow">{restante != null ? "Restam" : "Tempo"}</span>
          <b>{fmtRelogio(restante != null ? restante : usado)}</b>
          <small>
            {respondidas}/{s.questoes.length} respondidas
          </small>
        </div>
        <HStack gap={2}>
          <Button
            label={s.tempo.pausado ? "Retomar" : "Pausar"}
            variant="secondary"
            onClick={() => (s.tempo.pausado ? pausarSimulado(id, false) : pausar())}
          />
          <Button label="Entregar" variant="primary" onClick={pedirEntrega} />
        </HStack>
      </div>
      {pouco && (
        <Banner
          status="warning"
          title={`Menos de ${fmtMinutos(Math.max(1, Math.ceil(restante! / 60000)))}: ao acabar o tempo, o simulado é entregue sozinho.`}
        />
      )}

      {s.tempo.pausado ? (
        <Card padding={6}>
          <VStack gap={4}>
            <HStack gap={4} align="center" wrap="wrap">
              <span className="stamp">{fmtRelogio(restante != null ? restante : usado)}</span>
              <VStack gap={1} className="min-w-0 flex-1 basis-60">
                <Heading level={3}>Simulado pausado</Heading>
                <Text as="p" color="secondary" textWrap="pretty">
                  O cronômetro está parado e as questões ficam escondidas até você retomar. A pausa fica registrada no
                  resultado.
                </Text>
              </VStack>
            </HStack>
            <HStack gap={2}>
              <Button label="Retomar simulado" variant="primary" onClick={() => pausarSimulado(id, false)} />
            </HStack>
          </VStack>
        </Card>
      ) : (
        <div className="sim-corpo">
          <VStack gap={4} className="sim-questao" id="sim-questao">
            {blocoAtual && (
              <Text type="supporting" color="secondary" hasTabularNumbers>
                Questão {pos + 1} de {s.questoes.length}
                {blocoAtual.id ? ` · ${rotuloCompleto(blocoAtual)}` : ""}
              </Text>
            )}
            {t && (
              // Aberto na primeira questão do texto; nas seguintes, fechado (um toque abre).
              <TextoBaseQuestao key={qid} t={t} aberto={!mesmoTextoQueAnterior} />
            )}
            {q ? (
              <CartaoQuestao
                base={base}
                q={q}
                num={String(pos + 1).padStart(2, "0")}
                escolhida={s.marcadas[qid]}
                corrigida={false}
                ocultarAnulada
                onMarcar={(L) => marcarNoSimulado(id, qid, L)}
                extraMeta={revisar ? <span className="pill warn">revisar depois</span> : null}
              />
            ) : (
              <Banner status="warning" title={`A questão ${qid} não está no catálogo publicado; ela não conta na nota.`} />
            )}
            <ToggleButton
              className="revisar"
              label={revisar ? "Marcada para revisar · desmarcar" : "Marcar para revisar depois"}
              isPressed={revisar}
              onPressedChange={() => alternarRevisar(id, qid)}
            />
            <Grid columns={2} gap={3}>
              <Button label="← Anterior" variant="secondary" width="100%" isDisabled={pos === 0} onClick={() => ir(pos - 1)} />
              {pos < s.questoes.length - 1 ? (
                <Button label="Próxima →" variant="primary" width="100%" onClick={() => ir(pos + 1)} />
              ) : (
                <Button label="Entregar" variant="primary" width="100%" onClick={pedirEntrega} />
              )}
            </Grid>
            <Text as="p" type="supporting" color="secondary">
              Toque de novo na alternativa marcada para deixar a questão em branco.
            </Text>
          </VStack>
          <Grade s={s} pos={pos} indice={indice} ir={ir} />
        </div>
      )}
      {!s.tempo.pausado && s.tempo.inclui && (
        <Text as="p" type="supporting" color="secondary" textWrap="pretty">
          Tempo {s.tempo.limite_min ? fmtMinutos(s.tempo.limite_min) : ""}: {s.tempo.inclui}
        </Text>
      )}
    </VStack>
  );
}

/* Grade de questões: visual próprio do DESIGN.md (quadrado por questão, canto dobrado para revisar). */
function Grade({ s, pos, indice, ir }: { s: Simulado; pos: number; indice: Map<string, number>; ir: (i: number) => void }) {
  const rev = s.questoes.filter((x) => s.revisar.includes(x)).length;
  const resp = s.questoes.filter((x) => s.marcadas[x]).length;
  return (
    <aside className="card grade" aria-label="Questões do simulado">
      <div className="grade-legenda">
        <span>
          <i className="cel-mini resp" aria-hidden="true" /> {resp} respondidas
        </span>
        <span>
          <i className="cel-mini" aria-hidden="true" /> {s.questoes.length - resp} em branco
        </span>
        <span>
          <i className="cel-mini rev" aria-hidden="true" /> {rev} para revisar
        </span>
      </div>
      {s.blocos.map((b) => (
        <div key={b.id || "prova"} className="grade-bloco">
          <span className="eyebrow">{b.id ? rotuloCompleto(b) : b.nome}</span>
          <div className="celulas">
            {b.questoes.map((qid) => {
              const i = indice.get(qid) ?? 0;
              const L = s.marcadas[qid];
              const r = s.revisar.includes(qid);
              const estado = [L ? `respondida (${L})` : "em branco", r ? "marcada para revisar" : ""].filter(Boolean).join(", ");
              return (
                <button
                  key={qid}
                  type="button"
                  className={`cel${L ? " resp" : ""}${r ? " rev" : ""}`}
                  aria-current={i === pos ? "true" : undefined}
                  aria-label={`Questão ${i + 1}: ${estado}`}
                  onClick={() => ir(i)}
                >
                  <span className="n">{i + 1}</span>
                  <span className="L">{L ?? "–"}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}

/* ---------- resultado ---------- */

function Resultado({ base, s }: { base: Base; s: Simulado }) {
  const r = s.resultado!;
  const { provas, erro } = useProvas(s.questoes.map(slugDe));
  const [filtro, setFiltro] = useState<"todas" | "erros">("todas");
  const edital = base.editais.find((e) => e.id === s.edital);
  const avisos = faltas(base, s.plano);
  const prova = s.tipo === "prova";
  const baixo = r.habilitado === false || (r.habilitado == null && (r.nota ?? 0) < 5);

  const porId: Record<string, Questao> = {};
  if (provas) for (const qid of s.questoes) {
    const q = provas[slugDe(qid)]?.porId[qid];
    if (q) porId[qid] = q;
  }
  const anulada = (q: Questao) => !!(q.anulada || base.idx[q.id]?.anulada);
  const errou = (qid: string) => {
    const q = porId[qid];
    return !!q && !anulada(q) && s.marcadas[qid] !== q.gab;
  };
  const nErros = s.questoes.filter(errou).length;

  return (
    <VStack gap={6} className="min-w-0">
      <Cabeca
        apoio={`Simulado entregue · ${new Date(r.entregueEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}${edital ? ` · ${base.rotulo(edital)}` : ""}`}
        titulo={s.titulo}
        voltar="Voltar aos simulados"
      />

      {r.esgotado && (
        <Banner
          status="warning"
          title="Tempo esgotado."
          description="O simulado foi entregue sozinho quando o cronômetro chegou a zero."
          role="alert"
        />
      )}

      <Card padding={6}>
        <VStack gap={4}>
          <HStack gap={4} align="center" wrap="wrap">
            {/* Carimbo da nota (painel.css): grifo; laranja claro quando eliminado ou abaixo de 5. */}
            <span className={`stamp ${baixo ? "low" : ""}`}>{fmtNota(r.nota)}</span>
            <VStack gap={1} className="min-w-0 flex-1 basis-60">
              <Heading level={3}>
                {r.habilitado === true ? "Habilitado" : r.habilitado === false ? (r.motivo ?? "Eliminado") : "Prova entregue"}
              </Heading>
              <Text color="secondary" hasTabularNumbers>
                nota de 0 a 10 · {r.acertos} de {r.total} acertos
                {r.branco ? ` · ${r.branco} em branco` : ""}
              </Text>
              <Text color="secondary" hasTabularNumbers>
                Tempo usado: {textoTempo(s)}
              </Text>
            </VStack>
          </HStack>
          {r.regra && (
            <VStack gap={0.5}>
              <Text type="label" color="secondary">
                Regra do edital
              </Text>
              <Text as="p" type="supporting" color="secondary" textWrap="pretty">
                {r.regra}
              </Text>
            </VStack>
          )}
          {prova && (
            <Text as="p" type="supporting" color="secondary" textWrap="pretty">
              {r.anuladas
                ? `${plural(r.anuladas, "questão anulada conta", "questões anuladas contam")} como acerto para todos, como a banca faz.`
                : "Esta prova não teve questões anuladas."}{" "}
              Prova anterior: a nota mostra o seu aproveitamento, sem a regra de habilitação do edital atual.
            </Text>
          )}
          <AvisosFalta avisos={avisos} titulo="O banco não tinha questões para a prova inteira:" />
          <Text as="p" type="supporting" color="secondary" textWrap="pretty">
            As respostas entraram no placar e nas Revisões: as erradas e as em branco voltam amanhã.
          </Text>
        </VStack>
      </Card>

      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <Heading level={2}>Por bloco</Heading>
            <Text type="supporting" color="secondary">
              {r.blocos.some((b) => b.minimo != null) ? "Traço dourado = mínimo do bloco" : "Acertos por bloco"}
            </Text>
          </HStack>
          <VStack gap={5}>
            {r.blocos.map((b) => {
              const partes = [`nota ${fmtNota(b.nota)}`];
              if (b.peso !== 1) partes.push(`peso ${b.peso}`);
              if (b.minimo != null) partes.push(`mínimo ${Math.round(b.minimo * 100)}%${b.eliminatorio ? ", eliminatório" : ""}`);
              else if (!prova) partes.push("só classificatório");
              if (b.branco) partes.push(`${b.branco} em branco`);
              if (b.eliminatorio && b.total) partes.push(b.eliminou ? "eliminou" : "passou do mínimo");
              if (!b.total) partes.push("sem questões no simulado");
              return (
                <Medidor
                  key={b.id || "prova"}
                  rotulo={b.id && b.id !== "outras" ? rotuloCompleto(b) : b.nome}
                  v={{ a: b.acertos, t: b.total }}
                  corte={b.minimo}
                  sub={partes.join(" · ")}
                />
              );
            })}
            {r.corte != null && (
              <Text as="p" type="supporting" color="secondary" hasTabularNumbers>
                Nota final {fmtNota(r.nota)} · mínimo {fmtNota(r.corte)}
                {edital?.objetiva?.media_ponderada ? " (média ponderada dos blocos)" : " (no conjunto)"}
              </Text>
            )}
          </VStack>
        </VStack>
      </Card>

      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <Heading level={2}>Questão por questão</Heading>
            <SegmentedControl label="Filtro" value={filtro} onChange={(v) => setFiltro(v as "todas" | "erros")}>
              <SegmentedControlItem value="todas" label={`Todas (${s.questoes.length})`} />
              <SegmentedControlItem value="erros" label={`Só erros (${nErros})`} />
            </SegmentedControl>
          </HStack>
          {erro && <Banner status="error" title="Não consegui carregar as questões. Recarregue a página." />}
          {!provas && !erro && (
            <Text as="p" color="secondary">
              Carregando as questões…
            </Text>
          )}
          {filtro === "erros" && (
            <Text as="p" type="supporting" color="secondary">
              Erradas e em branco, que contam como erro.
            </Text>
          )}
          {provas && filtro === "erros" && !nErros && (
            <Text as="p" color="secondary">
              Nenhuma errada nem em branco. Parabéns!
            </Text>
          )}
        </VStack>
      </Card>
      {provas && (
        <VStack gap={4}>
          {s.blocos.map((b) => {
            const qs = b.questoes.filter((qid) => filtro === "todas" || errou(qid));
            if (!qs.length) return null;
            let ultimoTexto = "";
            return (
              <VStack key={b.id || "prova"} gap={4}>
                {s.blocos.length > 1 && <Heading level={3}>{b.id && b.id !== "outras" ? rotuloCompleto(b) : b.nome}</Heading>}
                {qs.map((qid) => {
                  const q = porId[qid];
                  const i = s.questoes.indexOf(qid);
                  if (!q) return null;
                  const kt = q.texto ? slugDe(qid) + "|" + q.texto : "";
                  const t = kt && kt !== ultimoTexto ? provas[slugDe(qid)]?.textos[q.texto!] : undefined;
                  ultimoTexto = kt;
                  return (
                    <VStack key={qid} gap={4}>
                      {t && <TextoBaseQuestao t={t} aberto={false} />}
                      <CartaoQuestao
                        base={base}
                        q={q}
                        num={String(i + 1).padStart(2, "0")}
                        escolhida={s.marcadas[qid]}
                        corrigida
                        anuladaContaAcerto={prova}
                        extraMeta={s.revisar.includes(qid) ? <span className="pill mute">marcada para revisar</span> : null}
                      />
                    </VStack>
                  );
                })}
              </VStack>
            );
          })}
        </VStack>
      )}
      <HStack gap={2}>
        <Button label="Voltar aos simulados" variant="secondary" href="/simulados" />
      </HStack>
    </VStack>
  );
}
