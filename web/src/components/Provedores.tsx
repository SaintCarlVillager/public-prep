"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { LinkProvider } from "@astryxdesign/core/Link";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import ptBR from "@astryxdesign/core/locales/pt-BR.generated.js";
import { Theme } from "@astryxdesign/core/theme";

import { serventiaTheme } from "~/themes/serventia/serventia.js";

/** Tema Astryx da ServentIA (cores do DESIGN.md), textos dos componentes em português e links do Next. */
export function Provedores({ children }: { children: ReactNode }) {
  return (
    <InternationalizationProvider locale="pt-BR" messages={{ "pt-BR": ptBR }}>
      <Theme theme={serventiaTheme}>
        <LinkProvider component={Link}>{children}</LinkProvider>
      </Theme>
    </InternationalizationProvider>
  );
}
