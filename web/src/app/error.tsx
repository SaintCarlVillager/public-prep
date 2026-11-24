"use client";

// Tela de erro do app: se uma tela quebrar (dado inesperado, bug), o cabeçalho continua no lugar e
// quem estuda pode tentar de novo ou baixar uma cópia do progresso, em vez de ver uma página em branco.

import { useEffect } from "react";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { baixarProgressoBruto } from "~/lib/progresso";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <VStack gap={6} className="min-w-0">
      <Card padding={6}>
        <VStack gap={4}>
          <Heading level={2}>Esta tela não abriu</Heading>
          <Text as="p" color="secondary" textWrap="pretty">
            Algo deu errado ao montar a tela. Seu progresso continua guardado neste navegador. Tente de novo; se o erro voltar, baixe
            uma cópia do progresso e abra outra tela pelo menu.
          </Text>
          <Banner status="error" title="Detalhe do erro" description={error.message || "erro desconhecido"} collapsible={false} />
          <HStack gap={2} wrap="wrap">
            <Button label="Tentar de novo" variant="primary" onClick={reset} />
            <Button label="Baixar uma cópia do progresso" onClick={baixarProgressoBruto} />
            <Button label="Ir para Ajustes" variant="ghost" href="/ajustes" />
          </HStack>
        </VStack>
      </Card>
    </VStack>
  );
}
