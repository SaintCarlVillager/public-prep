import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { IBM_Plex_Sans, Literata } from "next/font/google";

import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { Cabecalho } from "~/components/Cabecalho";
import { Dialogos } from "~/components/Dialogo";
import { Provedores } from "~/components/Provedores";
import { CatalogoProvider } from "~/lib/catalogo";

export const metadata: Metadata = {
  title: { default: "ServentIA", template: "%s · ServentIA" },
  description:
    "Estudo para concursos do Judiciário com provas reais etiquetadas por tema e artigo de lei, sessões, revisões espaçadas e treino de verdadeiro ou falso.",
  applicationName: "ServentIA",
  appleWebApp: { title: "ServentIA", capable: true, statusBarStyle: "default" },
  // Segue o tamanho de texto do sistema (Dynamic Type etc.) onde houver suporte; por isso as fontes estão em rem.
  other: { "text-scale": "scale" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  // <meta name="color-scheme">: o navegador já pinta a tela e os controles no tema certo antes do CSS.
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#14171c" },
  ],
};

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex" });
const literata = Literata({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-literata" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${plex.variable} ${literata.variable}`}>
      <body>
        <a className="pular" href="#conteudo">
          Pular para o conteúdo
        </a>
        <Provedores>
          <CatalogoProvider>
            <Cabecalho />
            <main id="conteudo" tabIndex={-1}>
              <div className="wrap">{children}</div>
            </main>
            <VStack as="footer" className="wrap" paddingBlockEnd={8}>
              <Text as="p" size="sm" color="secondary">
                Seu progresso fica só neste navegador. Exporte uma cópia em{" "}
                <Link href="/ajustes" color="inherit" type="inherit" hasUnderline>
                  Ajustes
                </Link>
                .
              </Text>
            </VStack>
            <Dialogos />
          </CatalogoProvider>
        </Provedores>
      </body>
    </html>
  );
}
