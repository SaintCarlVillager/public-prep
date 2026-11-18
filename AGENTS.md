# AGENTS.md

Instruções para qualquer agente de IA (Claude, Codex, Copilot…) que trabalhe neste repositório. Converse e escreva em **português do Brasil**.

## O que é

**ServentIA** (repositório `public-prep`): um framework de estudo para concursos públicos: **provas reais etiquetadas** por tema e dispositivo, **editais** que dizem o que cada concurso cobra, e um **app web** (`web/`, Next.js na Vercel) que monta sessões, corrige pelo gabarito e agenda revisões. O desenho completo está em [`ARQUITETURA.md`](ARQUITETURA.md); o visual, em [`DESIGN.md`](DESIGN.md).

## Mapa

| Caminho | O quê |
|---|---|
| `taxonomia/<matéria>.json` | árvore de temas (matéria + até 3 níveis) |
| `normas/normas.json` | siglas das normas usadas nos dispositivos |
| `editais/<órgão>/<cargo>/<ano>/edital.json` | o que o concurso cobra, blocos, notas de corte; PDFs ao lado |
| `provas/<banca>/<órgão>/<cargo>/<ano>/` | `prova.json` (metadados e gabarito), `questoes.json`, `texto.txt`, PDFs |
| `leis/<SIGLA>.json` | lei seca: texto oficial vigente de cada norma, artigo por artigo |
| `revisao/index.html`, `scripts/revisao.py` | painel de revisão (administração), Artifact do claude.ai |
| `scripts/validar.py` | validação de tudo acima |
| `scripts/empacotar.py` | gera os dados que o app carrega (`web/public/dados/`, fora do git) |
| `web/` | o app (Next.js, criado com create-t3-app): Painel, Sessão, Revisões, Treino, Simulados, Banco, Lei seca, Ajustes |

## Regras que não se negociam

1. **Fonte literal.** Enunciados, alternativas e textos-base são transcritos do PDF, sem reescrever. O que não der para conferir (figura, destaque perdido, trecho ilegível) vai em `pendencias`, nunca é inventado.
2. **Gabarito oficial.** Use o gabarito publicado pela banca, registrado em `prova.json` com o seu `status` (`preliminar` ou `definitivo`). Se só houver gabarito resolvido por você, marque `"status": "resolvido"` e avise.
3. **Questão real × autoral.** Só é "real" o que foi conferido no texto da prova. Questões criadas por IA ficam em `autorais/`, com `"autoral": true`.
4. **Etiquetar pelo conteúdo, nunca pelo concurso.** Cada questão leva `temas` (ids da taxonomia) e `dispositivos` (`"CPC 246 §1º-A"`). A relevância para cada concurso é calculada pelos editais.
5. **Taxonomia estável.** Não renomeie nem apague ids de tema; acrescente. Tema novo precisa caber em até 3 níveis abaixo da matéria.
6. **Sem dados pessoais.** Documentos com nomes de candidatos (listas de recursos, classificações) não entram no repositório; guarde só dados agregados.
7. **Valide antes de cada commit:** `python3 scripts/validar.py` tem de terminar em `ok`.

## Formatos

### Dispositivo
`<SIGLA> <artigo>[ complemento]`, com a sigla registrada em `normas/normas.json` e o número do artigo **sem "º"**: `CF 5 XI`, `CPP 362 p.ú.`, `L8112 13 §6º`, `CNJ-R354 8`, `CPC 1015 IX` (sem ponto de milhar). Parágrafos e incisos seguem a forma usual (`§1º`, `p.ú.`, `IX`). Use a **numeração vigente na data da prova** (é ela que explica o gabarito); se a norma foi renumerada depois, registre a numeração atual em `observacoes`, e se a regra deixou de existir, marque a questão como `desatualizada`. Intervalos em editais: `"240-250"`, `"396-396-A"`, `"*"` para a norma inteira.

### Questão (múltipla escolha)
```json
{
  "id": "vunesp/tj-sp/oficial-de-justica/2024#43",
  "tipo": "me", "numero": 43,
  "texto": "T1",
  "enunciado": "...", "alt": {"A": "...", "B": "...", "C": "...", "D": "...", "E": "..."},
  "gab": "D",
  "temas": ["processo-civil.intervencao.denunciacao"],
  "dispositivos": ["CPC 125 §1º"],
  "exp": "Por que D está certa e por que as outras erram, citando o artigo.",
  "recursos": 7,
  "pendencias": []
}
```
`texto` aponta para um texto-base em `textos` no topo do `questoes.json` (`{"T1": {"titulo", "texto", "fonte"}}`, parágrafos separados por linha em branco). Certo/Errado e discursiva seguem `ARQUITETURA.md`.

Campos opcionais da questão:
- `pendencias`: o que **ainda falta conferir** (some quando resolvido).
- `observacoes`: notas **permanentes** (erro de digitação da própria prova, redação alterada depois, critério proposto por nós).
- `desatualizada`: texto dizendo por que a resposta oficial não vale mais hoje (lei nova, emenda). O app avisa o candidato.
- `imagens`: recortes de figura da prova, relativos à pasta da prova (`["figuras/q84.png"]`).
- `anulada`: `true` quando a banca anulou; `gab` guarda o gabarito preliminar.
- `vf`: cada alternativa como card de verdadeiro/falso do **Treino** (`{"A": false, "B": true, "C": false, "D": null, "E": false}`). `true`/`false` é o valor de verdade da afirmação lida junto com o enunciado; `null` deixa a alternativa fora do treino (não se sustenta sozinha). Os valores **saem do gabarito oficial**, nunca de opinião: na questão que pede a correta, só o gabarito é `true`; na que pede a incorreta ou "exceto", só o gabarito é `false`. O gabarito é sempre marcado (é ele que diz o sentido da questão). Fica sem `vf`: questão anulada, desatualizada, de lacunas, com alternativas que só fazem sentido entre si ("I e II, apenas", "todas as anteriores") ou com gabarito discutível. O validador confere tudo isso contra o gabarito.
- `exp_alt`: o comentário de **cada alternativa com card** em `vf` (`{"A": "…", "B": "…"}`), que o Treino mostra depois do julgamento, sozinho. 1 a 3 frases: por que a alternativa está certa, ou o que erra e qual é a regra; cite o dispositivo em `código` e destaque a palavra-chave em **negrito**. Tem de funcionar sem as outras alternativas: não cite outras letras nem "as demais", e não comece com "Correta"/"Errada" (o app já mostra o veredito). Nunca contradiz `vf`, o gabarito ou `exp`. Ao tirar um card (`vf` vira `null`), tire também o seu `exp_alt`.

**Destaques gráficos da prova** (termo em negrito ou sublinhado a que o enunciado se refere): `**negrito**` e `__sublinhado__`. Nunca HTML. Figuras, gráficos e tabelas que o texto não reproduz são descritos entre colchetes (`[Gráfico de setores: …]`) e registrados em `pendencias`.

### Lei seca (`leis/<SIGLA>.json`)
```json
{
  "sigla": "CPC", "nome": "<igual a normas/normas.json>",
  "fonte": "<URL oficial do texto>", "consultado": "2026-11-17",
  "observacao": "opcional: versão, limitações",
  "artigos": [
    {"art": "246", "local": "Parte Especial › Livro I › Título I › Capítulo IV", "texto": "Art. 246. A citação será feita: ...\n§ 1º ..."}
  ]
}
```
- Um arquivo por sigla de `normas/normas.json`, com o **texto vigente e literal**, tirado da fonte oficial; nada reescrito nem resumido. Revogado fica como a fonte mostra ("Art. 5º (Revogado)").
- `art` no formato dos dispositivos (`"1015"`, `"396-A"`; artigo das Disposições Transitórias das leis de SP: `"DT-1"`, citado como `LC1111 DT-1`), único e na ordem da norma; `texto` com uma linha por dispositivo (caput, parágrafos, incisos); `local` é o caminho de títulos e capítulos.
- O validador avisa quando uma questão cita artigo que não está na lei seca (renumerado, revogado ou erro de etiqueta).
- O app mostra o artigo ao tocar no dispositivo, depois da correção, e a aba **Lei seca** reúne os artigos que cada bloco do edital cobra.

### Explicação (`exp`)
2 a 5 frases. Diga por que o gabarito está certo e por que cada distratora relevante erra. Cite o dispositivo em `código`; destaque a palavra-chave em **negrito**; não use itálico de um asterisco. Em cálculo, mostre a conta.

## Como trabalhar

### Etiquetar uma prova
1. Coloque o PDF da prova e do gabarito na pasta da prova; extraia o texto (`pdftotext`, coluna a coluna).
2. Registre `prova.json` com o gabarito oficial.
3. Etiquete por blocos **em paralelo**, um subagente por bloco ou matéria (ver abaixo); junte os resultados num único `questoes.json`.
4. Rode o validador, revise as `pendencias` e faça o commit.

### Cadastrar um edital
1. Guarde o PDF (e as retificações) na pasta do edital.
2. Transcreva o conteúdo programático para `edital.json`: por **artigos** quando o edital lista artigos, por **temas** quando descreve em palavras. Dispositivos citados nominalmente vão em `destaques`; intervalos deduzidos por você são explicados em `observacao`.
3. Crie na taxonomia os temas que faltarem e valide.

### O app (`web/`)
- Nome e marca: **ServentIA**, com o "IA" grifado (ver `DESIGN.md`, "Marca"). As chaves do localStorage continuam `public-prep:*`, para não perder o progresso de quem já estuda.
- Todo `edital.json` tem `cargo_curto` ("Oficial", "Escrevente"): o app sempre rotula o edital com órgão e cargo curto ("TRF3 Oficial", "TJ-SP Escrevente"), e Ajustes mostra órgão e cargo por extenso.
- Lógica pura em `web/src/lib/nucleo.ts` (relevância, revisão espaçada, treino) com testes em `nucleo.test.ts`, e em `simulado.ts` (montagem e pontuação dos simulados) com testes em `simulado.test.ts`; regras que juntam catálogo e progresso em `estudo.ts`; progresso em `progresso.ts`.
- **Simulados** (`/simulados`): a prova do edital montada do banco (completa ou reduzida, na estrutura de `blocos`) ou uma prova anterior inteira, com cronômetro e nota pela regra do edital, lida dos campos (`objetiva.escala`, `minimo_total` ou `media_ponderada`/`minimo_media`, `blocos[].peso`, `minimo`, `eliminatorio`), nunca escrita por concurso. O tempo vem de `objetiva.duracao_min` (e `duracao_inclui`) do edital; o resultado da prova anterior usa os `blocos` do `prova.json` (`{"id", "nome", "questoes": "1-20"}`). Todo edital novo leva `duracao_min`, e toda prova nova, `blocos`.
- O progresso de quem estuda fica **no navegador** (localStorage), com exportar/importar em Ajustes. Não há login, banco nem recursos do Claude no app por enquanto.
- Antes de cada merge que mexa em `web/`: `cd web && npm test && npm run typecheck && npm run build`.
- Deploy na Vercel: **Root Directory** `web`. O `prebuild` roda `python3 ../scripts/empacotar.py`, que valida o repositório e gera os dados; se a validação falhar, o deploy falha.

### Painel de revisão (administração)
O painel de revisão é um Artifact privado do dono: https://claude.ai/artifact/PSNWjcpKcEeP1pbvrZ3gAq. Ele mostra a fila do que precisa de olho humano: questões com `pendencias`, questões com 100 recursos ou mais, `desatualizada`, `observacoes`, normas cobradas sem lei seca e gabaritos não definitivos. Para cada item, o dono decide "Está certo", "Corrigir" (com nota obrigatória) ou "Ignorar". As decisões ficam no banco do Artifact, coleção `decisoes` (o id de cada documento é o id do item codificado; o campo `item` traz o id original, ex. `pendencia:vunesp/…/2025#48`).

- **Atualizar a fila** depois de mudanças no banco de questões: `python3 scripts/revisao.py` e republicar `revisao/index.html` no **mesmo link**, com `revisao/dados/revisao.json` publicado como arquivo `revisao.json` (as capabilities `db` e `user` e a regra `decisoes` só para `admin` já ficam guardadas).
- **"Aplica as revisões do painel"**: leia `decisoes` (ferramenta de dados do Artifact), pegue as que ainda não têm `aplicada`, e:
  - `corrigir`: faça o que a nota pede, sem inventar (se a nota não bastar, pergunte);
  - `certo`: numa pendência, tire a pendência (o dono conferiu); nos demais tipos, nada a mudar;
  - `ignorar`: nada a mudar.

  Valide, abra o PR e faça o merge conforme a autorização do dono. Depois grave em cada decisão aplicada `aplicada: {"em": ISO, "pr": "<link>"}` e republique o painel com a fila nova.

## Subagentes

Use subagentes **sempre que a tarefa puder ser dividida** ou exigir ler muito material (provas inteiras, editais, leis). Isso mantém o contexto principal limpo e acelera o trabalho.

### Fluxo: cada subagente abre o seu PR

1. **O orquestrador recorta** a tarefa para que cada subagente mexa em **arquivos diferentes** (veja abaixo) e dá a cada um um briefing **autocontido**: caminhos, formato, regras deste arquivo, nome do branch e o que pôr no PR.
2. **O subagente trabalha num branch próprio** (`agente/<tarefa>`, ex. `agente/tjsp-2023-bloco-II`), valida com `python3 scripts/validar.py`, faz o commit, o push e abre um **PR em rascunho** para a `main`. Na descrição do PR: o que fez, contagens, pendências, discordâncias com o gabarito e **temas ou normas que sugere criar**.
3. **O orquestrador revisa**: faz checkout do branch e roda `python3 scripts/validar.py` e `python3 scripts/empacotar.py` (os dois têm de passar); ele confere por amostragem (gabarito × explicação, dispositivos, transcrição contra o PDF) e, se precisar, **pede ajustes ao mesmo subagente**, que corrige no mesmo branch.
4. **O orquestrador faz o merge** quando estiver tudo certo, e só ele mexe nos arquivos compartilhados.

**Arquivos compartilhados** (`taxonomia/`, `normas/normas.json`, `AGENTS.md`, `scripts/`, `web/`): subagente não edita. Precisa de tema ou norma nova? Sugere no PR; o orquestrador cria num PR próprio, antes ou junto do merge.

**Uma prova dividida em blocos:** cada subagente grava só o seu pedaço em `provas/<…>/questoes/<bloco>.json` (`{"prova": "<id>", "textos": {...}, "questoes": [...]}`). O validador e o empacotador juntam `questoes.json` e `questoes/*.json`, então PRs de blocos diferentes não entram em conflito. O mesmo texto-base usado por dois blocos tem de ser idêntico nos dois arquivos.

**Tarefas de leitura ou pesquisa** (achar um documento, conferir um artigo) não geram PR: o subagente responde com um resumo curto e, se baixou algo, onde salvou.

- Peça de volta só um resumo curto (link do PR, contagens, pendências, problemas), nunca o conteúdo inteiro.
- Bom recorte: um bloco ou matéria de uma prova por subagente; um edital por subagente.

### Roteamento: o modelo certo para cada tarefa

O subagente **não precisa herdar a capacidade do orquestrador**. Escolha o modelo e o nível de esforço pelo que a tarefa exige, para gastar menos tokens sem perder qualidade:

| Tarefa | Modelo | Esforço |
|---|---|---|
| Mecânica: baixar e extrair arquivos, recortar figuras, procurar um documento oficial, conferir formato, contar e listar | o mais leve disponível | baixo |
| Transcrição e etiquetagem de Português, Matemática, Raciocínio Lógico e Informática; localizar o número de um artigo numa lei | intermediário | médio |
| Etiquetagem jurídica com explicação, divergência com o gabarito, código do app, decisões de arquitetura | o mais capaz | médio ou alto |

- Na dúvida, comece pelo nível mais barato que provavelmente resolve e **suba se o resultado vier fraco**.
- O orquestrador **confere por amostragem** o trabalho de modelos mais leves (gabarito, dispositivos, transcrição) antes de juntar.
- Tarefas que mexem em muitas questões de uma vez ou que ninguém vai revisar linha a linha pedem o modelo mais capaz.

## Git

- `main`: o framework, o banco de questões e o app.
- Mensagens de commit em português, no imperativo ou descritivas ("Prova TJ-SP 2024: Bloco II etiquetado").
- **Subagentes** trabalham em `agente/<tarefa>` e entregam por PR em rascunho; **o orquestrador** revisa e faz o merge (ver "Subagentes").
- Mudanças de conteúdo, estrutura, esquema, app ou deste arquivo vão por pull request.
- Não há checagem automática no GitHub (o GitHub Actions foi desligado para não gerar custo): **antes de cada merge**, quem revisa roda `python3 scripts/validar.py` e `python3 scripts/empacotar.py` no branch do PR (e os testes do app, se ele mudou). A Vercel gera uma prévia de cada PR.
