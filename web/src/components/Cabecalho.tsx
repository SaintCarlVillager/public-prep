"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { useCatalogo } from "~/lib/catalogo";
import { ativos } from "~/lib/estudo";
import { diasAte, fmtData } from "~/lib/nucleo";
import { useProgresso } from "~/lib/progresso";

const ABAS = [
  ["/", "Painel"],
  ["/sessao", "Sessão"],
  ["/revisoes", "Revisões"],
  ["/treino", "Treino"],
  ["/simulados", "Simulados"],
  ["/banco", "Banco"],
  ["/lei", "Lei seca"],
  ["/ajustes", "Ajustes"],
] as const;

/* Estrutura em componentes Astryx; ficam no painel.css só a identidade do DESIGN.md: o logotipo com o "IA"
   grifado (.marca) e as abas com sublinhado grifo (.tabs), que rolam de lado no celular. O TabList do Astryx
   não foi usado porque as abas são links de rota (aria-current), não um tablist com painéis. */
export function Cabecalho() {
  const caminho = usePathname();
  const abas = useRef<HTMLElement>(null);
  // No celular as abas rolam de lado: deixa a aba ativa à vista.
  useEffect(() => {
    abas.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [caminho]);
  const { base } = useCatalogo();
  const progresso = useProgresso();
  const eds = base ? ativos(base, progresso) : [];
  const porBanca: Record<string, string[]> = {};
  for (const e of eds) (porBanca[e.banca ?? "—"] ??= []).push(base!.rotulo(e));
  // Data estimada de edital provisório não vira contagem regressiva.
  const prazos = eds.filter((e) => e.prova && !e.provisorio);

  return (
    <header className="band">
      <VStack className="wrap" gap={4} paddingBlockStart={6}>
        <HStack justify="between" align="end" gap={4} wrap="wrap">
          <VStack gap={1.5} className="min-w-0">
            <Text className="eyebrow">
              {eds.length
                ? Object.entries(porBanca)
                    .map(([b, l]) => `${b} · ${l.join(" e ")}`)
                    .join("  ·  ")
                : "Provas reais etiquetadas"}
            </Text>
            <Heading level={1}>
              <Link className="brand marca" href="/" aria-label="ServentIA, início">
                Servent<span className="ia">IA</span>
              </Link>
            </Heading>
          </VStack>
          {prazos.length > 0 && (
            // Contagem regressiva de cada prova. No celular, lado a lado numa grade compacta (.prazos), com a data
            // embaixo do número, para o cabeçalho não ocupar a primeira tela inteira.
            <ul className="prazos">
              {prazos.map((e) => {
                const d = diasAte(e.prova!);
                return (
                  <li key={e.id}>
                    <Text className="eyebrow">{base!.rotulo(e)}</Text>
                    <Text size="2xl" weight="semibold" hasTabularNumbers className="leading-none prazo-dias">
                      {d === 0 ? "hoje" : `${d} ${d === 1 ? "dia" : "dias"}`}
                    </Text>
                    <Text type="supporting" color="secondary" hasTabularNumbers>
                      {fmtData(e.prova)}
                    </Text>
                  </li>
                );
              })}
            </ul>
          )}
        </HStack>
        <nav className="tabs" aria-label="Seções" ref={abas}>
          {ABAS.map(([href, rotulo]) => {
            const ativo = href === "/" ? caminho === "/" : caminho.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={ativo ? "page" : undefined}>
                {rotulo}
              </Link>
            );
          })}
        </nav>
      </VStack>
    </header>
  );
}
