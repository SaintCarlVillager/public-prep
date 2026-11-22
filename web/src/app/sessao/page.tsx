"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

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
            onClick={async () => {
              if (await confirmar({ titulo: "Apagar esta sessão não entregue?", ok: "Apagar sessão", perigo: true })) apagarSessao(id);
            }}
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
          <span key={e.id} className={`pill ${ehFederal(e) ? "fed" : "tj"}`}>
            {n} no {base.rotulo(e)}
          </span>
        ) : null;
      })}
    </div>
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
          return (
            <div key={qid} style={{ display: "grid", gap: 16 }}>
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
              const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              window.scrollTo({ top: 0, behavior: reduz ? "instant" : "smooth" });
            }}
          >
            Entregar sessão
          </button>
        </div>
      )}
    </>
  );
}
