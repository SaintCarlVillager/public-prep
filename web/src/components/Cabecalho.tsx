"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCatalogo } from "~/lib/catalogo";
import { ativos } from "~/lib/estudo";
import { diasAte, fmtData } from "~/lib/nucleo";
import { useProgresso } from "~/lib/progresso";

const ABAS = [
  ["/", "Painel"],
  ["/sessao", "Sessão"],
  ["/revisoes", "Revisões"],
  ["/treino", "Treino"],
  ["/banco", "Banco"],
  ["/lei", "Lei seca"],
  ["/ajustes", "Ajustes"],
] as const;

export function Cabecalho() {
  const caminho = usePathname();
  const { base } = useCatalogo();
  const progresso = useProgresso();
  const eds = base ? ativos(base, progresso) : [];
  const porBanca: Record<string, string[]> = {};
  for (const e of eds) (porBanca[e.banca ?? "—"] ??= []).push(base!.rotulo(e));

  return (
    <div className="band">
      <div className="wrap">
        <div className="head">
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <div className="eyebrow">
              {eds.length
                ? Object.entries(porBanca)
                    .map(([b, l]) => `${b} · ${l.join(" e ")}`)
                    .join("  ·  ")
                : "Provas reais etiquetadas"}
            </div>
            <h1>
              <Link className="brand marca" href="/" aria-label="ServentIA, início">
                Servent<span className="ia">IA</span>
              </Link>
            </h1>
          </div>
          <div className="clocks">
            {eds
              .filter((e) => e.prova)
              .map((e) => {
                const d = diasAte(e.prova!);
                return (
                  <div key={e.id} className="clock">
                    <span className="eyebrow">
                      {base!.rotulo(e)} · {fmtData(e.prova)}
                    </span>
                    <b>{d === 0 ? "hoje" : `${d} ${d === 1 ? "dia" : "dias"}`}</b>
                  </div>
                );
              })}
          </div>
        </div>
        <nav className="tabs" aria-label="Seções">
          {ABAS.map(([href, rotulo]) => {
            const ativo = href === "/" ? caminho === "/" : caminho.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={ativo ? "page" : undefined}>
                {rotulo}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
