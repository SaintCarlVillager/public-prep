"use client";
// Lei seca: pelo edital (os artigos que cada bloco cobra) ou uma norma inteira (?n=SIGLA#a-ART).

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";

import { ComCatalogo } from "~/components/Comum";
import { linkArtigo, TextoArtigo } from "~/components/LeiSeca";
import { useLei, type Base, type LeiCarregada } from "~/lib/catalogo";
import { ativos, vigentes } from "~/lib/estudo";
import { fmtData, intervaloCobre } from "~/lib/nucleo";
import { useProgresso } from "~/lib/progresso";
import type { Edital } from "~/lib/tipos";

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

/* ---------- lei seca do edital ---------- */

function PorEdital({ base }: { base: Base }) {
  const p = useProgresso();
  const router = useRouter();
  const params = useSearchParams();
  const eds = ativos(base, p).length ? ativos(base, p) : vigentes(base);
  const ed = eds.find((e) => e.id === params.get("e")) ?? eds[0];
  const disponiveis = Object.keys(base.cat.leis ?? {}).sort();

  return (
    <div className="stack">
      <section className="card">
        <header>
          <div style={{ display: "grid", gap: 4 }}>
            <h2>Lei seca do edital</h2>
            <span className="eyebrow">os artigos que cada bloco cobra, no texto vigente</span>
          </div>
          {eds.length > 1 && (
            <div className="seg" role="group" aria-label="Edital">
              {eds.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={ed?.id === e.id}
                  onClick={() => router.replace(`/lei?e=${encodeURIComponent(e.id)}`)}
                >
                  {base.rotulo(e)}
                </button>
              ))}
            </div>
          )}
        </header>
        {ed ? <Blocos base={base} edital={ed} /> : <p className="empty">Nenhum edital com prova futura.</p>}
      </section>
      <section className="card">
        <header>
          <h2>Todas as normas</h2>
          <span className="count">{disponiveis.length} com lei seca</span>
        </header>
        {disponiveis.length ? (
          <ul className="rows">
            {disponiveis.map((s) => (
              <li key={s}>
                <span>
                  <Link href={linkArtigo(s)}>
                    <b>{s}</b>
                  </Link>
                  <br />
                  <span className="sub">{base.cat.normas[s] ?? s}</span>
                </span>
                <span className="right">
                  <span className="pill mute">{base.cat.leis![s]!.artigos} artigos</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Nenhuma lei seca cadastrada ainda. Elas entram no repositório em leis/&lt;SIGLA&gt;.json.</p>
        )}
      </section>
    </div>
  );
}

function Blocos({ base, edital }: { base: Base; edital: Edital }) {
  const grupos = (edital.blocos ?? []).flatMap((b) =>
    (b.cobertura ?? [])
      .filter((c) => c.normas && Object.keys(c.normas).length)
      .map((c) => ({ bloco: b, materia: c.materia, normas: c.normas! })),
  );
  if (!grupos.length) return <p className="empty">Este edital não cobra artigos de lei: ele descreve o conteúdo por temas.</p>;
  return (
    <div style={{ display: "grid", gap: 20 }}>
      {grupos.map((g) => (
        <div key={g.bloco.id + g.materia} className="lei-grupo">
          <h3>
            {/^[IVX]+$/.test(g.bloco.id) ? `Bloco ${g.bloco.id} · ` : ""}
            {base.nomeMateria(g.materia)}
          </h3>
          {Object.entries(g.normas).map(([sigla, ints]) => (
            <Recolhivel
              key={sigla}
              titulo={
                <>
                  <b>{sigla}</b> <span className="sub">{ints.includes("*") ? "inteira" : ints.join(", ")}</span>
                </>
              }
              sub={base.cat.normas[sigla]}
              disponivel={!!base.cat.leis?.[sigla]}
            >
              <ArtigosDaNorma base={base} sigla={sigla} intervalos={ints} />
            </Recolhivel>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Só monta o conteúdo quando aberto: uma norma inteira pode ter mil artigos. */
function Recolhivel({ titulo, sub, disponivel, children }: { titulo: ReactNode; sub?: string; disponivel: boolean; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <details className="texto lei-norma" onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary>
        {titulo}
        {sub && <span className="sub lei-nome">{sub}</span>}
        {!disponivel && <span className="pill mute">lei seca ainda não cadastrada</span>}
      </summary>
      {aberto && disponivel && children}
    </details>
  );
}

function ArtigosDaNorma({ base, sigla, intervalos }: { base: Base; sigla: string; intervalos: string[] }) {
  const { lei, erro } = useLei(sigla);
  if (erro) return <p className="empty">Não consegui carregar a lei seca de {sigla}. Recarregue a página.</p>;
  if (!lei) return <p className="empty">Carregando…</p>;
  const arts = lei.artigos.filter((a) => intervalos.some((iv) => intervaloCobre(iv, a.art)));
  return (
    <div className="artigos">
      <Fonte lei={lei} base={base} />
      {arts.map((a) => (
        <article key={a.art} className="artigo">
          {a.local && <span className="eyebrow">{a.local}</span>}
          <TextoArtigo artigo={a} />
        </article>
      ))}
      {!arts.length && <p className="empty">Nenhum artigo desses intervalos está no texto cadastrado.</p>}
    </div>
  );
}

function Fonte({ lei, base }: { lei: LeiCarregada; base: Base }) {
  return (
    <p className="sub lei-fonte">
      {base.cat.normas[lei.sigla] ?? lei.nome} · texto consultado em {fmtData(lei.consultado)} ·{" "}
      <a href={lei.fonte} target="_blank" rel="noreferrer">
        fonte oficial
      </a>
      {lei.observacao ? ` · ${lei.observacao}` : ""}
    </p>
  );
}

/* ---------- uma norma inteira ---------- */

function Norma({ base, sigla }: { base: Base; sigla: string }) {
  const { lei, erro } = useLei(base.cat.leis?.[sigla] ? sigla : null);
  const [busca, setBusca] = useState("");
  const termo = semAcento(busca.trim());
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
    <section className="card">
      <header>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <span className="eyebrow">
            <Link href="/lei">Lei seca</Link> › {sigla}
          </span>
          <h2>{base.cat.normas[sigla] ?? sigla}</h2>
        </div>
        {lei && <span className="count">{lei.artigos.length} artigos</span>}
      </header>
      {!base.cat.leis?.[sigla] ? (
        <p className="empty">A lei seca desta norma ainda não foi cadastrada.</p>
      ) : erro ? (
        <p className="empty">Não consegui carregar a lei seca. Recarregue a página.</p>
      ) : !lei ? (
        <p className="empty">Carregando…</p>
      ) : (
        <>
          <Fonte lei={lei} base={base} />
          <label className="field eyebrow">
            Buscar no texto ou pelo número do artigo
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="ex.: citação, 246" />
          </label>
          {termo && <span className="count">{arts.length} artigos encontrados</span>}
          <div className="artigos">
            {arts.map((a) => (
              <article key={a.art} id={`a-${a.art}`} className="artigo">
                {a.local && <span className="eyebrow">{a.local}</span>}
                <TextoArtigo artigo={a} />
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
