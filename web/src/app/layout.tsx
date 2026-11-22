import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { IBM_Plex_Sans, Literata } from "next/font/google";

import { Cabecalho } from "~/components/Cabecalho";
import { Provedores } from "~/components/Provedores";
import { CatalogoProvider } from "~/lib/catalogo";

export const metadata: Metadata = {
  title: { default: "ServentIA", template: "%s · ServentIA" },
  description:
    "Estudo para concursos do Judiciário com provas reais etiquetadas por tema e artigo de lei, sessões, revisões espaçadas e treino de verdadeiro ou falso.",
  applicationName: "ServentIA",
  appleWebApp: { title: "ServentIA", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
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
        <Provedores>
          <CatalogoProvider>
            <Cabecalho />
            <main>
              <div className="wrap">{children}</div>
            </main>
            <footer className="wrap rodape">
              Seu progresso fica só neste navegador. Exporte uma cópia em <a href="/ajustes">Ajustes</a>.
            </footer>
          </CatalogoProvider>
        </Provedores>
      </body>
    </html>
  );
}
