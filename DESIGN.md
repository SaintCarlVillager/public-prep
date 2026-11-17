# DESIGN.md

O sistema visual do app de estudo (`web/`). As classes e os tokens estão em `web/src/styles/painel.css`, portados do painel antigo. Segue o design system **edenprep**: tokens no `:root`, dois temas, layout que funciona primeiro no celular e nada que só funcione num tema.

## Conceito

**Mesa de leitura.** Quase todo estudo acontece no celular, em intervalos curtos, lendo texto jurídico longo. A interface recua; a questão e o comentário são a página. Um único traço de cor de marca, o **grifo** amarelo (como quem grifa a lei seca), marca o que está escolhido ou ativo.

## Marca

- Nome: **ServentIA** ("serventia", o cartório judicial, com IA). Escrito sempre assim, com "IA" em maiúsculas.
- Logotipo: o nome em IBM Plex Sans 600, com o **"IA" grifado** (faixa `--grifo` atrás da parte de baixo das letras, como marca-texto). O texto continua `--ink`; o grifo nunca é cor de texto.
- Ícone (`web/src/app/icon.svg`): "S" claro sobre quadrado `--ink` com cantos arredondados e uma faixa grifo atrás da metade de baixo. É o mesmo ícone em tema claro e escuro.
- `theme-color`: `--paper` de cada tema.

## Tokens

Defina toda cor como token no `:root`, com tema claro como base e o escuro em `@media (prefers-color-scheme: dark)` com `:root:not([data-theme="light"])` e de novo em `:root[data-theme="dark"]`. O `body` sempre tem fundo explícito (`var(--paper)`). Os nomes antigos foram mantidos para não mexer no código; a coluna "edenprep" diz o token correspondente do design system.

| Token | Claro | Escuro | edenprep | Uso |
|---|---|---|---|---|
| `--paper` | `#faf8f3` | `#14171c` | `surface` | fundo da página (papel quente) |
| `--sheet` | `#ffffff` | `#1c2027` | `surface-raised` | cartões, questões, alternativas |
| `--sunken` | `#f1ede4` | `#0f1115` | `surface-sunken` | comentário, trilhos, avisos neutros |
| `--ink` | `#1c2430` | `#ece8df` | `ink` | texto; preenchimento do botão principal; anel de foco |
| `--muted` | `#575e6b` | `#a5abb5` | `ink-muted` | texto secundário, rótulos, contagens |
| `--rule` | `#e2dccf` | `#2b3039` | `line` | divisórias (decorativas) |
| `--rule-strong` | `#8a8478` | `#6e7581` | `line-strong` | borda de controles (≥3:1) |
| `--grifo` | `#f2c94c` | `#e8bf45` | `grifo` | letra da alternativa escolhida, aba ativa, selo TJ-SP, carimbo da nota. Nunca é cor de texto; texto sobre ele usa `--on-grifo` |
| `--good` / `--good-soft` | `#1f5a96` / `#e7eef7` | `#86b6ea` / `#182a3e` | `correct` | **correta** e acerto: azul, não verde |
| `--bad` / `--bad-soft` | `#a8400c` / `#faebe2` | `#f0965f` / `#3a2316` | `incorrect` | **errada** e erro: laranja |
| `--warn` / `--brass` | `#7a5300` | `#e6b955` | `notice` | atenção, desatualizada, traço da nota de corte |

`--accent` é `--ink` (ação principal); `--fed` e `--accent-soft` ficaram neutros. Correta × errada é **azul × laranja**, para não depender de enxergar vermelho e verde, e sempre vem com palavra.

## Tipografia

| Papel | Fonte | Onde |
|---|---|---|
| Interface | **IBM Plex Sans** 400 e 600 | títulos, abas, botões, rótulos, números |
| Leitura | **Literata** 400 e 600, itálico para citação | enunciado, alternativas, comentário, mini-aula |

- Enunciado 18/29 px; alternativa 17/26; comentário 16/25. Não diminua no celular.
- Rótulos em caixa-alta (`.eyebrow`): 12 px, 600, espaçamento .06em.
- Números em coluna com `font-variant-numeric: tabular-nums`.

## Layout

- Coluna única de até **1040 px**, gutter `max(16px, env(safe-area-inset-*))`. Pensado primeiro a **360 px**.
- Cabeçalho no próprio papel (sem faixa escura): nome, um prazo por concurso ativo e as abas, uma rota cada: **Painel**, **Sessão**, **Revisões**, **Treino**, **Banco**, **Ajustes**. A aba ativa tem sublinhado grifo.
- Nada tocável abaixo de 48 px de altura (campos de filtro, 44 px).
- Raios: 6 px (selos, letra, campos), 10 px (botões, alternativas), 16 px (cartões).
- Bordas, não sombras.

## Componentes

- **Medidor**: trilho `--sunken`, preenchimento `--ink` (ou `--bad` abaixo do corte) e o traço `--brass` na nota de corte.
- **Selos** (`.pill`): 12 px, 600, cantos de 6 px. TJ-SP (ou os dois) em grifo; TRF3 com contorno; acertou em azul, errou em laranja; anulada neutra.
- **Alternativa**: botão inteiro com a letra num quadrado. Escolhida: borda 2 px `--ink` e letra em grifo. Depois da entrega: correta em azul com "✓ Correta", a marcada errada em laranja com "✗ Sua resposta", e **cada alternativa com o seu comentário logo abaixo** (`exp_alt`). O comentário da questão inteira só aparece quando falta o de alguma alternativa.
- **Card do Treino**: o enunciado da questão em cartão, e abaixo a alternativa como afirmação, num cartão que se arrasta (esquerda = falso, direita = verdadeiro; inclina de leve, sem animação com `prefers-reduced-motion`). Os botões "← Falso" e "Verdadeiro →" ficam sempre visíveis. Depois: "✓ Você acertou" ou "✗ Você errou", sempre dizendo se a afirmação é verdadeira ou falsa, e o comentário da questão com o gabarito.
- **Carimbo** da nota: número sobre grifo (laranja claro abaixo de 50%).

## Estados e escrita

- Estado vazio diz o que vai aparecer e como começar.
- Carregamento com limite de 10 s; erro explica o que fazer, sem desculpas.
- Botões dizem a ação ("Entregar sessão", "Começar 10 cards"); o resultado confirma.
- Linguagem do candidato: "Revisões", "Treino", não "spaced repetition".

## Acessibilidade

- Foco: `outline: 2px solid var(--ink)` com 2 px de afastamento (≥13:1 em todo fundo).
- Contraste conferido nos dois temas: texto ≥4,5:1, bordas de controle ≥3:1.
- Nenhuma informação só por cor: correta, errada e status sempre com palavra.
- Movimento só na largura das barras, no fundo de toque e no arraste do card; tudo desligado com `prefers-reduced-motion`.

## Ao mudar a interface

1. Cor nova entra primeiro como token, nos três blocos (claro, escuro por sistema, escuro forçado).
2. Grifo é raro: se tudo for grifado, nada é.
3. Teste a 360 px e nos dois temas antes de publicar.
