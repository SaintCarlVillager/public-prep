"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { ComCatalogo, IconeCerto, IconeErrado, Md, SelosEdital } from "~/components/Comum";
import { apagarSessao, criarSessao, entregar, marcar } from "~/lib/acoes";
import { caminhoDados, useProvas, type Base } from "~/lib/catalogo";
import { ativos, montarAutomatica, sigla } from "~/lib/estudo";
import { fmtDia, hoje, materiaDe, pct, slugDe } from "~/lib/nucleo";
import { atualizar, useProgresso, type Progresso } from "~/lib/progresso";
import type { Questao, TextoBase } from "~/lib/tipos";

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
    if (!criarSessao("Sessão automática", qs)) alert("Nenhuma questão disponível para uma sessão agora.");
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
    <div className="stack">
      <div className="session-head">
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span className="eyebrow">
            {id ? `Sessão · ${fmtDia(p.sessoes[id]!.data)} · ${p.sessoes[id]!.questoes.length} questões` : "Sessão"}
          </span>
          <h2>{id ? p.sessoes[id]!.titulo : "Nenhuma sessão ainda"}</h2>
          {id && <Mistura base={base} qids={p.sessoes[id]!.questoes} />}
        </div>
        <div className="actions">
          <label className="field eyebrow">
            Sessões
            <select
              value={id ?? ""}
              disabled={!lista.length}
              onChange={(e) =>
                atualizar((x) => {
                  x.atual = e.target.value;
                })
              }
            >
              {lista.map(([sid, s]) => (
                <option key={sid} value={sid}>
                  {s.titulo} · {fmtDia(s.data)}
                  {p.respostas[sid] ? " ✓" : ""}
                </option>
              ))}
              {!lista.length && <option value="">Nenhuma sessão</option>}
            </select>
          </label>
        </div>
      </div>
      <div className="actions">
        <button className="btn" type="button" onClick={nova}>
          Nova sessão automática
        </button>
        {id && !p.respostas[id] && (
          <button
            className="btn ghost"
            type="button"
            onClick={() => confirm("Apagar esta sessão não entregue?") && apagarSessao(id)}
          >
            Apagar sessão
          </button>
        )}
      </div>
      {id ? (
        <Questoes key={id} base={base} p={p} id={id} />
      ) : (
        <section className="card">
          <p className="empty">
            Nenhuma sessão ainda. Clique em <b>Nova sessão automática</b>: o app junta revisões vencidas, temas fracos e
            questões nunca vistas do edital de prova mais próxima.
          </p>
        </section>
      )}
    </div>
  );
}

function Mistura({ base, qids }: { base: Base; qids: string[] }) {
  const p = useProgresso();
  return (
    <div className="mix">
      {ativos(base, p).map((e) => {
        const n = qids.filter((q) => base.rel(q, e)).length;
        return n ? (
          <span key={e.id} className={`pill ${/^TRF/i.test(sigla(e)) ? "fed" : "tj"}`}>
            {n} no {sigla(e)}
          </span>
        ) : null;
      })}
    </div>
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

function Questoes({ base, p, id }: { base: Base; p: Progresso; id: string }) {
  const s = p.sessoes[id]!;
  const feito = p.respostas[id];
  const { provas, erro } = useProvas(s.questoes.map(slugDe));
  if (erro)
    return <div className="notice bad">Não consegui carregar as questões desta sessão. Recarregue a página.</div>;
  if (!provas) return <p className="empty">Carregando as questões…</p>;

  const completa = (qid: string) => provas[slugDe(qid)]?.porId[qid];
  const textoDe = (q: Questao): TextoBase | null => (q.texto ? (provas[slugDe(q.id)]?.textos[q.texto] ?? null) : null);
  const picks = feito ? feito.respostas : (p.rascunhos[id] ?? {});
  const textosVistos = new Set<string>();
  const respondidas = s.questoes.filter((q) => picks[q]).length;
  const porId = Object.fromEntries(s.questoes.map((q) => [q, completa(q)]).filter(([, q]) => q)) as Record<string, Questao>;

  return (
    <>
      {feito && (
        <section className="card">
          <div className="result">
            <span className={`stamp ${pct(feito.acertos, feito.total) < 50 ? "low" : ""}`}>
              {feito.acertos}/{feito.total}
            </span>
            <div>
              <b>Sessão entregue</b>
              <br />
              <small className="eyebrow">{new Date(feito.entregueEm).toLocaleString("pt-BR")}</small>
              <p>Abaixo, cada questão com gabarito e explicação. As erradas voltam amanhã na aba Revisões.</p>
            </div>
          </div>
        </section>
      )}
      <div className="qlist">
        {s.questoes.map((qid, i) => {
          const q = completa(qid);
          const num = String(i + 1).padStart(2, "0");
          if (!q)
            return (
              <article key={qid} className="q">
                <div className="meta">
                  <span className="num">{num}</span>
                  <span className="pill warn">indisponível</span>
                </div>
                <p className="empty">A questão {qid} não está no catálogo publicado.</p>
              </article>
            );
          const t = textoDe(q);
          const kt = slugDe(qid) + "|" + (q.texto ?? "");
          const mostraTexto = t && !textosVistos.has(kt);
          if (t) textosVistos.add(kt);
          const anulada = q.anulada || base.idx[qid]?.anulada;
          const escolhida = picks[qid];
          const faltaAlt = !q.exp_alt || Object.keys(q.alt ?? {}).some((L) => !q.exp_alt?.[L]);
          const tema = (q.temas ?? []).map(base.nomeTema).slice(0, 2).join(" · ");
          return (
            <div key={qid} style={{ display: "grid", gap: 16 }}>
              {mostraTexto && (
                <details className="texto" open>
                  <summary>{t.titulo ?? "Texto-base"}</summary>
                  <Md className="corpo" texto={t.texto} />
                  {t.fonte && (
                    <small>
                      <Md inline texto={t.fonte} />
                    </small>
                  )}
                </details>
              )}
              <article className="q" id={`q-${i + 1}`}>
                <div className="meta">
                  <span className="num">{num}</span>
                  <span className="eyebrow">
                    {base.nomeMateria(materiaDe(q))}
                    {tema ? ` · ${tema}` : ""}
                  </span>
                  {feito &&
                    (anulada ? (
                      <span className="pill mute">anulada · não conta</span>
                    ) : escolhida === q.gab ? (
                      <span className="pill">acertou</span>
                    ) : (
                      <span className="pill bad">errou · gabarito {q.gab}</span>
                    ))}
                  {feito && <SeloFonte base={base} q={q} />}
                  {feito && <SelosEdital base={base} qid={qid} />}
                  {feito && q.desatualizada && <span className="pill warn">desatualizada</span>}
                  {!feito && anulada && <span className="pill mute">anulada</span>}
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
                    if (feito) {
                      if (L === q.gab && !anulada) cls += " right";
                      else if (L === escolhida && !anulada) cls += " wrong";
                    }
                    const botao = (
                      <button
                        key={L}
                        type="button"
                        className={cls}
                        aria-pressed={escolhida === L}
                        aria-disabled={feito ? true : undefined}
                        onClick={() => !feito && marcar(id, qid, L)}
                      >
                        {feito && !anulada && L === q.gab && (
                          <span className="v">
                            <IconeCerto />
                            {escolhida === L ? "Correta · sua resposta" : "Correta"}
                          </span>
                        )}
                        {feito && !anulada && L !== q.gab && L === escolhida && (
                          <span className="v">
                            <IconeErrado />
                            Sua resposta
                          </span>
                        )}
                        <span className="l">{L}</span>
                        <Md inline texto={txt} />
                      </button>
                    );
                    const ca = feito && q.exp_alt?.[L];
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
                {feito && q.exp && faltaAlt && (
                  <div className="exp">
                    {q.exp_alt && (
                      <span className="eyebrow" style={{ display: "block", marginBottom: 6 }}>
                        Comentário da questão
                      </span>
                    )}
                    <Md texto={q.exp} />
                  </div>
                )}
                {feito && q.desatualizada && (
                  <div className="note">
                    <b>Desatualizada:</b> <Md inline texto={q.desatualizada} />
                  </div>
                )}
                {feito && !!q.observacoes?.length && (
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
              </article>
            </div>
          );
        })}
      </div>
      {!feito && (
        <div className="submitbar">
          <span className="mono">
            {respondidas} de {s.questoes.length} respondidas
          </span>
          <button
            className="btn"
            type="button"
            disabled={respondidas < s.questoes.length}
            onClick={() => {
              entregar(base, id, porId);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Entregar sessão
          </button>
        </div>
      )}
    </>
  );
}
