"use client";

import { useRef, useState } from "react";

import { ComCatalogo } from "~/components/Comum";
import type { Base } from "~/lib/catalogo";
import { ativos, orgaoDe, vigentes } from "~/lib/estudo";
import { fmtData, hoje } from "~/lib/nucleo";
import { atualizar, normalizar, substituir, useProgresso, vazio } from "~/lib/progresso";
import { confirmar } from "~/components/Dialogo";

export default function PaginaAjustes() {
  return <ComCatalogo>{(b) => <Ajustes base={b} />}</ComCatalogo>;
}

function Ajustes({ base }: { base: Base }) {
  const p = useProgresso();
  const arquivo = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const ids = new Set(ativos(base, p).map((e) => e.id));
  const vig = vigentes(base);

  const alternar = (id: string, ligado: boolean) =>
    atualizar((x) => {
      const atual = new Set(x.config.editais_ativos ?? vig.map((e) => e.id));
      if (ligado) atual.add(id);
      else atual.delete(id);
      x.config.editais_ativos = [...atual];
    });

  const exportar = () => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `serventia-progresso-${hoje()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importar = async (f: File) => {
    try {
      const novo = normalizar(JSON.parse(await f.text()));
      const n = Object.keys(novo.sessoes).length;
      const ns = Object.keys(novo.simulados).length;
      const resumo = `${n} sessões, ${ns} ${ns === 1 ? "simulado" : "simulados"}`;
      const ok = await confirmar({
        titulo: "Substituir o progresso deste navegador?",
        texto: `O arquivo traz ${resumo}. O progresso atual deste navegador será trocado pelo dele.`,
        ok: "Substituir progresso",
        perigo: true,
      });
      if (!ok) return;
      substituir(novo);
      setMsg(`Progresso importado: ${resumo}.`);
    } catch {
      setMsg("Não consegui ler esse arquivo. Use um JSON exportado por este app.");
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <header>
          <h2>Ajustes</h2>
          <span className="eyebrow">valem para o placar e as sessões automáticas</span>
        </header>
        <fieldset className="editais">
          <legend className="eyebrow">Editais ativos</legend>
          {vig.map((e) => (
            <label key={e.id} className="edital-opcao">
              <input type="checkbox" checked={ids.has(e.id)} onChange={(ev) => alternar(e.id, ev.target.checked)} />
              <span>
                <b>
                  {orgaoDe(e)} · {e.cargo ?? e.id}
                </b>
                <span className="sub">
                  {[e.banca, e.prova && `prova em ${fmtData(e.prova)}`].filter(Boolean).join(" · ")}
                  {` · aparece como “${base.rotulo(e)}”`}
                </span>
              </span>
            </label>
          ))}
          {!vig.length && <span className="empty">Nenhum edital com prova futura.</span>}
        </fieldset>
        <div className="settings">
          <label className="field eyebrow">
            Questões por sessão
            <input
              type="number"
              min={5}
              max={60}
              value={p.config.tamanho_sessao}
              style={{ width: 110 }}
              onChange={(e) =>
                atualizar((x) => {
                  x.config.tamanho_sessao = Math.max(5, Math.min(60, Number(e.target.value) || 20));
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="card">
        <header>
          <h2>Seu progresso</h2>
          <span className="eyebrow">guardado só neste navegador</span>
        </header>
        <p className="empty">
          Sessões, respostas, revisões, treino e simulados ficam no armazenamento local deste navegador. Exporte uma cópia de vez em
          quando, e importe-a para continuar em outro aparelho.
        </p>
        <div className="actions">
          <button className="btn" type="button" onClick={exportar}>
            Exportar progresso
          </button>
          <button className="btn ghost" type="button" onClick={() => arquivo.current?.click()}>
            Importar progresso
          </button>
          <input
            ref={arquivo}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importar(f);
              e.target.value = "";
            }}
          />
          <button
            className="btn ghost"
            type="button"
            onClick={async () => {
              if (
                await confirmar({
                  titulo: "Apagar todo o progresso deste navegador?",
                  texto: "Isso não tem volta. Se quiser guardar uma cópia, exporte antes.",
                  ok: "Apagar progresso",
                  perigo: true,
                })
              ) {
                substituir(vazio());
                setMsg("Progresso apagado.");
              }
            }}
          >
            Apagar progresso
          </button>
        </div>
        {msg && (
          <div className="notice" role="status">
            {msg}
          </div>
        )}
      </section>
    </div>
  );
}
