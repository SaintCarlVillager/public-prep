"use client";

import { useRouter } from "next/navigation";

import { ComCatalogo, SelosEdital } from "~/components/Comum";
import { criarSessao } from "~/lib/acoes";
import type { Base } from "~/lib/catalogo";
import { emSessaoAberta, filaRevisao, ordenar, revisoes, rotuloProva, type ItemRevisao } from "~/lib/estudo";
import { fmtDia, hoje, provaDe } from "~/lib/nucleo";
import { useProgresso } from "~/lib/progresso";

export default function PaginaRevisoes() {
  return <ComCatalogo>{(b) => <Revisoes base={b} />}</ComCatalogo>;
}

function Revisoes({ base }: { base: Base }) {
  const p = useProgresso();
  const router = useRouter();
  const hj = hoje();
  const itens = revisoes(base, p, hj);
  const aberta = emSessaoAberta(p);
  const venc = itens.filter((x) => x.vence && !aberta.has(x.qid));
  const atras = venc.filter((x) => x.p < hj);
  const fila = filaRevisao(base, p, hj);
  const tam = p.config.tamanho_sessao;

  const abrir = (titulo: string, lista: ItemRevisao[]) => {
    const qs = lista.map((x) => base.idx[x.qid]).filter((q) => q !== undefined);
    if (criarSessao(titulo, ordenar(base, p, qs))) router.push("/sessao");
  };
  const porData = (l: ItemRevisao[]) => l.toSorted((a, b) => a.p.localeCompare(b.p)).slice(0, 60);

  const grupos = new Map<string, ItemRevisao[]>();
  for (const it of itens.sort((a, b) => a.p.localeCompare(b.p) || a.qid.localeCompare(b.qid))) {
    const k = it.p < hj ? "atrasada" : it.p;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(it);
  }

  return (
    <section className="card">
      <header>
        <div style={{ display: "grid", gap: 4 }}>
          <h2>Revisões</h2>
          <span className="eyebrow">errou: volta amanhã · acertou: 1, 3, 7, 15, 30, 60 dias</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn ghost" type="button" disabled={!fila.length} onClick={() => abrir(`Revisão (${Math.min(tam, fila.length)}) · ${fmtDia(hj)}`, fila.slice(0, tam))}>
            Revisar {tam}
          </button>
          <button className="btn ghost" type="button" disabled={!atras.length} onClick={() => abrir(`Atrasadas · ${fmtDia(hj)}`, porData(atras))}>
            Revisar as atrasadas{atras.length ? ` (${atras.length})` : ""}
          </button>
          <button className="btn" type="button" disabled={!venc.length} onClick={() => abrir(`Revisões de ${fmtDia(hj)}`, porData(venc))}>
            Revisar as de hoje{venc.length ? ` (${venc.length})` : ""}
          </button>
        </div>
      </header>
      <div className="revs">
        {!itens.length && (
          <p className="empty">Nenhuma revisão marcada. Cada questão respondida numa sessão entra aqui com a data de voltar a ela.</p>
        )}
        {[...grupos.entries()].map(([k, lst]) => (
          <div key={k} className="revday">
            <h3>
              {k === "atrasada" ? (
                <>
                  <span>Atrasadas</span>
                  <span className="pill bad">{lst.length}</span>
                </>
              ) : k === hj ? (
                <>
                  <span>Hoje</span>
                  <span className="pill warn">{lst.length}</span>
                </>
              ) : (
                <>
                  <span className="mono">{fmtDia(k)}</span>
                  <span className="pill mute">{lst.length}</span>
                </>
              )}
            </h3>
            <ul className="rows">
              {lst.map((it) => (
                <li key={it.qid}>
                  <span>
                    {base.nomeTema(it.m.temas[0] ?? "")}
                    <br />
                    <span className="sub mono">
                      {rotuloProva(base, provaDe(it.qid))} · Q{it.m.n}
                      {k === "atrasada" ? ` · desde ${fmtDia(it.p)}` : ""} · volta em {it.i} {it.i === 1 ? "dia" : "dias"}
                    </span>
                  </span>
                  <span className="right">
                    <SelosEdital base={base} qid={it.qid} />
                    <span className={`pill ${it.a === it.t ? "" : "bad"}`}>
                      {it.a}/{it.t}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
