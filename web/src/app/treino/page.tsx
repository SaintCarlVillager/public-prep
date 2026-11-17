"use client";

import { useEffect, useRef, useState } from "react";

import { ComCatalogo, IconeCerto, IconeErrado, Md, SelosEdital } from "~/components/Comum";
import { Dispositivos } from "~/components/LeiSeca";
import { julgarCard } from "~/lib/acoes";
import { carregarProva, type Base, type ProvaCarregada } from "~/lib/catalogo";
import { estadoTreino, ordemNovos, placarTreino, todosCards } from "~/lib/estudo";
import { hoje, materiaDe, montarTreino, slugDe, type Card } from "~/lib/nucleo";
import { useProgresso } from "~/lib/progresso";

const TREINO_N = 10;

export default function PaginaTreino() {
  return <ComCatalogo>{(b) => <Treino base={b} />}</ComCatalogo>;
}

interface Rodada {
  cards: Card[];
  provas: Record<string, ProvaCarregada>;
  pos: number;
  acertos: number;
  resposta: boolean | null;
}

function Treino({ base }: { base: Base }) {
  const p = useProgresso();
  const P = placarTreino(base, p, hoje());
  const [r, setR] = useState<Rodada | null>(null);
  const [aviso, setAviso] = useState("");
  const emAndamento = !!r && r.pos < r.cards.length;

  async function comecar() {
    const cards = montarTreino(ordemNovos(base, p, todosCards(base)), estadoTreino(p), hoje(), TREINO_N);
    if (!cards.length) return setAviso("Nada para revisar hoje e nenhum card novo. Volte amanhã.");
    setAviso("Carregando os cards…");
    try {
      const slugs = [...new Set(cards.map((c) => slugDe(c.qid)))];
      const provas = Object.fromEntries(await Promise.all(slugs.map(async (s) => [s, await carregarProva(s)] as const)));
      setAviso("");
      setR({ cards, provas, pos: 0, acertos: 0, resposta: null });
    } catch {
      setAviso("Não consegui carregar as questões do treino. Recarregue a página.");
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <header>
          <div style={{ display: "grid", gap: 4 }}>
            <h2>Treino</h2>
            <span className="eyebrow">cada alternativa vira um card de verdadeiro ou falso</span>
          </div>
          <button className="btn" type="button" disabled={!P.total || emAndamento} onClick={comecar}>
            Começar {TREINO_N} cards
          </button>
        </header>
        <div className="placar-treino">
          {P.total ? (
            <>
              <span>
                <b>{P.total}</b> cards de {P.questoes} questões
              </span>
              <span>
                <b>{P.vistos}</b> vistos
              </span>
              <span>
                <b>{P.vencidos}</b> para revisar hoje
              </span>
              <span>{P.t ? <><b>{Math.round((P.a / P.t) * 100)}%</b> de acerto</> : "nenhum respondido"}</span>
            </>
          ) : (
            <span>Nenhuma questão marcada para o treino ainda.</span>
          )}
        </div>
      </section>
      {aviso && <p className="empty">{aviso}</p>}
      {!r && !aviso && P.total > 0 && (
        <section className="card">
          <p className="empty">
            Cada card mostra o enunciado de uma questão real e uma das alternativas. Diga se a afirmação é verdadeira ou falsa:
            toque nos botões ou arraste o card (esquerda = falso, direita = verdadeiro). Errou, o card volta amanhã; acertou,
            volta em 1, 3, 7, 15, 30 e 60 dias.
          </p>
        </section>
      )}
      {r && <CardTreino base={base} r={r} setR={setR} />}
    </div>
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
      <section className="card">
        <div className="result">
          <span className={`stamp ${r.acertos / n < 0.5 ? "low" : ""}`}>
            {r.acertos}/{n}
          </span>
          <div>
            <b>Rodada concluída</b>
            <p>Os cards errados voltam amanhã. Comece outra rodada quando quiser.</p>
          </div>
        </div>
      </section>
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
    <div className="tf">
      <div className="q" style={{ gap: 12 }}>
        <div className="meta">
          <span className="num">
            {r.pos + 1} de {r.cards.length}
          </span>
          <span className="eyebrow">
            {base.nomeMateria(materiaDe(q))}
            {tema ? ` · ${tema}` : ""}
          </span>
          <SelosEdital base={base} qid={c.qid} />
        </div>
        <Md className="ctx" texto={q.enunciado} />
      </div>
      {r.resposta == null ? (
        <>
          <Arrastavel aoSoltar={julgar}>
            <span className="eyebrow">Alternativa {c.L} · verdadeira ou falsa?</span>
            <Md inline className="txt" texto={q.alt?.[c.L]} />
          </Arrastavel>
          <div className="botoes">
            <button className="btn ghost" type="button" onClick={() => julgar(false)}>
              ← Falso
            </button>
            <button className="btn ghost" type="button" onClick={() => julgar(true)}>
              Verdadeiro →
            </button>
          </div>
          <p className="dica">Ou arraste o card: esquerda é falso, direita é verdadeiro.</p>
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
            <div className="exp">
              <span className="eyebrow" style={{ display: "block", marginBottom: 6 }}>
                Comentário da alternativa
              </span>
              <Md texto={q.exp_alt[c.L]} />
            </div>
          ) : q.exp ? (
            <div className="exp">
              <span className="eyebrow" style={{ display: "block", marginBottom: 6 }}>
                Comentário da questão · gabarito {q.gab}
              </span>
              <Md texto={q.exp} />
            </div>
          ) : null}
          <Dispositivos base={base} lista={q.dispositivos} />
          <button ref={proximo} className="btn" type="button" onClick={() => setR({ ...r, pos: r.pos + 1, resposta: null })}>
            {r.pos + 1 < r.cards.length ? "Próximo card" : "Ver resultado"}
          </button>
        </>
      )}
    </div>
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
