"use client";

import { useRouter } from "next/navigation";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";

import { ComCatalogo, SelosEdital } from "~/components/Comum";
import { criarSessao } from "~/lib/acoes";
import type { Base } from "~/lib/catalogo";
import { ativos, estadoDe, ordenar, rotuloProva } from "~/lib/estudo";
import { embaralhar, hoje, materiaDe } from "~/lib/nucleo";
import { useProgresso, type Progresso } from "~/lib/progresso";
import type { IndiceQuestao } from "~/lib/tipos";

const FILTROS0 = { edital: "", banca: "", prova: "", materia: "", tema: "", status: "", anuladas: false };
type Filtros = typeof FILTROS0;
const CHAVE = "public-prep:filtros";
const MAX = 200;

export default function PaginaBanco() {
  return <ComCatalogo>{(b) => <Banco base={b} />}</ComCatalogo>;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const situacao = (p: Progresso, qid: string) => {
  const e = estadoDe(p, qid);
  return !e?.t ? "nunca" : e.a < e.t ? "erradas" : "acertadas";
};

function Banco({ base }: { base: Base }) {
  const p = useProgresso();
  const router = useRouter();
  const [F, setF] = useState<Filtros>(FILTROS0);
  useEffect(() => {
    try {
      const v = localStorage.getItem(CHAVE);
      if (v) setF({ ...FILTROS0, ...(JSON.parse(v) as Partial<Filtros>) });
    } catch {}
  }, []);
  // Estável, para os seletores (memo) não renderizarem de novo a cada letra digitada no tema.
  const muda = useCallback((parcial: Partial<Filtros>) => {
    setF((antes) => {
      const novo = { ...antes, ...parcial };
      try {
        localStorage.setItem(CHAVE, JSON.stringify(novo));
      } catch {}
      return novo;
    });
  }, []);

  // O campo responde na hora; a lista acompanha logo depois.
  const tema = useDeferredValue(F.tema);
  const lista = useMemo(() => {
    const ed = base.editais.find((e) => e.id === F.edital);
    const termo = semAcento(tema.trim());
    return Object.values(base.idx).filter((q) => {
      if (!F.anuladas && q.anulada) return false;
      if (ed && !base.rel(q.id, ed)) return false;
      if (F.banca && base.provas[q.prova]?.banca !== F.banca) return false;
      if (F.prova && q.prova !== F.prova) return false;
      if (F.materia && materiaDe(q) !== F.materia) return false;
      if (termo && !q.temas.some((t) => semAcento(base.nomeTema(t)).includes(termo) || t.includes(termo))) return false;
      if (F.status && situacao(p, q.id) !== F.status) return false;
      return true;
    });
  }, [base, p, tema, F.edital, F.anuladas, F.banca, F.prova, F.materia, F.status]);
  const praticaveis = lista.filter((q) => q.tipo === "me" && !q.anulada);

  const praticar = () => {
    const hj = hoje();
    const peso = (q: IndiceQuestao) => {
      const e = estadoDe(p, q.id);
      return !e?.t ? 1 : e.p && e.p <= hj ? 0 : 2;
    };
    const escolha = embaralhar(praticaveis).sort((a, b) => peso(a) - peso(b)).slice(0, 20);
    if (criarSessao("Prática do banco", ordenar(base, p, escolha))) router.push("/sessao");
  };

  return (
    // min-w-0: a coluna do app é um grid, e sem isto um rótulo longo alarga a página no celular.
    <VStack gap={6} className="min-w-0">
      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <Heading level={2}>Banco de questões</Heading>
            <Text type="supporting" color="secondary" hasTabularNumbers role="status">
              {lista.length} {lista.length === 1 ? "questão" : "questões"}
            </Text>
          </HStack>

          <Grid columns={{ minWidth: 170 }} gap={3} align="end">
            <Seletores base={base} p={p} edital={F.edital} banca={F.banca} prova={F.prova} materia={F.materia} muda={muda} />
            <TextInput
              // Campo de texto (e não type="search"): o painel.css ainda estiliza input[type=search] das telas antigas.
              inputMode="search"
              label="Tema"
              placeholder="ex.: citação"
              value={F.tema}
              onChange={(v) => muda({ tema: v })}
              hasClear
              enterKeyHint="search"
            />
            <Selector
              label="Situação"
              value={F.status}
              onChange={(v) => muda({ status: v ?? "" })}
              options={SITUACOES}
            />
          </Grid>

          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <CheckboxInput label="Incluir anuladas" value={F.anuladas} onChange={(v) => muda({ anuladas: v })} />
            <Button
              label={`Praticar estas (até ${Math.min(20, praticaveis.length) || 20})`}
              variant="primary"
              isDisabled={!praticaveis.length}
              onClick={praticar}
            />
          </HStack>

          {lista.length ? (
            <Linhas base={base} p={p} lista={lista} />
          ) : (
            <EmptyState
              isCompact
              title="Nenhuma questão com esses filtros"
              description="Tire um filtro ou mude o tema buscado para ver mais questões."
            />
          )}
          {lista.length > MAX && (
            <Text as="p" type="supporting" color="secondary">
              Mostrando {MAX} de {lista.length}. Refine os filtros para ver o resto.
            </Text>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}

// "" é "sem filtro": o Selector o mostra como a primeira opção.
const TODAS = { value: "", label: "Todas" };
const SITUACOES = [
  TODAS,
  { value: "nunca", label: "Nunca vistas" },
  { value: "erradas", label: "Erradas" },
  { value: "acertadas", label: "Acertadas" },
];

/** Os seletores que dependem do catálogo, fora do caminho da digitação no tema. */
const Seletores = memo(function Seletores({
  base,
  p,
  edital,
  banca,
  prova,
  materia,
  muda,
}: {
  base: Base;
  p: Progresso;
  edital: string;
  banca: string;
  prova: string;
  materia: string;
  muda: (parcial: Partial<Filtros>) => void;
}) {
  const opcoes = useMemo(() => {
    const bancas = [...new Set(base.cat.provas.map((x) => x.banca))].sort();
    const materias = [...new Set(Object.values(base.idx).map(materiaDe))]
      .filter(Boolean)
      .sort((a, b) => base.nomeMateria(a).localeCompare(base.nomeMateria(b), "pt"));
    return {
      editais: [
        { value: "", label: "Todos (sem filtro)" },
        ...ativos(base, p).map((e) => ({ value: e.id, label: `Só os que caem no ${base.rotulo(e)}` })),
      ],
      bancas: [TODAS, ...bancas.map((b) => ({ value: b, label: b }))],
      provas: [TODAS, ...base.cat.provas.map((x) => ({ value: x.id, label: `${x.banca} · ${x.orgao} ${x.ano}` }))],
      materias: [TODAS, ...materias.map((m) => ({ value: m, label: base.nomeMateria(m) }))],
    };
  }, [base, p]);
  return (
    <>
      <Selector label="Edital" value={edital} onChange={(v) => muda({ edital: v ?? "" })} options={opcoes.editais} />
      <Selector label="Banca" value={banca} onChange={(v) => muda({ banca: v ?? "" })} options={opcoes.bancas} />
      <Selector label="Prova" value={prova} onChange={(v) => muda({ prova: v ?? "" })} options={opcoes.provas} />
      <Selector label="Matéria" value={materia} onChange={(v) => muda({ materia: v ?? "" })} options={opcoes.materias} />
    </>
  );
});

/**
 * Até MAX linhas; cada linha só renderiza de novo quando muda a questão ou o progresso.
 * Linhas em HTML simples (`.rows` do painel.css), e não List/ListItem: medido, o ListItem deixava
 * a lista cerca de 2x mais lenta para montar as 200 linhas a cada filtro.
 */
const Linhas = memo(function Linhas({ base, p, lista }: { base: Base; p: Progresso; lista: IndiceQuestao[] }) {
  return (
    <ul className="rows">
      {lista.slice(0, MAX).map((q) => (
        <Linha key={q.id} base={base} p={p} q={q} />
      ))}
    </ul>
  );
});

const Linha = memo(function Linha({ base, p, q }: { base: Base; p: Progresso; q: IndiceQuestao }) {
  const e = estadoDe(p, q.id);
  const sit = situacao(p, q.id);
  return (
    // Uma coluna só: com os selos à direita (como antes), o texto virava uma palavra por linha no celular.
    <li>
      <span>
        <b className="mono">Q{q.n}</b>{" "}
        <span className="sub">
          · {rotuloProva(base, q.prova)}
          {q.tipo === "disc" ? " · discursiva" : ""}
        </span>
        <br />
        <span className="sub">{q.temas.map(base.nomeTema).join(" · ")}</span>
        <HStack as="span" gap={1.5} wrap="wrap" align="center" className="mt-2">
          {q.anulada && <Badge label="anulada" variant="neutral" />}
          {q.desat && <Badge label="desatualizada" variant="warning" />}
          <SelosEdital base={base} qid={q.id} />
          {sit === "nunca" ? (
            <Badge label="nunca vista" variant="neutral" />
          ) : (
            <Badge label={`${e!.a}/${e!.t}`} variant={sit === "erradas" ? "error" : "success"} />
          )}
        </HStack>
      </span>
    </li>
  );
});
