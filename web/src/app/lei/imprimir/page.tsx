"use client";
// Lei seca de um bloco do edital em formato de apostila, para imprimir ou salvar em PDF pelo navegador
// (/lei/imprimir?e=<edital>&b=<bloco>). Na tela, uma prévia em folha branca; na impressão, só o documento,
// com capa, apresentação, sumário e, por matéria, cada norma com o recorte do edital e os artigos.
// O visual do documento fica no painel.css ("Lei seca impressa"); as regras de @page vão num <style> só desta
// tela, porque o cabeçalho corrido muda com o edital e não pode afetar a impressão das outras telas.
// A capa não zera a margem com @page :first: o Chrome usa a largura da primeira página para diagramar o documento
// inteiro, e o texto das outras sairia cortado. Ela fica na área útil, como um cartão (.imp-capa no painel.css).

import { useSearchParams } from "next/navigation";
import { Fragment, memo, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { ComCatalogo } from "~/components/Comum";
import { nomeBloco, ROTULO } from "~/components/LeiSeca";
import { useLeis, type Base, type LeiCarregada } from "~/lib/catalogo";
import { fmtData, intervaloCobre, nivelLinha, recorteNorma, rotuloIntervalo, separarNotas } from "~/lib/nucleo";
import type { ArtigoLei, Bloco, Cobertura, Edital } from "~/lib/tipos";

export default function PaginaImprimir() {
  return (
    <ComCatalogo>
      {(b) => (
        <Suspense>
          <Impressao base={b} />
        </Suspense>
      )}
    </ComCatalogo>
  );
}

interface Grupo {
  bloco: Bloco;
  cob: Cobertura & { normas: Record<string, string[]> };
}

const anoDe = (e: Edital) => /(\d{4})$/.exec(e.id)?.[1] ?? "";
/** Id de âncora a partir de um texto qualquer ("CPC", "396-396-A"). */
const ancora = (...partes: (string | number)[]) => "imp-" + partes.join("-").replace(/[^\w-]/g, "_");
/** Texto para o `content` de uma regra CSS. */
const cssTexto = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")}"`;

function Impressao({ base }: { base: Base }) {
  const params = useSearchParams();
  const ed = base.editais.find((e) => e.id === params.get("e"));
  const idBloco = params.get("b");
  const grupos: Grupo[] = useMemo(
    () =>
      (ed?.blocos ?? [])
        .filter((b) => !idBloco || b.id === idBloco)
        .flatMap((b) =>
          (b.cobertura ?? [])
            .filter((c): c is Grupo["cob"] => !!c.normas && Object.keys(c.normas).length > 0)
            .map((cob) => ({ bloco: b, cob })),
        ),
    [ed, idBloco],
  );
  const siglas = useMemo(
    () => [...new Set(grupos.flatMap((g) => Object.keys(g.cob.normas)))].filter((s) => base.cat.leis?.[s]),
    [grupos, base],
  );
  const { leis, erros, prontas } = useLeis(siglas);
  const blocos = [...new Set(grupos.map((g) => g.bloco))];
  const titulo = ed
    ? [base.rotulo(ed), anoDe(ed), blocos.length === 1 && /^[IVX]+$/.test(blocos[0]!.id) ? `Bloco ${blocos[0]!.id}` : ""]
        .filter(Boolean)
        .join(" · ")
    : "";

  // O título vira o nome sugerido do PDF ao salvar.
  useEffect(() => {
    if (!titulo) return;
    const antes = document.title;
    document.title = `Lei seca · ${titulo}`;
    return () => {
      document.title = antes;
    };
  }, [titulo]);

  // Vindo do botão da lei seca (imprimir=1), abre a janela de impressão assim que tudo carregar, uma vez só.
  const disparou = useRef(false);
  useEffect(() => {
    if (!prontas || !grupos.length || disparou.current || params.get("imprimir") !== "1") return;
    disparou.current = true;
    const u = new URL(location.href);
    u.searchParams.delete("imprimir");
    history.replaceState(history.state, "", u);
    void document.fonts.ready.then(() => requestAnimationFrame(() => window.print()));
  }, [prontas, grupos.length, params]);

  if (!ed || !grupos.length)
    return (
      <Card padding={6}>
        <EmptyState
          isCompact
          title={ed ? "Este bloco não cobra artigos de lei" : "Edital não encontrado"}
          description="A versão para impressão reúne os artigos que um bloco do edital cobra."
          actions={<Link href="/lei">Voltar à lei seca</Link>}
        />
      </Card>
    );

  const nArtigos = grupos.reduce(
    (t, g) =>
      t +
      Object.entries(g.cob.normas).reduce(
        (u, [s, ints]) => u + (leis[s]?.artigos.filter((a) => ints.some((iv) => intervaloCobre(iv, a.art))).length ?? 0),
        0,
      ),
    0,
  );

  return (
    <VStack gap={6} className="min-w-0">
      <Card padding={6} className="so-tela">
        <VStack gap={4}>
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              <Link href={`/lei?e=${encodeURIComponent(ed.id)}`} color="primary" hasUnderline type="inherit">
                Lei seca
              </Link>{" "}
              › Imprimir
            </Text>
            <Heading level={2}>{titulo}</Heading>
          </VStack>
          {prontas ? (
            <Text as="p" color="secondary" hasTabularNumbers role="status">
              {siglas.length} {siglas.length === 1 ? "norma" : "normas"}, {nArtigos} artigos. Na janela de impressão,
              escolha “Salvar como PDF” para guardar a apostila.
            </Text>
          ) : (
            <HStack gap={2} align="center" role="status">
              <Spinner size="sm" aria-label="Carregando" />
              <Text color="secondary" hasTabularNumbers>
                Carregando as leis ({Object.keys(leis).length} de {siglas.length})…
              </Text>
            </HStack>
          )}
          {erros.length > 0 && (
            <Text as="p" color="secondary">
              Não consegui carregar {erros.join(", ")}: sem internet, só sai o que já está guardado no aparelho (em
              Ajustes, dá para baixar a lei seca toda). Elas aparecem como pendentes no documento.
            </Text>
          )}
          <HStack gap={2} wrap="wrap">
            <Button
              label="Imprimir ou salvar em PDF"
              variant="primary"
              isDisabled={!prontas}
              onClick={() => window.print()}
            />
          </HStack>
        </VStack>
      </Card>
      {prontas && <Documento base={base} edital={ed} grupos={grupos} leis={leis} titulo={titulo} />}
    </VStack>
  );
}

/* ---------- o documento ---------- */

const Documento = memo(function Documento({
  base,
  edital,
  grupos,
  leis,
  titulo,
}: {
  base: Base;
  edital: Edital;
  grupos: Grupo[];
  leis: Record<string, LeiCarregada>;
  titulo: string;
}) {
  const blocos = [...new Set(grupos.map((g) => g.bloco))];
  const datas = Object.values(leis)
    .map((l) => l.consultado)
    .filter(Boolean)
    .sort();
  const consulta =
    datas.length === 0
      ? ""
      : datas[0] === datas.at(-1)
        ? `em ${fmtData(datas[0])}`
        : `entre ${fmtData(datas[0])} e ${fmtData(datas.at(-1))}`;
  const hoje = fmtData(new Date().toLocaleDateString("sv"));
  const materias = [...new Set(grupos.map((g) => base.nomeMateria(g.cob.materia)))];
  const questoes = blocos.reduce((t, b) => t + (b.questoes ?? 0), 0);
  const umBloco = blocos.length === 1 ? blocos[0] : undefined;
  const rodape = ["Lei seca", edital.edital && edital.edital.length <= 60 ? edital.edital : base.rotulo(edital)].join(" · ");

  const page = `
@page { size: A4; margin: 18mm 16mm;
  @top-right { content: ${cssTexto(titulo)}; font: 8pt system-ui, sans-serif; color: #575e6b; }
  @bottom-left { content: ${cssTexto(rodape)}; font: 8pt system-ui, sans-serif; color: #575e6b; }
  @bottom-right { content: counter(page); font: 9pt system-ui, sans-serif; color: #1c2430; }
}
@page :first {
  @top-right { content: none; } @bottom-left { content: none; } @bottom-right { content: none; }
}`;

  return (
    <article className="impresso" aria-label={`Lei seca · ${titulo}`}>
      <style>{page}</style>

      <section className="imp-capa">
        <p className="imp-capa-orgao">
          {[edital.orgao, edital.banca].filter(Boolean).join(" · ")}
          {anoDe(edital) ? ` · Concurso ${anoDe(edital)}` : ""}
        </p>
        <h1 className="imp-capa-cargo">{edital.cargo ?? base.rotulo(edital)}</h1>
        {edital.edital && edital.edital.length <= 60 && <p className="imp-capa-edital">{edital.edital}</p>}
        {umBloco && (
          <>
            <hr className="imp-capa-grifo" />
            {/^[IVX]+$/.test(umBloco.id) && <p className="imp-capa-bloco">Bloco {umBloco.id}</p>}
            <p className="imp-capa-nome">{umBloco.nome}</p>
          </>
        )}
        <section className="imp-capa-base">
          <p className="imp-capa-titulo">Lei seca — íntegra dos dispositivos do conteúdo programático</p>
          <p className="imp-capa-materias">{materias.join(" · ")}</p>
          <p className="imp-capa-pe">
            <span>{consulta && `Textos obtidos nas fontes oficiais ${consulta}`}</span>
            <span>
              Gerado em {hoje} · Servent<b>IA</b>
            </span>
          </p>
        </section>
      </section>

      <section className="imp-pagina">
        <h2 className="imp-titulo">Como usar esta apostila</h2>
        <p>
          Esta apostila reúne, na íntegra, os dispositivos legais que o edital
          {edital.edital && edital.edital.length <= 60 ? ` (${edital.edital})` : ""} de{" "}
          <strong>{edital.cargo ?? base.rotulo(edital)}</strong>
          {edital.orgao ? ` (${edital.orgao})` : ""} cobra em{" "}
          {blocos.map((b, i) => (
            <Fragment key={b.id}>
              {i > 0 && (i === blocos.length - 1 ? " e " : ", ")}
              <strong>{nomeBloco(b)}</strong>
            </Fragment>
          ))}
          {questoes ? ` (${questoes} questões)` : ""}. Cada norma abre com o quadro <strong>“Recorte do edital”</strong>,
          com os artigos cobrados, seguido da fonte oficial e da data em que o texto foi consultado.
        </p>
        <dl className="imp-legenda">
          <dt>
            <strong>Art. 5º</strong>
          </dt>
          <dd>número do artigo</dd>
          <dt>
            <span className="imp-nota">(Redação dada pela Lei …)</span>
          </dt>
          <dd>nota de alteração da fonte oficial</dd>
          <dt>
            <span className="imp-estrutura">TÍTULO II</span>
          </dt>
          <dd>parte, livro, título ou capítulo da norma</dd>
          <dt>
            <span className="imp-faixa-mini">Arts. 1º a 12</span>
          </dt>
          <dd>trecho do edital</dd>
        </dl>
        <h3 className="imp-subtitulo">Atualização dos textos</h3>
        <p>
          {edital.legislacao_ate
            ? `O edital considera a legislação com as alterações vigentes até ${fmtData(edital.legislacao_ate)}. `
            : ""}
          Os textos são os vigentes na data da consulta indicada em cada norma{consulta ? ` (${consulta})` : ""} e podem
          incluir alterações posteriores ao edital. Em caso de dúvida sobre a redação cobrada, confira a data da
          alteração indicada na nota.
        </p>
        <p className="imp-suave">
          Gerado pelo ServentIA em {hoje}, a partir do conteúdo programático cadastrado e da lei seca do app. O texto
          das normas é transcrito da fonte oficial, sem resumo; o que a fonte omite (rubricas, anexos) é dito na nota de
          cada norma.
        </p>
      </section>

      <nav className="imp-pagina imp-sumario" aria-label="Sumário">
        <h2 className="imp-titulo">Sumário</h2>
        <ol>
          {grupos.map((g, i) => (
            <li key={g.bloco.id + g.cob.materia}>
              <a className="imp-sum-materia" href={`#${ancora(i)}`}>
                {i + 1}. {base.nomeMateria(g.cob.materia)}
                {blocos.length > 1 && <span className="imp-suave"> · {nomeBloco(g.bloco)}</span>}
              </a>
              <ul>
                {Object.entries(g.cob.normas).map(([s, ints]) => (
                  <li key={s}>
                    <a className="imp-sum-norma" href={`#${ancora(i, s)}`}>
                      {base.cat.normas[s] ?? leis[s]?.nome ?? s}
                    </a>
                    <ul className="imp-sum-trechos">
                      {ints.map((iv) => (
                        <li key={iv}>
                          <a href={`#${ancora(i, s, iv)}`}>{rotuloIntervalo(iv)}</a>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </nav>

      {grupos.map((g, i) => (
        <section key={g.bloco.id + g.cob.materia} className="imp-materia" id={ancora(i)}>
          <h2 className="imp-materia-titulo">
            <span className="imp-materia-num">{i + 1}</span>
            {base.nomeMateria(g.cob.materia)}
          </h2>
          {Object.entries(g.cob.normas).map(([s, ints], j) => (
            <NormaImpressa
              key={s}
              id={ancora(i, s)}
              ancoraTrecho={(iv) => ancora(i, s, iv)}
              nome={base.cat.normas[s] ?? leis[s]?.nome ?? s}
              sigla={s}
              intervalos={ints}
              lei={leis[s]}
              cadastrada={!!base.cat.leis?.[s]}
              observacao={j === 0 ? g.cob.observacao : undefined}
            />
          ))}
        </section>
      ))}
    </article>
  );
});

function NormaImpressa({
  id,
  ancoraTrecho,
  nome,
  sigla,
  intervalos,
  lei,
  cadastrada,
  observacao,
}: {
  id: string;
  ancoraTrecho: (iv: string) => string;
  nome: string;
  sigla: string;
  intervalos: string[];
  lei?: LeiCarregada;
  cadastrada: boolean;
  observacao?: string;
}) {
  return (
    <section className="imp-norma" id={id}>
      <h3 className="imp-norma-titulo">{nome}</h3>
      <aside className="imp-recorte">
        <p className="imp-recorte-rotulo">Recorte do edital</p>
        <p>
          {sigla} – {recorteNorma(intervalos)}.
        </p>
        {observacao && <p>Observação: {observacao}</p>}
        {lei ? (
          <>
            <p className="imp-recorte-fonte">Fonte: {lei.fonte}</p>
            <p>Texto obtido em {fmtData(lei.consultado)}.</p>
            {lei.observacao && <p className="imp-recorte-obs">{lei.observacao}</p>}
          </>
        ) : (
          <p>
            <strong>
              {cadastrada
                ? "Não consegui carregar o texto desta norma: gere o PDF de novo com internet."
                : "A lei seca desta norma ainda não foi cadastrada no app."}
            </strong>
          </p>
        )}
      </aside>
      {lei &&
        intervalos.map((iv) => {
          const arts = lei.artigos.filter((a) => intervaloCobre(iv, a.art));
          return (
            <section key={iv} className="imp-trecho" id={ancoraTrecho(iv)}>
              <h4 className="imp-faixa">{rotuloIntervalo(iv)}</h4>
              {arts.length ? (
                <ArtigosImpressos arts={arts} />
              ) : (
                <p className="imp-suave">Nenhum artigo deste trecho está no texto cadastrado (renumerado ou revogado?).</p>
              )}
            </section>
          );
        })}
    </section>
  );
}

/** Os artigos de um trecho; quando muda a parte, o título ou o capítulo (`local`), o novo nível sai centralizado. */
function ArtigosImpressos({ arts }: { arts: ArtigoLei[] }) {
  let anterior: string[] = [];
  return (
    <>
      {arts.map((a) => {
        const niveis = a.local ? a.local.split(" › ") : [];
        let k = 0;
        while (k < niveis.length && niveis[k] === anterior[k]) k++;
        anterior = niveis;
        const novos = niveis.slice(k);
        return (
          <Fragment key={a.art}>
            {novos.length > 0 && (
              <p className="imp-estrutura">
                {novos.map((n, i) => (
                  <span key={i}>{n}</span>
                ))}
              </p>
            )}
            <section className="imp-artigo">
              {a.texto.split("\n").map((l, i) => (l.trim() ? <LinhaLei key={i} linha={l} /> : null))}
            </section>
          </Fragment>
        );
      })}
    </>
  );
}

const PARAGRAFO = /^\s*(?:§\s*\d+[º°o]?(?:-[A-Z]{1,2})?\.?|Par[áa]grafo [úu]nico\.?)/;

function LinhaLei({ linha }: { linha: string }) {
  const nivel = nivelLinha(linha);
  const m = ROTULO.exec(linha) ?? PARAGRAFO.exec(linha);
  const rotulo = m?.[0] ?? "";
  const resto = linha.slice(rotulo.length);
  const partes: ReactNode[] = separarNotas(resto).map((p, i) =>
    p.nota ? (
      <span key={i} className="imp-nota">
        {p.texto}
      </span>
    ) : (
      <Fragment key={i}>{p.texto}</Fragment>
    ),
  );
  return (
    <p className={nivel ? `imp-n${nivel}` : undefined}>
      {rotulo && <strong>{rotulo}</strong>}
      {partes}
    </p>
  );
}
