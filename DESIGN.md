# DESIGN.md

O sistema visual do painel de estudo. Vale para o painel atual (artifact do claude.ai, código em `painel/` na `main`) e para o painel v2 da `develop`. Segue as diretrizes de design de Artifacts da Anthropic: tokens no `:root`, dois temas, layout responsivo e nada que só funcione num tema.

## Conceito

**"Folha de mandado."** O painel é uma ferramenta de trabalho de quem cumpre ordens judiciais: sóbrio, com cara de documento oficial, e com um único traço de cor dourada para o que é decisivo (notas de corte, prazos). Ele é lido e operado, não admirado: primeiro o resumo, depois o detalhe; estado mostrado também por forma (selos, traços), não só por número.

## Tokens

Defina toda cor como token no `:root`, com tema claro como base e o escuro em `@media (prefers-color-scheme: dark)` com `:root:not([data-theme="light"])` e de novo em `:root[data-theme="dark"]`. O `body` sempre tem fundo explícito (`var(--paper)`).

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--paper` | `#f2f4f7` | `#0f141d` | fundo da página |
| `--sheet` | `#ffffff` | `#171e2a` | cartões e questões |
| `--ink` | `#141c2e` | `#e6eaf1` | texto |
| `--muted` | `#5b6477` | `#9aa4b6` | texto secundário, rótulos |
| `--rule` | `#d9dee7` | `#2a3343` | bordas e trilhos |
| `--accent` | `#0e6a5a` | `#4fc2a9` | ação principal, barras, questão real |
| `--brass` | `#a77a12` | `#e0b44a` | **só** o decisivo: nota de corte, prazos, temas comuns aos dois concursos |
| `--fed` | `#2c5aa0` | `#8fb3ec` | etiqueta "só TRF3" (concurso federal) |
| `--good` / `--bad` / `--warn` | `#1d7a3f` / `#b3261e` / `#9a6200` | `#5cc983` / `#f2867d` / `#e8b04a` | acerto, erro, atenção (semânticos, nunca decorativos) |
| `--band` | `#141c2e` | `#0a0e15` | faixa do cabeçalho |

Cada cor semântica tem uma versão `-soft` (fundo de selo) com o mesmo matiz em baixa saturação.

## Tipografia

| Papel | Fonte | Onde |
|---|---|---|
| Display | **Archivo** (largura variável, 400–800) | títulos, números das abas, rótulos de cartão |
| Leitura | **Literata** | mini-aula, enunciados e alternativas: texto longo |
| Dados | **JetBrains Mono** | placares, datas, contagens, rótulos em caixa-alta (`.eyebrow`) |

- Todas do Google Fonts, com pilha de reserva (`Georgia`, `Helvetica Neue`, `ui-monospace`).
- Texto corrido da aula em até ~72 caracteres por linha; enunciados a 16 px, aula a 16,5 px.
- Números alinhados em coluna usam `font-variant-numeric: tabular-nums`.
- Títulos com `text-wrap: balance`.

## Layout

- Coluna única de até **1040 px**, gutter lateral `max(16px, env(safe-area-inset-*))`.
- Cabeçalho em faixa escura com o nome do concurso e **um prazo por concurso ativo** (o do TRF3 some depois da prova).
- Abas por `#hash`: **Painel**, **Sessão**, **Revisões**.
- Grades com `gap`, nunca margens soltas; tudo vira uma coluna abaixo de ~820 px. Tabelas e gráfico rolam dentro do próprio contêiner, a página nunca rola na horizontal.
- Barra de entrega fixa no rodapé da sessão, respeitando a área segura do celular.

## Componentes

- **Medidor**: trilho fino (`--rule`), preenchimento `--accent` (ou `--bad` abaixo do corte) e um **traço dourado** na posição da nota de corte do edital.
- **Selos** (`.pill`): fonte mono 11 px, cantos arredondados.
  - Fonte da questão: **verde** = prova real; **amarelo** = autoral.
  - Concurso: **dourado** = cai nos dois; **azul** = só TRF3; **dourado claro** = só TJ-SP.
  - Resultado: verde "acertou", vermelho "errou · gabarito X".
- **Alternativa**: botão inteiro clicável com a letra num círculo; selecionada em `--accent-soft`; depois da entrega, certa em verde e marcada errada em vermelho.
- **Carimbo** da nota: número em mono dentro de borda grossa, levemente girado (o único gesto "artesanal" da página).
- **Gráfico de evolução**: barras por sessão, tracejado dourado em 50%, simulados discursivos só com contorno.

## Estados e escrita

- Estado vazio sempre diz o que vai aparecer e como começar ("Nenhuma sessão publicada ainda").
- Carregamento com limite de 10 s; erro explica o que fazer, sem desculpas.
- Botões dizem a ação ("Entregar sessão"), e o resultado confirma ("Sessão entregue").
- Linguagem do candidato, não do sistema: "Revisões", não "fila de spaced repetition".

## Acessibilidade

- Foco visível em dourado (`outline: 2px solid var(--brass)`).
- Contraste conferido nos dois temas; nenhuma informação só por cor (selos têm texto).
- Animações apenas na largura das barras, desligadas com `prefers-reduced-motion`.

## Ao mudar o painel

1. Novas cores entram primeiro como token, nos três blocos (claro, escuro por sistema, escuro forçado).
2. Mantenha o dourado raro: se tudo for destaque, nada é.
3. Teste em 400 px de largura e nos dois temas antes de publicar.
