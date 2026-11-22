"use client";
// Lei seca: pelo edital (os artigos que cada bloco cobra) ou uma norma inteira (?n=SIGLA#a-ART).

import { useRouter, useSearchParams } from "next/navigation";
import { memo, Suspense, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";

import { ComCatalogo } from "~/components/Comum";
import { linkArtigo, TextoArtigo } from "~/components/LeiSeca";
import { useLei, type Base, type LeiCarregada } from "~/lib/catalogo";
import { ativos, vigentes } from "~/lib/estudo";
import { fmtData, intervaloCobre } from "~/lib/nucleo";
import { useProgresso } from "~/lib/progresso";
import type { ArtigoLei, Edital } from "~/lib/tipos";

export default function PaginaLei() {
  return (
    <ComCatalogo>
      {(b) => (
        <Suspense>
          <LeiSeca base={b} />
        </Suspense>
      )}
    </ComCatalogo>
  );
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function LeiSeca({ base }: { base: Base }) {
  const params = useSearchParams();
  const sigla = params.get("n");
  return sigla ? <Norma base={base} sigla={sigla} /> : <PorEdital base={base} />;
}

/** Estado sem conteúdo (carregando, erro, nada cadastrado): texto secundário, sem caixa. */
const Aviso = ({ children }: { children: ReactNode }) => (
  <Text as="p" color="secondary">
    {children}
  </Text>
);

/* ---------- lei seca do edital ---------- */

function PorEdital({ base }: { base: Base }) {
  const p = useProgresso();
  const router = useRouter();
  const params = useSearchParams();
  const eds = ativos(base, p).length ? ativos(base, p) : vigentes(base);
  const ed = eds.find((e) => e.id === params.get("e")) ?? eds[0];
  const disponiveis = Object.keys(base.cat.leis ?? {}).sort();

  return (
    // min-w-0: a coluna do app é um grid, e sem isto um título longo alarga a página no celular.
    <VStack gap={6} className="min-w-0">
      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <VStack gap={1}>
              <Heading level={2}>Lei seca do edital</Heading>
              <Text type="supporting" color="secondary">
                Os artigos que cada bloco cobra, no texto vigente
              </Text>
            </VStack>
            {eds.length > 1 && ed && (
              // Selector, e não SegmentedControl: com três editais, o segmentado cortava os nomes no celular.
              <Selector
                label="Edital"
                isLabelHidden
                value={ed.id}
                onChange={(id) => id && router.replace(`/lei?e=${encodeURIComponent(id)}`)}
                options={eds.map((e) => ({ value: e.id, label: base.rotulo(e) }))}
              />
            )}
          </HStack>
          {ed ? (
            <Blocos base={base} edital={ed} />
          ) : (
            <EmptyState
              isCompact
              title="Nenhum edital com prova futura"
              description="Quando houver um concurso aberto, os artigos que ele cobra aparecem aqui."
            />
          )}
        </VStack>
      </Card>

      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <Heading level={2}>Todas as normas</Heading>
            <Text type="supporting" color="secondary" hasTabularNumbers>
              {disponiveis.length} com lei seca
            </Text>
          </HStack>
          {disponiveis.length ? (
            <List hasDividers edge="flush" density="compact">
              {disponiveis.map((s) => (
                <ListItem
                  key={s}
                  href={linkArtigo(s)}
                  label={<Text weight="semibold">{s}</Text>}
                  description={
                    <Text type="supporting" color="secondary" className="whitespace-normal">
                      {base.cat.normas[s] ?? s}
                    </Text>
                  }
                  endContent={
                    <Text type="supporting" color="secondary" hasTabularNumbers textWrap="nowrap">
                      {base.cat.leis![s]!.artigos} artigos
                    </Text>
                  }
                />
              ))}
            </List>
          ) : (
            <EmptyState
              isCompact
              title="Nenhuma lei seca cadastrada ainda"
              description="Elas entram no repositório em leis/<SIGLA>.json."
            />
          )}
        </VStack>
      </Card>
    </VStack>
  );
}

function Blocos({ base, edital }: { base: Base; edital: Edital }) {
  const grupos = (edital.blocos ?? []).flatMap((b) =>
    (b.cobertura ?? [])
      .filter((c) => c.normas && Object.keys(c.normas).length)
      .map((c) => ({ bloco: b, materia: c.materia, normas: c.normas! })),
  );
  if (!grupos.length) return <Aviso>Este edital não cobra artigos de lei: ele descreve o conteúdo por temas.</Aviso>;
  return (
    <VStack gap={6}>
      {grupos.map((g) => (
        <VStack key={g.bloco.id + g.materia} gap={2}>
          <Heading level={3}>
            {/^[IVX]+$/.test(g.bloco.id) ? `Bloco ${g.bloco.id} · ` : ""}
            {base.nomeMateria(g.materia)}
          </Heading>
          <VStack gap={2}>
            {Object.entries(g.normas).map(([sigla, ints]) => (
              <Recolhivel
                key={sigla}
                sigla={sigla}
                intervalos={ints.includes("*") ? "inteira" : ints.join(", ")}
                nome={base.cat.normas[sigla]}
                disponivel={!!base.cat.leis?.[sigla]}
              >
                <ArtigosDaNorma base={base} sigla={sigla} intervalos={ints} />
              </Recolhivel>
            ))}
          </VStack>
        </VStack>
      ))}
    </VStack>
  );
}

/** Só monta o conteúdo quando aberto: uma norma inteira pode ter mil artigos. */
function Recolhivel({
  sigla,
  intervalos,
  nome,
  disponivel,
  children,
}: {
  sigla: string;
  intervalos: string;
  nome?: string;
  disponivel: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <Card padding={4}>
      <Collapsible
        isOpen={aberto}
        onOpenChange={setAberto}
        isDisabled={!disponivel}
        trigger={
          <VStack gap={0.5} className="min-w-0">
            <Text className="whitespace-normal">
              <Text weight="semibold">{sigla}</Text>{" "}
              <Text type="supporting" color="secondary">
                {intervalos}
              </Text>
            </Text>
            {nome && (
              <Text type="supporting" color="secondary" className="whitespace-normal">
                {nome}
              </Text>
            )}
            {!disponivel && (
              <HStack>
                <Badge label="lei seca ainda não cadastrada" variant="neutral" />
              </HStack>
            )}
          </VStack>
        }
      >
        {aberto && disponivel && children}
      </Collapsible>
    </Card>
  );
}

function ArtigosDaNorma({ base, sigla, intervalos }: { base: Base; sigla: string; intervalos: string[] }) {
  const { lei, erro } = useLei(sigla);
  if (erro) return <Aviso>Não consegui carregar a lei seca de {sigla}. Recarregue a página.</Aviso>;
  if (!lei) return <Aviso>Carregando…</Aviso>;
  const arts = lei.artigos.filter((a) => intervalos.some((iv) => intervaloCobre(iv, a.art)));
  return (
    <VStack gap={2}>
      <Fonte lei={lei} base={base} />
      {arts.length ? <Artigos arts={arts} /> : <Aviso>Nenhum artigo desses intervalos está no texto cadastrado.</Aviso>}
    </VStack>
  );
}

function Fonte({ lei, base }: { lei: LeiCarregada; base: Base }) {
  return (
    <Text as="p" type="supporting" color="secondary">
      {base.cat.normas[lei.sigla] ?? lei.nome} · texto consultado em {fmtData(lei.consultado)} ·{" "}
      <Link href={lei.fonte} isExternalLink color="primary" hasUnderline type="inherit" newTabLabel="(abre em nova aba)">
        fonte oficial
      </Link>
      {lei.observacao ? ` · ${lei.observacao}` : ""}
    </Text>
  );
}

/**
 * Os artigos, em leitura (Literata, texto literal). Uma norma inteira passa de mil artigos, então cada
 * artigo fica em HTML simples com as classes do painel.css (`.artigo`), sem um componente por linha:
 * medido, é o que mantém a abertura e a busca tão rápidas quanto antes.
 */
const Artigos = memo(function Artigos({ arts, comAncora }: { arts: ArtigoLei[]; comAncora?: boolean }) {
  return (
    <section className="artigos">
      {arts.map((a) => (
        <article key={a.art} id={comAncora ? `a-${a.art}` : undefined} className="artigo">
          {a.local && <span className="eyebrow">{a.local}</span>}
          <TextoArtigo artigo={a} />
        </article>
      ))}
    </section>
  );
});

/* ---------- uma norma inteira ---------- */

function Norma({ base, sigla }: { base: Base; sigla: string }) {
  const { lei, erro } = useLei(base.cat.leis?.[sigla] ? sigla : null);
  const [busca, setBusca] = useState("");
  // O campo responde na hora; a lista (até milhares de artigos) acompanha logo depois.
  const termo = semAcento(useDeferredValue(busca).trim());
  const arts = useMemo(() => {
    if (!lei) return [];
    if (!termo) return lei.artigos;
    return lei.artigos.filter((a) => a.art === termo.toUpperCase() || semAcento(a.texto).includes(termo));
  }, [lei, termo]);

  // Vai ao artigo do link (#a-246) quando o texto termina de carregar.
  useEffect(() => {
    if (!lei || !location.hash) return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, [lei]);

  return (
    <VStack gap={6} className="min-w-0">
      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="end" gap={3} wrap="wrap">
            <VStack gap={1} className="min-w-0">
              <Text type="supporting" color="secondary">
                <Link href="/lei" color="primary" hasUnderline type="inherit">
                  Lei seca
                </Link>{" "}
                › {sigla}
              </Text>
              <Heading level={2}>{base.cat.normas[sigla] ?? sigla}</Heading>
            </VStack>
            {lei && (
              <Text type="supporting" color="secondary" hasTabularNumbers>
                {lei.artigos.length} artigos
              </Text>
            )}
          </HStack>
          {!base.cat.leis?.[sigla] ? (
            <EmptyState
              isCompact
              title="Lei seca ainda não cadastrada"
              description="O texto desta norma ainda não entrou no repositório."
              actions={<Link href="/lei">Ver as normas com lei seca</Link>}
            />
          ) : erro ? (
            <Aviso>Não consegui carregar a lei seca. Recarregue a página.</Aviso>
          ) : !lei ? (
            <Aviso>Carregando…</Aviso>
          ) : (
            <>
              <Fonte lei={lei} base={base} />
              <TextInput
                // Campo de texto (e não type="search"): o painel.css ainda estiliza input[type=search] das telas antigas.
                inputMode="search"
                label="Buscar no texto ou pelo número do artigo"
                placeholder="ex.: citação, 246"
                value={busca}
                onChange={setBusca}
                hasClear
                enterKeyHint="search"
              />
              {termo && (
                <Text type="supporting" color="secondary" hasTabularNumbers role="status">
                  {arts.length} {arts.length === 1 ? "artigo encontrado" : "artigos encontrados"}
                </Text>
              )}
              <Artigos arts={arts} comAncora />
            </>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}
