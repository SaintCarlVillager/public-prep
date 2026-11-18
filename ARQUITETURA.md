# Arquitetura do framework de estudo para concursos

O **ServentIA** (repositório `public-prep`) é um banco de provas reais etiquetadas e um app web aberto para estudar com elas. O método (como montar sessões, corrigir e revisar) fica legível no código e nos arquivos, não escondido num prompt.

## Decisões já tomadas

| Pergunta | Decisão |
|---|---|
| Como um colega usa | **Pelo app publicado** na Vercel; o progresso fica no navegador dele. Melhorias no banco de questões voltam por pull request. |
| Quem monta a sessão | **O app**, sozinho, a partir do banco e do progresso. O Claude etiqueta as provas e cadastra os editais no repositório. |
| Visibilidade | **Repositório privado**; o **app publicado é aberto**, com o texto integral das provas. |
| Formatos | **Múltipla escolha (A–E), Certo/Errado e discursiva/estudo de caso.** |
| Etiquetas | **Temas** (em níveis) e **dispositivos** citados, por questão. **Banca** vem da prova. A relevância para cada concurso é **calculada**, nunca etiquetada. |
| Níveis de tema | Matéria e, abaixo dela, **até 3 níveis**. O detalhe mais fino fica nos dispositivos. |
| Normas que renumeram (NSCGJ) | Tema normal; dispositivo **por artigo**, como o próprio edital do TJ-SP cita; a prova registra a data de aplicação, e o edital, a data da legislação cobrada. |
| Dificuldade | **Personalizada**: calculada pelo histórico de cada pessoa, guardada só no navegador dela. |
| Pastas | `provas/<banca>/<órgão>/<cargo>/<ano>/` e `editais/<órgão>/<cargo>/<ano>/`. |
| Ponto de partida | Construído do zero. |

## A ideia central: etiquetar pelo conteúdo, calcular a relevância

Cada questão é etiquetada **uma vez**, pelo que ela trata. Cada edital diz o que cobra, de dois jeitos, conforme o próprio edital escreve:

- **por artigos** (`"CPP": ["240-250", "283-303"]`): é como o TJ-SP descreve todo o Bloco II. A questão conta quando **algum dispositivo dela cai num desses intervalos**. É objetivo e automático.
- **por temas** (`"portugues.concordancia"`): para o que o edital descreve em palavras (Português, Matemática, Informática). A questão conta quando algum tema dela está na lista.

```
questão  ─ temas ─┐
                  ├─ interseção ─▶ "esta questão cai no TRF3 (bloco Específicos)"
edital   ─ temas ─┘
```

Por que não etiquetar por concurso: a cada edital novo (seu ou de um colega) seria preciso reetiquetar o banco inteiro. Com temas, basta cadastrar o edital; tudo o que já foi etiquetado passa a contar para ele.

## As camadas

| Camada | O que guarda | Onde |
|---|---|---|
| **Taxonomia** | a árvore de temas de cada matéria | `taxonomia/<matéria>.json` |
| **Normas** | as siglas usadas nos dispositivos e o nome de cada norma | `normas/normas.json` |
| **Editais** | data, banca, blocos, pesos, cortes e temas cobertos | `editais/<órgão>/<cargo>/<ano>/edital.json` |
| **Provas** | metadados, texto e questões etiquetadas | `provas/<banca>/<órgão>/<cargo>/<ano>/` |
| **Questões autorais** | as criadas por Claude, quando falta questão real | `autorais/*.json` |
| **Método** | as regras de professor | `METODO.md` e `CLAUDE.md` |
| **Lei seca** | texto oficial vigente das normas, artigo por artigo | `leis/<SIGLA>.json` |
| **Candidato** | sessões, respostas, revisões e treino | navegador de quem estuda (localStorage) |
| **App** | a interface de estudo | `web/` |

O **repositório é a fonte de verdade**: legível, versionado, revisável. Um script valida tudo e gera os arquivos estáticos que o app carrega (`web/public/dados/`). O progresso de quem estuda **não** entra no repositório.

### O app web (decisão de 17/11/2026)

O painel deixou de ser um Artifact do claude.ai e virou um app **Next.js** (criado com create-t3-app, App Router e Tailwind), publicado na **Vercel**, para que qualquer pessoa estude sem conta no claude.ai.

- **Conteúdo estático.** As provas, os editais e a taxonomia continuam em JSON no repositório; o build roda `scripts/empacotar.py` e serve o resultado como arquivos. Nenhum banco para conteúdo.
- **Progresso no navegador.** Sessões, respostas, revisões, treino e simulados ficam no localStorage, com exportar/importar. O formato espelha as coleções do banco do painel antigo (`sessoes`, `respostas`, `estado`, `treino`, `meta/config`), então um dump dele pode ser importado. Os simulados ficam em `simulados` (campo opcional: progresso antigo sem ele continua valendo), cada um com edital, tipo, tamanho, questões por bloco, respostas, cronômetro (tempo ativo e pausas) e, depois da entrega, o resultado (nota, habilitado, acertos por bloco). A entrega também grava uma sessão entregue (`sessoes` + `respostas`), que alimenta placar e revisões.
- **Sem Claude no app.** Sessões automáticas, correção pelo gabarito, revisão espaçada e Treino funcionam sozinhos. Mini-aulas, correção de discursivas e sessões montadas pelo Claude ficaram de fora.
- **Depois, se precisar:** login (Auth.js) e Postgres (Drizzle) para sincronizar o progresso entre aparelhos; o T3 já prevê os dois.

## Esquemas

### Taxonomia (`taxonomia/cpc.json`)

Um arquivo por matéria; abaixo dela, **até 3 níveis** (o validador recusa mais). O identificador é um caminho com pontos, começando pela matéria, estável para sempre (o nome exibido pode mudar). Para ir além do terceiro nível, use `dispositivos`.

```json
{
  "materia": "CPC",
  "temas": [
    { "id": "cpc.atos", "nome": "Comunicação dos atos processuais", "filhos": [
      { "id": "cpc.atos.citacao", "nome": "Citação", "filhos": [
        { "id": "cpc.atos.citacao.eletronica", "nome": "Citação eletrônica" },
        { "id": "cpc.atos.citacao.hora-certa", "nome": "Citação com hora certa" }
      ]}
    ]}
  ]
}
```

### Edital (`editais/tj-sp/oficial-de-justica/2026/edital.json`)

Exemplo real: ver o arquivo completo, montado a partir do Anexo VIII do edital do TJ-SP. Resumo da forma:

```json
{
  "id": "tj-sp/oficial-de-justica/2026",
  "orgao": "TJ-SP", "cargo": "Oficial de Justiça", "cargo_curto": "Oficial",
  "banca": "Vunesp", "prova": "2027-03-14", "legislacao_ate": "2026-10-14",
  "objetiva": { "formato": "me", "questoes": 70, "duracao_min": 300,
                "duracao_inclui": "Inclui a discursiva... (Cap. IX, item 2).", "escala": 10, "minimo_total": 0.5 },
  "discursiva": { "tipo": "questoes", "questoes": 2, "escala": 40, "minimo": 24 },
  "blocos": [
    { "id": "II", "nome": "Conhecimentos Específicos", "questoes": 40, "minimo": 0.5, "eliminatorio": true,
      "cobertura": [
        { "materia": "processo-penal", "normas": { "CPP": ["240-250", "283-303"], "L9099": ["60-62"] } }
      ] },
    { "id": "III", "nome": "Conhecimentos Gerais", "questoes": 15, "minimo": null,
      "cobertura": [
        { "materia": "raciocinio-logico", "questoes": 4, "temas": ["raciocinio-logico.estruturas"] }
      ] }
  ]
}
```

- Intervalos incluem os artigos com letra no meio (`"396-396-A"`, `"994-1091-A"`); `"*"` é a norma inteira.
- `questoes` dentro de uma cobertura é opcional, para quando o edital divide o bloco (3 de Matemática e 4 de Raciocínio Lógico).
- `legislacao_ate`: a legislação vale como estava na publicação do edital.
- `objetiva.duracao_min`: duração oficial da prova, em minutos; `objetiva.duracao_inclui` diz se esse tempo inclui a redação ou a discursiva, citando o item do edital. O Simulado usa os dois.
- A nota do Simulado lê `objetiva.escala`, `minimo_total` (fração da nota no conjunto) ou `media_ponderada` + `minimo_media`, e de cada bloco `peso`, `minimo` e `eliminatorio`.
- `cargo_curto`: rótulo curto do cargo ("Oficial", "Escrevente"); o app mostra o edital sempre como órgão + cargo curto ("TJ-SP Escrevente").
- `"*"` numa norma (`"CPC": ["*"]`) diz que o edital cobra a norma sem listar artigos, como faz o TRF3. Aí a relevância vem dos **temas**, e a norma só confirma.
- `destaques`: dispositivos que o edital cita nominalmente (`"CPP 245"`, `"CPC 252-254"`). Não mudam a relevância, mas sobem a prioridade de estudo.
- Intervalos que não estão escritos no edital, e sim deduzidos do texto dele, ficam explicados em `observacao`.

### Pastas

Nomes em minúsculas, sem acento, com hífens. O identificador de uma prova ou edital é o próprio caminho.

```
provas/
  vunesp/
    tj-sp/
      oficial-de-justica/
        2023/   prova.json  questoes.json  texto.txt
        2024/   prova.json  questoes.json  texto.txt
  fcc/
    trf3/
      analista-judiciario-oficial-de-justica/
        2019/   ...
editais/
  trf3/oficial-de-justica-avaliador-federal/2026/edital.json
  tj-sp/oficial-de-justica/2026/edital.json
```

A banca vem primeiro nas provas porque o estilo da banca é o que mais pesa no estudo, e o ano por último deixa as provas do mesmo cargo lado a lado. O edital pertence ao órgão (a banca pode mudar de um concurso para outro), então ela é um campo dentro dele. Duas aplicações no mesmo ano viram pastas irmãs: `2024`, `2024-reaplicacao`.

### Prova (`provas/vunesp/tj-sp/oficial-de-justica/2024/prova.json`)

```json
{
  "id": "vunesp/tj-sp/oficial-de-justica/2024",
  "banca": "Vunesp", "orgao": "TJ-SP", "cargo": "Oficial de Justiça", "ano": 2024,
  "aplicacao": "2024-12-15",
  "caderno": "TJSP2403/001",
  "gabarito": "resolvido",            // "oficial" | "definitivo" | "resolvido" (pela lei, sem oficial)
  "anuladas": [],
  "blocos": [
    { "id": "I", "nome": "Língua Portuguesa", "questoes": "1-20" },
    { "id": "II", "nome": "Conhecimentos Específicos", "questoes": "21-78" },
    { "id": "III", "nome": "Conhecimentos Gerais", "questoes": "79-100",
      "materias": { "Atualidades": "79-82", "Matemática": "83-86" } }
  ],
  "texto": "texto.txt"
}
```

`blocos` segue a capa e os títulos do caderno (faixas de números, sem sobreposição); o Simulado mostra o resultado da prova anterior por bloco. `materias` é opcional.

### Questão (`provas/vunesp/tj-sp/oficial-de-justica/2024/questoes.json`)

As três etiquetas ficam assim: **temas** e **dispositivos** na questão; **banca** (com órgão, cargo e ano) herdada da prova.

**Múltipla escolha**

```json
{
  "id": "vunesp/tj-sp/oficial-de-justica/2024#43",
  "tipo": "me",
  "numero": 43,
  "texto_base": null,
  "enunciado": "A Prefeitura de um determinado Município...",
  "alt": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
  "gab": "D",
  "temas": ["cpc.intervencao.denunciacao"],
  "dispositivos": ["CPC 125 §1º", "CPC 1.015 IX", "CF 37 §6º"],
  "exp": "..."
}
```

**Certo/Errado** (Cebraspe): itens agrupados pelo texto-base, cada item com seu gabarito e suas etiquetas. A nota segue a regra da banca: **uma errada anula uma certa**, e deixar em branco vale zero.

```json
{
  "id": "cebraspe/<órgão>/<cargo>/2024#bloco-3",
  "tipo": "ce",
  "texto_base": "Joana, servidora pública...",
  "itens": [
    { "numero": 51, "enunciado": "...", "gab": "C", "temas": ["adm.servidores.posse"], "dispositivos": ["L8112 13"] },
    { "numero": 52, "enunciado": "...", "gab": "E", "temas": ["adm.servidores.exercicio"], "dispositivos": ["L8112 15 §2º"] }
  ]
}
```

**Discursiva / estudo de caso**

```json
{
  "id": "vunesp/tj-sp/oficial-de-justica/2023#d1",
  "tipo": "disc",
  "enunciado": "...",
  "limite_linhas": 30,
  "max": 40,
  "criterios": [
    { "descricao": "Identifica a citação com hora certa (CPC 252–254)", "pontos": 10 },
    { "descricao": "Indica o termo inicial do prazo (CPC 231, II)", "pontos": 5 }
  ],
  "padrao_resposta": "...",
  "temas": ["cpc.atos.citacao.hora-certa"],
  "dispositivos": ["CPC 252", "CPC 253", "CPC 254", "CPC 231 II"]
}
```

**Autoral**: o mesmo formato, em `autorais/`, com `"autoral": true` e `"estilo": "Vunesp"`. O filtro por banca inclui ou exclui as autorais conforme você escolher.

### Formato dos dispositivos

Uma norma reduzida e um caminho, sempre do mesmo jeito, para dar para agrupar ("todas as questões sobre o CPC 246"):

| Norma | Sigla | Exemplo |
|---|---|---|
| Constituição | `CF` | `CF 5 XXXI` |
| Código de Processo Civil | `CPC` | `CPC 246 §1º-A` |
| Código de Processo Penal | `CPP` | `CPP 362 p.ú.` |
| Leis | `L<número>` | `L8112 13 §6º`, `L6830 7 III` |
| Código Civil e LINDB | `CC`, `LINDB` | `CC 1767` |
| Código Penal | `CP` | `CP 330` |
| Resolução do CNJ | `CNJ-R<número>` | `CNJ-R354 8` |
| Normas da Corregedoria SP | `NSCGJ` | `NSCGJ 1027` (Tomo I; artigo) |

## O app

Rotas em `web/src/app/`:

- **Painel** (`/`): placar por edital (blocos, cortes e pesos calculados pela interseção de temas e dispositivos), por matéria, temas fracos e evolução por sessão. Um edital cuja prova passou sai sozinho.
- **Sessão** (`/sessao`): sessão automática na ordem
  1. revisões vencidas (a mais atrasada primeiro);
  2. temas fracos, até ~40% da sessão;
  3. nunca vistas do edital de prova mais próxima, depois dos outros ativos;
  sem repetir questões de sessões abertas. Depois da entrega: gabarito, comentário por alternativa e agendamento da revisão.
- **Revisões** (`/revisoes`): o calendário de revisão (errou: 1 dia; acertou: 1, 3, 7, 15, 30, 60).
- **Treino** (`/treino`): cada alternativa marcada em `vf` vira um card de verdadeiro ou falso, com a mesma escada.
- **Simulados** (`/simulados`), por edital ativo:
  - **do edital**: completo ou reduzido (metade de cada bloco, para cima). Cada bloco tem as questões do edital; nas matérias com cota (`cobertura[].questoes`) vale a cota, e nas outras as vagas são repartidas em partes iguais entre as matérias (maior resto); a matéria que não tem questões suficientes no banco cede a vaga às outras. Entram só relevantes, sem anuladas, desatualizadas nem discursivas; primeiro as nunca respondidas, depois as respondidas há mais tempo; textos-base juntos. Se o banco não tem o bloco inteiro, o simulado sai com o que houver e avisa;
  - **prova anterior** do mesmo órgão: inteira, na ordem original, sem discursivas; anuladas contam como acerto para todos;
  - cronômetro regressivo (só tempo ativo, com pausa registrada; ao zerar, entrega sozinho), grade das questões com respondidas, em branco e para revisar; resultado por bloco, nota final pela regra do edital ("Habilitado" ou "Eliminado no Bloco X"), tempo e revisão questão por questão. As respostas entram no placar e nas revisões.
- **Banco** (`/banco`): filtros por edital, banca, prova, matéria, tema e situação, e "Praticar estas".
- **Lei seca** (`/lei`): os artigos que cada bloco do edital cobra, no texto vigente (`leis/`), e cada norma inteira com busca (`/lei?n=CPC#a-246`). Depois da correção, cada dispositivo citado pela questão abre o artigo ali mesmo.
- **Ajustes** (`/ajustes`): editais ativos, tamanho da sessão, exportar, importar e apagar o progresso.

Ainda não exibidos: Certo/Errado e discursiva.

## Para um colega começar

Basta abrir o app publicado. Para contribuir com provas ou editais: cadastrar em `editais/` ou `provas/` seguindo o `AGENTS.md` e abrir um pull request; a Vercel gera uma prévia.

## Fases

| Fase | Situação |
|---|---|
| 1. **Fundação**: esquemas, taxonomia, editais do TRF3 e do TJ-SP, validador | feita |
| 2. **Banco real**: Vunesp TJ-SP 2023 e 2024, FCC TRF3 2019, com gabaritos definitivos e figuras | feita (262 itens, 0 pendências) |
| 3. **Painel v2** (Artifact): placar por edital, sessão automática, revisões, banco, discursiva | substituída pela fase 4 |
| 4. **App web** (`web/`, Vercel): o painel sem Claude, com progresso no navegador | esqueleto feito |

Próximos passos: Certo/Errado e discursiva no app, login e banco para sincronizar o progresso, e mais provas.
