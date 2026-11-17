"use client";

import Link from "next/link";
import { useState } from "react";

import { ComCatalogo, Medidor } from "~/components/Comum";
import type { Base } from "~/lib/catalogo";
import { ativos, disponiveis, placar, temasFracos } from "~/lib/estudo";
import { fmtDia, hoje, isoDia, pct } from "~/lib/nucleo";
import { useProgresso, type Progresso } from "~/lib/progresso";

export default function PaginaPainel() {
  return <ComCatalogo>{(b) => <Painel base={b} />}</ComCatalogo>;
}

function Painel({ base }: { base: Base }) {
  const p = useProgresso();
  const hj = hoje();
  const P = placar(base, p, hj);
  const eds = ativos(base, p);
  const disp = disponiveis(base, p);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const ed = eds.find((e) => e.id === escolhido) ?? eds[0];
  const cor = (v: { a: number; t: number }) => (v.t ? (v.a / v.t >= 0.5 ? "var(--good)" : "var(--bad)") : undefined);

  return (
    <div className="stack">
      <div className="kpis">
        <div className="kpi">
          <span className="eyebrow">Acertos</span>
          <b>
            {P.geral.a}/{P.geral.t}
          </b>
          <small>{P.geral.t ? `${pct(P.geral.a, P.geral.t)}% de aproveitamento` : "nenhuma questão respondida"}</small>
        </div>
        {eds.map((e) => {
          const v = P.ed[e.id]!;
          return (
            <div key={e.id} className="kpi">
              <span className="eyebrow">Rumo ao {base.rotulo(e)}</span>
              <b style={{ color: cor(v) }}>{v.t ? `${pct(v.a, v.t)}%` : "—"}</b>
              <small>
                {v.a}/{v.t} nas questões que caem no {base.rotulo(e)}
              </small>
            </div>
          );
        })}
        <div className="kpi">
          <span className="eyebrow">Questões vistas</span>
          <b>
            {P.vistas}/{disp.total}
          </b>
          <small>{disp.rels} caem nos editais ativos</small>
        </div>
        <div className="kpi">
          <span className="eyebrow">Revisões hoje</span>
          <b style={{ color: P.vencidas ? "var(--warn)" : undefined }}>{P.vencidas}</b>
          <small>{P.vencidas ? "vencidas até hoje" : "nada vencido"}</small>
        </div>
      </div>

      <div className="actions">
        <Link className="btn" href="/sessao?nova=1">
          Nova sessão automática
        </Link>
        <Link className="btn ghost" href="/treino">
          Treino de verdadeiro ou falso
        </Link>
      </div>

      <section className="card">
        <header>
          <div style={{ display: "grid", gap: 4 }}>
            <h2>Por bloco do edital</h2>
            <span className="eyebrow">traço dourado = mínimo do bloco</span>
          </div>
          {eds.length > 1 && (
            <div className="seg" role="group" aria-label="Edital">
              {eds.map((e) => (
                <button key={e.id} type="button" aria-pressed={ed?.id === e.id} onClick={() => setEscolhido(e.id)}>
                  {base.rotulo(e)}
                </button>
              ))}
            </div>
          )}
        </header>
        <div style={{ display: "grid", gap: 18 }}>
          {!ed ? (
            <p className="empty">
              Nenhum edital ativo. Marque um edital em <Link href="/ajustes">Ajustes</Link>.
            </p>
          ) : (
            (ed.blocos ?? []).map((b) => {
              const v = P.ed[ed.id]!.blocos[b.id] ?? { a: 0, t: 0 };
              const partes = [`${b.questoes} questões`];
              if (b.peso) partes.push(`peso ${b.peso}`);
              if (b.minimo != null)
                partes.push(
                  `${b.eliminatorio ? "eliminatório: " : ""}mínimo ${Math.ceil(b.minimo * b.questoes - 1e-9)}/${b.questoes}`,
                );
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
            })
          )}
        </div>
      </section>

      <div className="cols">
        <section className="card">
          <header>
            <h2>Por matéria</h2>
            {ed && <span className="eyebrow">edital {base.rotulo(ed)}</span>}
          </header>
          <div style={{ display: "grid", gap: 14 }}>
            {ed && Object.keys(P.ed[ed.id]!.materias).length ? (
              Object.entries(P.ed[ed.id]!.materias)
                .sort((x, y) => x[1].a / x[1].t - y[1].a / y[1].t)
                .map(([m, v]) => <Medidor key={m} rotulo={base.nomeMateria(m)} v={v} corte={0.5} />)
            ) : (
              <p className="empty">Nenhuma questão deste edital respondida ainda. Faça uma sessão para ver o placar por matéria.</p>
            )}
          </div>
        </section>
        <section className="card">
          <header>
            <h2>Temas mais fracos</h2>
            <span className="eyebrow">3+ tentativas</span>
          </header>
          <ul className="weak">
            {temasFracos(P).map((f) => (
              <li key={f.id}>
                <span>{base.nomeTema(f.id)}</span>
                <span className="ratio">
                  errou {f.t - f.a} de {f.t}
                </span>
                <small>{base.nomeMateria(f.id.split(".")[0]!)}</small>
              </li>
            ))}
            {!temasFracos(P).length && <li className="empty">Aparece aqui quando um tema tiver 3 tentativas ou mais com algum erro.</li>}
          </ul>
        </section>
      </div>

      <section className="card">
        <header>
          <h2>Evolução por sessão</h2>
          <span className="eyebrow">tracejado = 50%</span>
        </header>
        <Grafico p={p} />
      </section>
    </div>
  );
}

function Grafico({ p }: { p: Progresso }) {
  const hist = Object.entries(p.respostas)
    .filter(([, r]) => r.total)
    .map(([id, r]) => ({ id, data: isoDia(new Date(r.entregueEm)), pct: pct(r.acertos, r.total), rotulo: p.sessoes[id]?.titulo ?? id }))
    .sort((a, b) => (a.data + a.id).localeCompare(b.data + b.id));
  if (!hist.length) return <p className="empty">Nenhuma sessão entregue ainda. Cada sessão entregue vira uma barra aqui.</p>;
  const W = Math.max(640, hist.length * 40 + 50);
  const H = 210;
  const padL = 34;
  const padB = 30;
  const padT = 16;
  const step = (W - padL - 10) / hist.length;
  const bw = Math.min(28, step - 8);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / 100);
  return (
    <div className="chart">
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
    </div>
  );
}
