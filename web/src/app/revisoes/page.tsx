"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

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
    // min-w-0: a coluna do app é um grid, e sem isto um rótulo longo alarga a página no celular.
    <VStack gap={6} className="min-w-0">
      <Card padding={6}>
        <VStack gap={6}>
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2}>Revisões</Heading>
              <Text type="supporting" color="secondary">
                Errou: volta amanhã · acertou: 1, 3, 7, 15, 30, 60 dias
              </Text>
            </VStack>
            <HStack gap={2} wrap="wrap">
              <Button
                label={`Revisar ${tam}`}
                isDisabled={!fila.length}
                onClick={() => abrir(`Revisão (${Math.min(tam, fila.length)}) · ${fmtDia(hj)}`, fila.slice(0, tam))}
              />
              <Button
                label={`Revisar as atrasadas${atras.length ? ` (${atras.length})` : ""}`}
                isDisabled={!atras.length}
                onClick={() => abrir(`Atrasadas · ${fmtDia(hj)}`, porData(atras))}
              />
              <Button
                label={`Revisar as de hoje${venc.length ? ` (${venc.length})` : ""}`}
                variant="primary"
                isDisabled={!venc.length}
                onClick={() => abrir(`Revisões de ${fmtDia(hj)}`, porData(venc))}
              />
            </HStack>
          </VStack>
          {!itens.length && (
            <Text as="p" color="secondary">
              Nenhuma revisão marcada. Cada questão respondida numa sessão entra aqui com a data de voltar a ela.
            </Text>
          )}
          {[...grupos.entries()].map(([k, lst]) => (
            <VStack key={k} gap={1}>
              <HStack gap={2} align="center" wrap="wrap">
                <Heading level={3}>{k === "atrasada" ? "Atrasadas" : k === hj ? "Hoje" : fmtDia(k)}</Heading>
                <Badge label={lst.length} variant={k === "atrasada" ? "error" : k === hj ? "warning" : "neutral"} />
              </HStack>
              <List hasDividers edge="flush">
                {lst.map((it) => (
                  <ListItem
                    key={it.qid}
                    itemKey={it.qid}
                    align="first-line"
                    label={<Text className="whitespace-normal">{base.nomeTema(it.m.temas[0] ?? "")}</Text>}
                    description={
                      // Os selos vão embaixo do texto, e não à direita, para o tema não ser espremido no celular.
                      <VStack gap={1} align="start">
                        <Text type="supporting" color="secondary" hasTabularNumbers className="whitespace-normal">
                          {rotuloProva(base, provaDe(it.qid))} · Q{it.m.n}
                          {k === "atrasada" ? ` · desde ${fmtDia(it.p)}` : ""} · volta em {it.i} {it.i === 1 ? "dia" : "dias"}
                        </Text>
                        <HStack gap={1.5} wrap="wrap">
                          <SelosEdital base={base} qid={it.qid} />
                        </HStack>
                      </VStack>
                    }
                    endContent={<Badge label={`${it.a}/${it.t}`} variant={it.a === it.t ? "success" : "error"} />}
                  />
                ))}
              </List>
            </VStack>
          ))}
        </VStack>
      </Card>
    </VStack>
  );
}
