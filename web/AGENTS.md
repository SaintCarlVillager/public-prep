# AGENTS.md (web/)

Regras do app. As do repositório inteiro estão em [`../AGENTS.md`](../AGENTS.md), e o visual em [`../DESIGN.md`](../DESIGN.md).

## Astryx no ServentIA

Todas as telas usam o design system [Astryx](https://github.com/meta/astryx) (`@astryxdesign/core`, versão fixa). O bloco abaixo foi escrito por `npx astryx init` e vale para todo o app, com uma exceção: as peças de identidade listadas no `DESIGN.md` ("Astryx") seguem com as classes de `src/styles/painel.css`.

- **Telas novas** começam com componentes Astryx (veja como as atuais fazem). Tela que vive dentro da coluna do app (um grid) precisa de `className="min-w-0"` no VStack de fora, senão texto longo alarga a página no celular. Rótulo longo de `ListItem`/`CheckboxListItem` como string corta com reticências; para texto inteiro, passe `<Text className="whitespace-normal">`.
- **CSS próprio:** só para as peças de identidade do `DESIGN.md`. Ao parar de usar uma classe do `painel.css`, apague a regra.
- **Tema:** `serventia`, feito com o editor de temas (`npx astryx experimental theme editor … serventia`) a partir dos tokens do `DESIGN.md`. A fonte é `themes/serventia/serventia.settings.json`; `src/themes/serventia/` é gerado a cada mudança (não edite à mão). Cor nova do app entra nos dois lugares: token em `painel.css` e no tema.
- **CSS:** `src/styles/globals.css` declara a ordem das camadas antes do Tailwind e importa o reset, os componentes e o tema do Astryx. Não importe CSS do Astryx em outro lugar (o `src/astryx-themes.ts` do `theme add` foi removido por isso): se o CSS do tema carregar primeiro, o preflight do Tailwind apaga os componentes. As fontes do `next/font` chegam ao Astryx por uma regra em `globals.css`, porque o editor só aceita nomes de família.
- **Textos dos componentes** em português: `InternationalizationProvider` com `pt-BR` em `src/components/Provedores.tsx`.
- Antes do merge, além de `npm test && npm run typecheck && npm run build`: `npx astryx doctor --built src/app/<tela>` sem falhas.
- Atualizar o Astryx: suba `core`, `cli` e `theme-neutral` juntos, rode `npx astryx upgrade --from <versão antiga> --apply` e recompile o tema (`npx astryx experimental theme compile themes/serventia/serventia.theme.ts`).

<!-- ASTRYX:START -->
Astryx v0.7.17 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx component <Name>` to read props before using one; `astryx template <Block>` prints a block example to read for a part it lacks. Astryx names differ from other libraries: buttons, badges, tokens and tabs take their text in `label` (Text, Heading and Link take children), booleans start with `is` or `has` (`isOpen`, `isDisabled`), and every input takes `value` and `onChange`.
Changing an existing page? Keep it: skip step 2 and add components inside its sections; read a block example when it helps.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then Tailwind utilities backed by tokens. No raw hex/px.
- THEMES: palettes and custom colors go through the theme, never :root overrides; so does a denser or roomier app (`editor set <name> spacing tight`), never gap and padding changes page by page. A change to one kind of part (the sidebar, its selected item, the gaps in a form) is a theme change too, not props on one page: `editor how "<ask>"` names the `set … --on <part>` line. No app yet: `astryx experimental theme preview app <dir>` makes a starter app that shows the theme. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` (takes pictures of real components) and open the PNGs it writes; a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded/arbitrary value (bg-[#fff], p-[13px]) with the component or a token-backed utility.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
To remove this block, run `astryx init --remove-agents`, which removes it from the agent files at the project root and in the folder you run it in; from any other file it leaves, delete everything from ASTRYX:START to ASTRYX:END.
<!-- ASTRYX:END -->
