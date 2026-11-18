"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from "react";

import { ComCatalogo, Medidor } from "~/components/Comum";
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
      <div className="stack">
        <div className="notice">
          Este simulado não está no progresso deste navegador. <Link href="/simulados">Voltar aos simulados</Link>
        </div>
      </div>
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
    <div className="stack">
      <section className="card">
        <header>
          <div style={{ display: "grid", gap: 4 }}>
            <h2>Simulados</h2>
            <span className="eyebrow">a prova inteira, com tempo e nota pela regra do edital</span>
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
        {ed ? (
          <p className="empty">
            Nada de correção no meio: o gabarito só aparece na entrega, com a nota de cada bloco e se você estaria habilitado
            no {base.rotulo(ed)}. As respostas entram no placar e nas Revisões, como numa sessão.
          </p>
        ) : (
          <p className="empty">
            Nenhum edital ativo. Marque o concurso que você vai fazer em <Link href="/ajustes">Ajustes</Link>.
          </p>
        )}
      </section>

      {andamento.map(([id, s]) => (
        <section key={id} className="card sim-andamento">
          <header>
            <div style={{ display: "grid", gap: 4 }}>
              <span className="eyebrow">Em andamento{s.tempo.pausado ? " · pausado" : ""}</span>
              <h2>{s.titulo}</h2>
            </div>
          </header>
          <p className="count">
            {Object.keys(s.marcadas).length} de {s.questoes.length} respondidas · tempo {textoTempo(s)}
          </p>
          <div className="actions">
            <Link className="btn" href={`/simulados?id=${encodeURIComponent(id)}`}>
              Retomar simulado
            </Link>
            <button
              className="btn ghost"
              type="button"
              onClick={() => confirm("Descartar este simulado? As respostas marcadas se perdem.") && descartarSimulado(id)}
            >
              Descartar
            </button>
          </div>
        </section>
      ))}

      {ed && <SimuladoDoEdital key={ed.id} base={base} p={p} ed={ed} bloqueado={andamento.length > 0} />}
      {ed && <ProvaAnterior key={"p" + ed.id} base={base} ed={ed} bloqueado={andamento.length > 0} />}

      <section className="card">
        <header>
          <h2>Simulados feitos</h2>
          <span className="eyebrow">{plural(feitos.length, "simulado", "simulados")}</span>
        </header>
        {feitos.length ? (
          <ul className="rows hist">
            {feitos.map(([id, s]) => {
              const r = s.resultado!;
              const e = base.editais.find((x) => x.id === s.edital);
              return (
                <li key={id}>
                  <Link href={`/simulados?id=${encodeURIComponent(id)}`}>
                    <b>{s.titulo}</b>
                  </Link>
                  <span className="right">
                    {r.habilitado === true && <span className="pill">Habilitado</span>}
                    {r.habilitado === false && <span className="pill bad">Eliminado</span>}
                    <span className="mono">nota {fmtNota(r.nota)}</span>
                  </span>
                  <span className="sub">
                    {fmtData(isoDia(new Date(r.entregueEm)))}
                    {e ? ` · ${base.rotulo(e)}` : ""} · {s.tipo === "prova" ? "prova anterior" : s.tamanho} · {r.acertos}/
                    {r.total} acertos · tempo {textoTempo(s)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty">Os simulados entregues aparecem aqui, com data, nota, tempo e se você foi habilitado.</p>
        )}
      </section>
    </div>
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
    if (!m.questoes.length) return alert("O banco ainda não tem questões deste edital.");
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
    <section className="card">
      <header>
        <div style={{ display: "grid", gap: 4 }}>
          <h2>Simulado do edital</h2>
          <span className="eyebrow">montado do banco, na estrutura do {base.rotulo(ed)}</span>
        </div>
        <div className="seg" role="group" aria-label="Tamanho">
          <button type="button" aria-pressed={tamanho === "completo"} onClick={() => setTamanho("completo")}>
            Completo
          </button>
          <button type="button" aria-pressed={tamanho === "reduzido"} onClick={() => setTamanho("reduzido")}>
            Reduzido
          </button>
        </div>
      </header>
      <ul className="rows plano">
        {plano.map((b) => (
          <li key={b.id}>
            <span>{rotuloCompleto(b)}</span>
            <span className={`mono ${b.montadas < b.pedidas ? "falta" : ""}`}>
              {b.montadas < b.pedidas ? `${b.montadas} de ${b.pedidas}` : b.pedidas} questões
            </span>
            {b.materias.some((m) => m.pedidas) && (
              <span className="sub">
                {b.materias
                  .filter((m) => m.pedidas)
                  .map((m) => `${m.rotulo ?? base.nomeMateria(m.materia)} ${m.montadas < m.pedidas ? `${m.montadas} de ${m.pedidas}` : m.pedidas}`)
                  .join(" · ")}
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="sim-info">
        <p>
          <b>{montadas} questões</b>
          {tamanho === "reduzido" ? " (metade de cada bloco)" : ""} ·{" "}
          {minutos ? (
            <>
              <b>{fmtMinutos(minutos)}</b>
              {tamanho === "reduzido" ? ` (proporcional às ${ed.objetiva?.duracao_min ? fmtMinutos(ed.objetiva.duracao_min) : ""} da prova)` : " (duração oficial)"}
            </>
          ) : (
            "sem cronômetro: o edital não traz a duração"
          )}
        </p>
        {minutos && ed.objetiva?.duracao_inclui && (
          <p className="sub">
            {ed.objetiva.duracao_inclui} Aqui você faz só a objetiva{tamanho === "completo" ? ", então sobra tempo." : "."}
          </p>
        )}
        {ed.objetiva?.nota && <p className="sub">Nota: {ed.objetiva.nota}</p>}
      </div>
      {avisos.length > 0 && (
        <div className="notice warn" role="status">
          <b>O banco ainda não tem questões para a prova inteira.</b> O simulado sai com o que houver:
          <ul>
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="actions">
        <button className="btn" type="button" disabled={bloqueado || !montadas} onClick={comecar}>
          Começar simulado {tamanho} ({montadas} questões)
        </button>
        {bloqueado && <span className="count">Entregue ou descarte o simulado em andamento antes de começar outro.</span>}
      </div>
    </section>
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
      <section className="card">
        <header>
          <h2>Prova anterior</h2>
        </header>
        <p className="empty">O banco ainda não tem provas do {ed.orgao ?? base.rotulo(ed)}.</p>
      </section>
    );

  const comecar = () => {
    if (!sel) return;
    const pr = sel.prova;
    const qs = (base.cat.indice[pr.id] ?? []).filter((q) => q.tipo === "me").map((q) => ({ id: q.id, n: q.n }));
    if (!qs.length) return alert("Esta prova ainda não tem questões no banco.");
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

  return (
    <section className="card">
      <header>
        <div style={{ display: "grid", gap: 4 }}>
          <h2>Prova anterior</h2>
          <span className="eyebrow">inteira, na ordem original, sem as discursivas</span>
        </div>
      </header>
      <fieldset className="editais">
        <legend className="eyebrow">Provas do {ed.orgao ?? base.rotulo(ed)} no banco</legend>
        {lista.map(({ prova: pr, mesmoCargo }) => {
          const me = (base.cat.indice[pr.id] ?? []).filter((q) => q.tipo === "me").length;
          return (
            <label key={pr.id} className="edital-opcao">
              <input type="radio" name="prova-anterior" checked={sel?.prova.id === pr.id} onChange={() => setPid(pr.id)} />
              <span>
                <b>
                  {pr.orgao} {pr.ano} · {pr.cargo} {!mesmoCargo && <span className="pill mute">outro cargo</span>}
                </b>
                <span className="sub">
                  {[
                    pr.banca,
                    `${me} questões`,
                    pr.anuladas.length ? plural(pr.anuladas.length, "anulada", "anuladas") : null,
                    pr.blocos?.length ? pr.blocos.map((b) => b.nome).join(", ") : "sem divisão em blocos",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="settings">
        <label className="field eyebrow">
          Tempo
          <select value={tempo} onChange={(e) => setOpcao(e.target.value as OpcaoTempo)}>
            {durEdital && (
              <option value="edital">
                {fmtMinutos(durEdital)}, do edital {sel?.editalDoCargo ? base.rotulo(sel.editalDoCargo) : ""}
              </option>
            )}
            <option value="livre">Sem cronômetro</option>
            <option value="outro">Escolher o tempo</option>
          </select>
        </label>
        {tempo === "outro" && (
          <label className="field eyebrow">
            Minutos
            <input
              type="number"
              min={5}
              max={600}
              value={minutos}
              style={{ width: 110 }}
              onChange={(e) => setMinutos(Math.max(5, Math.min(600, Number(e.target.value) || 120)))}
            />
          </label>
        )}
      </div>
      {tempo === "edital" && sel?.editalDoCargo?.objetiva?.duracao_inclui && (
        <p className="count">{sel.editalDoCargo.objetiva.duracao_inclui}</p>
      )}
      {!durEdital && (
        <p className="count">Não há edital deste cargo no banco para dar o tempo: escolha um ou faça sem cronômetro.</p>
      )}
      <p className="count">Anuladas aparecem e contam como acerto para todos, como a banca faz.</p>
      <div className="actions">
        <button className="btn" type="button" disabled={bloqueado || !sel} onClick={comecar}>
          Começar prova {sel ? `${sel.prova.orgao} ${sel.prova.ano}` : ""}
        </button>
      </div>
    </section>
  );
}

/* ---------- durante o simulado ---------- */

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
  const entregue = useRef(false);
  const rodando = !s.tempo.pausado && !!provas;
  const gravar = () => {
    if (inicio.current == null) return;
    const ag = Date.now();
    somarTempo(id, ag - inicio.current);
    inicio.current = document.visibilityState === "visible" ? ag : null;
  };
  useEffect(() => {
    if (!rodando) return;
    const comecar = () => {
      if (document.visibilityState === "visible" && inicio.current == null) inicio.current = Date.now();
      setAgora(Date.now());
    };
    comecar();
    const tique = setInterval(() => setAgora(Date.now()), 1000);
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

  const usado = s.tempo.usado_ms + (inicio.current != null ? Math.max(0, agora - inicio.current) : 0);
  const limite = s.tempo.limite_min ? s.tempo.limite_min * 60000 : null;
  const esgotou = limite != null && usado >= limite;

  const entregarAgora = (esgotado: boolean) => {
    if (entregue.current) return;
    entregue.current = true;
    gravar();
    inicio.current = null;
    entregarSimulado(base, id, porId, { edital, esgotado });
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    if (esgotou && provas) entregarAgora(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esgotou, provas]);

  if (erro) return <div className="notice bad">Não consegui carregar as questões do simulado. Recarregue a página.</div>;
  if (!provas) return <p className="empty">Carregando as questões…</p>;

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

  const ir = (i: number) => {
    irParaQuestao(id, i);
    const alvo = document.getElementById("sim-questao");
    if (alvo && alvo.getBoundingClientRect().top < 0) alvo.scrollIntoView({ block: "start" });
  };
  const pedirEntrega = () => {
    const msg = brancas
      ? `Entregar o simulado com ${plural(brancas, "questão em branco", "questões em branco")}? Em branco conta como erro.`
      : "Entregar o simulado? Todas as questões estão respondidas.";
    if (confirm(msg)) entregarAgora(false);
  };

  return (
    <div className="stack">
      <div className="session-head">
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span className="eyebrow">
            Simulado · {s.tipo === "prova" ? "prova anterior" : s.tamanho} · {s.questoes.length} questões
          </span>
          <h2>{s.titulo}</h2>
        </div>
        <div className="actions">
          <Link className="btn ghost" href="/simulados">
            Sair (fica salvo)
          </Link>
        </div>
      </div>
      {avisos.length > 0 && (
        <div className="notice warn">
          {avisos.map((a) => (
            <div key={a}>{a}</div>
          ))}
        </div>
      )}

      <div className="sim-bar">
        <div className={`relogio${pouco ? " pouco" : ""}`} role="timer" aria-live="off">
          <span className="eyebrow">{restante != null ? "Restam" : "Tempo"}</span>
          <b>{fmtRelogio(restante != null ? restante : usado)}</b>
          <small>
            {respondidas}/{s.questoes.length} respondidas
          </small>
        </div>
        <div className="actions">
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              if (s.tempo.pausado) pausarSimulado(id, false);
              else {
                gravar();
                inicio.current = null;
                pausarSimulado(id, true);
              }
            }}
          >
            {s.tempo.pausado ? "Retomar" : "Pausar"}
          </button>
          <button className="btn" type="button" onClick={pedirEntrega}>
            Entregar
          </button>
        </div>
      </div>
      {pouco && <div className="notice warn">Menos de {fmtMinutos(Math.max(1, Math.ceil(restante! / 60000)))}: ao acabar o tempo, o simulado é entregue sozinho.</div>}

      {s.tempo.pausado ? (
        <section className="card">
          <div className="result">
            <span className="stamp">{fmtRelogio(restante != null ? restante : usado)}</span>
            <div>
              <b>Simulado pausado</b>
              <p>
                O cronômetro está parado e as questões ficam escondidas até você retomar. A pausa fica registrada no resultado.
              </p>
            </div>
          </div>
          <div className="actions">
            <button className="btn" type="button" onClick={() => pausarSimulado(id, false)}>
              Retomar simulado
            </button>
          </div>
        </section>
      ) : (
        <div className="sim-corpo">
          <div className="sim-questao" id="sim-questao">
            {blocoAtual && (
              <span className="eyebrow">
                Questão {pos + 1} de {s.questoes.length}
                {blocoAtual.id ? ` · ${rotuloCompleto(blocoAtual)}` : ""}
              </span>
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
                extraMeta={s.revisar.includes(qid) ? <span className="pill warn">revisar depois</span> : null}
              />
            ) : (
              <div className="notice warn">A questão {qid} não está no catálogo publicado; ela não conta na nota.</div>
            )}
            <button
              className="btn ghost revisar"
              type="button"
              aria-pressed={s.revisar.includes(qid)}
              onClick={() => alternarRevisar(id, qid)}
            >
              {s.revisar.includes(qid) ? "Marcada para revisar · desmarcar" : "Marcar para revisar depois"}
            </button>
            <div className="sim-nav">
              <button className="btn ghost" type="button" disabled={pos === 0} onClick={() => ir(pos - 1)}>
                ← Anterior
              </button>
              {pos < s.questoes.length - 1 ? (
                <button className="btn" type="button" onClick={() => ir(pos + 1)}>
                  Próxima →
                </button>
              ) : (
                <button className="btn" type="button" onClick={pedirEntrega}>
                  Entregar
                </button>
              )}
            </div>
            <p className="count">Toque de novo na alternativa marcada para deixar a questão em branco.</p>
          </div>
          <Grade s={s} pos={pos} indice={indice} ir={ir} />
        </div>
      )}
      {!s.tempo.pausado && s.tempo.inclui && (
        <p className="count">
          Tempo {s.tempo.limite_min ? fmtMinutos(s.tempo.limite_min) : ""}: {s.tempo.inclui}
        </p>
      )}
    </div>
  );
}

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
    <div className="stack">
      <div className="session-head">
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span className="eyebrow">
            Simulado entregue · {new Date(r.entregueEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            {edital ? ` · ${base.rotulo(edital)}` : ""}
          </span>
          <h2>{s.titulo}</h2>
        </div>
        <div className="actions">
          <Link className="btn ghost" href="/simulados">
            Voltar aos simulados
          </Link>
        </div>
      </div>

      {r.esgotado && (
        <div className="notice warn" role="alert">
          <b>Tempo esgotado.</b> O simulado foi entregue sozinho quando o cronômetro chegou a zero.
        </div>
      )}

      <section className="card">
        <div className="result">
          <span className={`stamp ${baixo ? "low" : ""}`}>{fmtNota(r.nota)}</span>
          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
            <b className="veredito-sim">
              {r.habilitado === true ? "Habilitado" : r.habilitado === false ? (r.motivo ?? "Eliminado") : "Prova entregue"}
            </b>
            <span className="count">
              nota de 0 a 10 · {r.acertos} de {r.total} acertos
              {r.branco ? ` · ${r.branco} em branco` : ""}
            </span>
            <span className="count">Tempo usado: {textoTempo(s)}</span>
          </div>
        </div>
        {r.regra && (
          <p className="sim-regra">
            <span className="eyebrow">Regra do edital</span> {r.regra}
          </p>
        )}
        {prova && (
          <p className="count">
            {r.anuladas
              ? `${plural(r.anuladas, "questão anulada conta", "questões anuladas contam")} como acerto para todos, como a banca faz.`
              : "Esta prova não teve questões anuladas."}{" "}
            Prova anterior: a nota mostra o seu aproveitamento, sem a regra de habilitação do edital atual.
          </p>
        )}
        {avisos.length > 0 && (
          <div className="notice warn">
            {avisos.map((a) => (
              <div key={a}>{a}</div>
            ))}
          </div>
        )}
        <p className="count">As respostas entraram no placar e nas Revisões: as erradas e as em branco voltam amanhã.</p>
      </section>

      <section className="card">
        <header>
          <h2>Por bloco</h2>
          <span className="eyebrow">{r.blocos.some((b) => b.minimo != null) ? "traço dourado = mínimo do bloco" : "acertos por bloco"}</span>
        </header>
        <div style={{ display: "grid", gap: 18 }}>
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
            <p className="count">
              Nota final {fmtNota(r.nota)} · mínimo {fmtNota(r.corte)}
              {edital?.objetiva?.media_ponderada ? " (média ponderada dos blocos)" : " (no conjunto)"}
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <header>
          <h2>Questão por questão</h2>
          <div className="seg" role="group" aria-label="Filtro">
            <button type="button" aria-pressed={filtro === "todas"} onClick={() => setFiltro("todas")}>
              Todas ({s.questoes.length})
            </button>
            <button type="button" aria-pressed={filtro === "erros"} onClick={() => setFiltro("erros")}>
              Só erradas e em branco ({nErros})
            </button>
          </div>
        </header>
        {erro && <div className="notice bad">Não consegui carregar as questões. Recarregue a página.</div>}
        {!provas && !erro && <p className="empty">Carregando as questões…</p>}
        {provas && filtro === "erros" && !nErros && <p className="empty">Nenhuma errada nem em branco. Parabéns!</p>}
      </section>
      {provas && (
        <div className="qlist">
          {s.blocos.map((b) => {
            const qs = b.questoes.filter((qid) => filtro === "todas" || errou(qid));
            if (!qs.length) return null;
            let ultimoTexto = "";
            return (
              <Fragment key={b.id || "prova"}>
                {s.blocos.length > 1 && <h3 className="sim-bloco">{b.id && b.id !== "outras" ? rotuloCompleto(b) : b.nome}</h3>}
                {qs.map((qid) => {
                  const q = porId[qid];
                  const i = s.questoes.indexOf(qid);
                  if (!q) return null;
                  const kt = q.texto ? slugDe(qid) + "|" + q.texto : "";
                  const t = kt && kt !== ultimoTexto ? provas[slugDe(qid)]?.textos[q.texto!] : undefined;
                  ultimoTexto = kt;
                  return (
                    <div key={qid} style={{ display: "grid", gap: 16 }}>
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
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      )}
      <div className="actions">
        <Link className="btn ghost" href="/simulados">
          Voltar aos simulados
        </Link>
      </div>
    </div>
  );
}
