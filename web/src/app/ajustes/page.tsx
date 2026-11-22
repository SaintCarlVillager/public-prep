"use client";

import { useMemo, useRef, useState } from "react";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { ComCatalogo } from "~/components/Comum";
import { confirmar } from "~/components/Dialogo";
import { AppNoCelular } from "~/components/Pwa";
import type { Base } from "~/lib/catalogo";
import { ativos, orgaoDe, vigentes } from "~/lib/estudo";
import { fmtData, hoje } from "~/lib/nucleo";
import { atualizar, normalizar, substituir, useProgresso, vazio } from "~/lib/progresso";

/* Primeira tela feita com componentes Astryx (ver DESIGN.md, "Astryx"). */

export default function PaginaAjustes() {
  return <ComCatalogo>{(b) => <Ajustes base={b} />}</ComCatalogo>;
}

function Ajustes({ base }: { base: Base }) {
  const p = useProgresso();
  const arquivo = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const ids = ativos(base, p).map((e) => e.id);
  const vig = vigentes(base);
  const siglas = useMemo(() => Object.keys(base.cat.leis ?? {}), [base]);

  /** Guarda os editais marcados sem perder os que já saíram da lista (prova passada). */
  const escolher = (marcados: string[]) =>
    atualizar((x) => {
      const deVig = new Set(vig.map((e) => e.id));
      const antes = x.config.editais_ativos ?? [...deVig];
      x.config.editais_ativos = [...antes.filter((id) => !deVig.has(id)), ...marcados];
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
      const resumo = `${n} ${n === 1 ? "sessão" : "sessões"}, ${ns} ${ns === 1 ? "simulado" : "simulados"}`;
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

  const apagar = async () => {
    const ok = await confirmar({
      titulo: "Apagar todo o progresso deste navegador?",
      texto: "Isso não tem volta. Se quiser guardar uma cópia, exporte antes.",
      ok: "Apagar progresso",
      perigo: true,
    });
    if (!ok) return;
    substituir(vazio());
    setMsg("Progresso apagado.");
  };

  return (
    // min-w-0: a coluna do app é um grid, e sem isto um rótulo longo alarga a página no celular.
    <VStack gap={6} className="min-w-0">
      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <Heading level={2}>Ajustes</Heading>
            <Text type="supporting" color="secondary">
              Valem para o placar e as sessões automáticas
            </Text>
          </HStack>
          {vig.length ? (
            <CheckboxList label="Editais ativos" value={ids} onChange={escolher} hasDividers>
              {vig.map((e) => (
                <CheckboxListItem
                  key={e.id}
                  value={e.id}
                  // O cargo vai por extenso (AGENTS.md) e quebra linha em vez de cortar com reticências.
                  label={<Text className="whitespace-normal">{`${orgaoDe(e)} · ${e.cargo ?? e.id}`}</Text>}
                  aria-label={`${orgaoDe(e)} · ${e.cargo ?? e.id}`}
                  description={
                    <Text type="supporting" color="secondary">
                      {[e.banca, e.prova && `prova em ${fmtData(e.prova)}`, `aparece como “${base.rotulo(e)}”`]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  }
                  align="first-line"
                />
              ))}
            </CheckboxList>
          ) : (
            <Text color="secondary">Nenhum edital com prova futura.</Text>
          )}
          <NumberInput
            label="Questões por sessão"
            description="De 5 a 60."
            min={5}
            max={60}
            isIntegerOnly
            hasNumberSteppers
            width={180}
            value={p.config.tamanho_sessao}
            onChange={(v) =>
              atualizar((x) => {
                x.config.tamanho_sessao = Math.max(5, Math.min(60, Math.round(v) || 20));
              })
            }
          />
        </VStack>
      </Card>

      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <Heading level={2}>Seu progresso</Heading>
            <Text type="supporting" color="secondary">
              Guardado só neste navegador
            </Text>
          </HStack>
          <Text as="p" color="secondary">
            Sessões, respostas, revisões, treino e simulados ficam no armazenamento local deste navegador. Exporte uma cópia de vez em
            quando, e importe-a para continuar em outro aparelho.
          </Text>
          <HStack gap={2} wrap="wrap">
            <Button label="Exportar progresso" variant="primary" onClick={exportar} />
            <Button label="Importar progresso" onClick={() => arquivo.current?.click()} />
            <Button label="Apagar progresso" variant="ghost" onClick={() => void apagar()} />
          </HStack>
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
          <Text as="p" role="status">
            {msg}
          </Text>
        </VStack>
      </Card>

      <Card padding={6}>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3} wrap="wrap">
            <Heading level={2}>App no celular</Heading>
            <Text type="supporting" color="secondary">
              Instalação e uso sem internet
            </Text>
          </HStack>
          <AppNoCelular siglas={siglas} />
        </VStack>
      </Card>
    </VStack>
  );
}
