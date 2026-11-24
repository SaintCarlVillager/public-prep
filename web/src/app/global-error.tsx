"use client";

// Último recurso: quando o próprio layout quebra, não há tema nem cabeçalho. HTML simples, com o
// mesmo caminho de saída da tela de erro (tentar de novo ou baixar o progresso).

import { baixarProgressoBruto } from "~/lib/progresso";

export default function ErroGeral({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: "40rem", margin: "0 auto", padding: "2rem 1rem", lineHeight: 1.5 }}>
        <h1 style={{ fontSize: "1.5rem" }}>A ServentIA não abriu</h1>
        <p>Seu progresso continua guardado neste navegador. Tente de novo; se o erro voltar, baixe uma cópia do progresso.</p>
        <p style={{ color: "#a33" }}>Detalhe: {error.message || "erro desconhecido"}</p>
        <p style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 1rem" }}>
            Tentar de novo
          </button>
          <button type="button" onClick={baixarProgressoBruto} style={{ minHeight: 44, padding: "0 1rem" }}>
            Baixar uma cópia do progresso
          </button>
        </p>
      </body>
    </html>
  );
}
