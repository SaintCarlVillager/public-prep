"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ComCatalogo, SelosEdital } from "~/components/Comum";
import { criarSessao } from "~/lib/acoes";
import type { Base } from "~/lib/catalogo";
import { ativos, estadoDe, ordenar, rotuloProva, sigla } from "~/lib/estudo";
import { embaralhar, hoje, materiaDe } from "~/lib/nucleo";
import { useProgresso, type Progresso } from "~/lib/progresso";
import type { IndiceQuestao } from "~/lib/tipos";

const FILTROS0 = { edital: "", banca: "", prova: "", materia: "", tema: "", status: "", anuladas: false };
type Filtros = typeof FILTROS0;
const CHAVE = "public-prep:filtros";

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
  const muda = (parcial: Partial<Filtros>) => {
    const novo = { ...F, ...parcial };
    setF(novo);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(novo));
    } catch {}
  };

  const eds = ativos(base, p);
  const ed = base.editais.find((e) => e.id === F.edital);
  const termo = semAcento(F.tema.trim());
  const lista = Object.values(base.idx).filter((q) => {
    if (!F.anuladas && q.anulada) return false;
    if (ed && !base.rel(q.id, ed)) return false;
    if (F.banca && base.provas[q.prova]?.banca !== F.banca) return false;
    if (F.prova && q.prova !== F.prova) return false;
    if (F.materia && materiaDe(q) !== F.materia) return false;
    if (termo && !q.temas.some((t) => semAcento(base.nomeTema(t)).includes(termo) || t.includes(termo))) return false;
    if (F.status && situacao(p, q.id) !== F.status) return false;
    return true;
  });
  const praticaveis = lista.filter((q) => q.tipo === "me" && !q.anulada);
  const bancas = [...new Set(base.cat.provas.map((x) => x.banca))].sort();
  const materias = [...new Set(Object.values(base.idx).map(materiaDe))]
    .filter(Boolean)
    .sort((a, b) => base.nomeMateria(a).localeCompare(base.nomeMateria(b), "pt"));
  const MAX = 200;

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
    <section className="card">
      <header>
        <h2>Banco de questões</h2>
        <span className="count">
          {lista.length} {lista.length === 1 ? "questão" : "questões"}
        </span>
      </header>
      <div className="filters">
        <label className="field eyebrow">
          Edital
          <select value={F.edital} onChange={(e) => muda({ edital: e.target.value })}>
            <option value="">Todos (sem filtro)</option>
            {eds.map((e) => (
              <option key={e.id} value={e.id}>
                Só os que caem no {sigla(e)}
              </option>
            ))}
          </select>
        </label>
        <label className="field eyebrow">
          Banca
          <select value={F.banca} onChange={(e) => muda({ banca: e.target.value })}>
            <option value="">Todas</option>
            {bancas.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="field eyebrow">
          Prova
          <select value={F.prova} onChange={(e) => muda({ prova: e.target.value })}>
            <option value="">Todas</option>
            {base.cat.provas.map((x) => (
              <option key={x.id} value={x.id}>
                {x.banca} · {x.orgao} {x.ano}
              </option>
            ))}
          </select>
        </label>
        <label className="field eyebrow">
          Matéria
          <select value={F.materia} onChange={(e) => muda({ materia: e.target.value })}>
            <option value="">Todas</option>
            {materias.map((m) => (
              <option key={m} value={m}>
                {base.nomeMateria(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="field eyebrow">
          Tema
          <input type="search" placeholder="ex.: citação" value={F.tema} onChange={(e) => muda({ tema: e.target.value })} />
        </label>
        <label className="field eyebrow">
          Situação
          <select value={F.status} onChange={(e) => muda({ status: e.target.value })}>
            <option value="">Todas</option>
            <option value="nunca">Nunca vistas</option>
            <option value="erradas">Erradas</option>
            <option value="acertadas">Acertadas</option>
          </select>
        </label>
      </div>
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <label className="check">
          <input type="checkbox" checked={F.anuladas} onChange={(e) => muda({ anuladas: e.target.checked })} /> incluir anuladas
        </label>
        <button className="btn" type="button" disabled={!praticaveis.length} onClick={praticar}>
          Praticar estas (até {Math.min(20, praticaveis.length) || 20})
        </button>
      </div>
      <ul className="rows">
        {lista.slice(0, MAX).map((q) => {
          const e = estadoDe(p, q.id);
          const sit = situacao(p, q.id);
          return (
            <li key={q.id}>
              <span>
                <b className="mono">Q{q.n}</b>{" "}
                <span className="sub">
                  · {rotuloProva(base, q.prova)}
                  {q.tipo === "disc" ? " · discursiva" : ""}
                </span>
                <br />
                <span className="sub">{q.temas.map(base.nomeTema).join(" · ")}</span>
              </span>
              <span className="right">
                {q.anulada && <span className="pill mute">anulada</span>}
                {q.desat && <span className="pill warn">desatualizada</span>}
                <SelosEdital base={base} qid={q.id} />
                {sit === "nunca" ? (
                  <span className="pill mute">nunca vista</span>
                ) : (
                  <span className={`pill ${sit === "erradas" ? "bad" : ""}`}>
                    {e!.a}/{e!.t}
                  </span>
                )}
              </span>
            </li>
          );
        })}
        {lista.length > MAX && (
          <li className="empty">
            Mostrando {MAX} de {lista.length}. Refine os filtros para ver o resto.
          </li>
        )}
        {!lista.length && <li className="empty">Nenhuma questão com esses filtros.</li>}
      </ul>
    </section>
  );
}
