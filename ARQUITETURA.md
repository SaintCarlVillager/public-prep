# Arquitetura do framework de estudo para concursos

Proposta para transformar o `public-prep` num **template**: cada pessoa copia o repositório, cadastra os editais dos seus concursos e estuda com um painel próprio. O método (como montar sessões, corrigir e revisar) vem junto, legível em arquivos, não escondido num prompt.

## Decisões já tomadas

| Pergunta | Decisão |
|---|---|
| Como um colega usa | **Um só painel, um perfil por pessoa** (a conta do claude.ai de quem abre). O dono compartilha o artifact com nível Contributor; o progresso de cada um é privado, até para o dono. Substitui a decisão anterior, "cada um com sua cópia do template" (17/11/2026). |
| Quem monta a sessão | **O painel.** Ele monta as sessões e as revisões espaçadas; o gabarito, o comentário por alternativa e o Treino substituem a correção pelo Claude, que foi desligada (17/11/2026). Claude continua etiquetando provas e escrevendo comentários no repositório. |
| Visibilidade | **Repositório privado**, compartilhado por convite. Pode guardar o texto integral das provas. |
| Formatos | **Múltipla escolha (A–E), Certo/Errado e discursiva/estudo de caso.** |
| Etiquetas | **Temas** (em níveis) e **dispositivos** citados, por questão. **Banca** vem da prova. A relevância para cada concurso é **calculada**, nunca etiquetada. |
| Níveis de tema | Matéria e, abaixo dela, **até 3 níveis**. O detalhe mais fino fica nos dispositivos. |
| Normas que renumeram (NSCGJ) | Tema normal; dispositivo **por artigo**, como o próprio edital do TJ-SP cita; a prova registra a data de aplicação, e o edital, a data da legislação cobrada. |
| Dificuldade | **Personalizada**: calculada pelo histórico de cada pessoa, guardada só no painel dela. |
| Pastas | `provas/<banca>/<órgão>/<cargo>/<ano>/` e `editais/<órgão>/<cargo>/<ano>/`. |
| Ponto de partida | Construído do zero; o conteúdo anterior ficou no branch `legado`. |

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
| **Candidato** | sessões, respostas, revisões e temas fracos | banco do painel (privado) |
| **Painel** | a interface de estudo | `painel/` |

O **repositório é a fonte de verdade**: legível, versionado, revisável. Um script valida tudo e gera o pacote que o painel carrega. O pacote é **publicado como arquivos junto com o painel** (o artifact aceita até 256 MB por versão e lê os próprios arquivos com `fetch`). O **banco do painel** guarda só o progresso de quem estuda.

### Por que não um banco externo ou um app próprio (por enquanto)

- O artifact **não pode** acessar servidores de fora (Supabase, Postgres etc.): a política de segurança bloqueia. Banco externo implica sair dos artifacts.
- Um app próprio (por exemplo, TanStack Start) dá capacidade ilimitada, busca forte e uso offline, mas traz hospedagem, login, custo e manutenção, e cada colega precisaria subir o seu (ou você hospedaria os dados de todos). Claude também perderia o acesso direto ao painel no fluxo diário.
- Como os dados ficam em **JSON com esquema, no repo**, migrar para um app depois é barato: ele leria os mesmos arquivos. Gatilhos para migrar: banco central com muitos usuários, busca em dezenas de milhares de questões, estudo offline no celular ou colegas que não usam Claude.

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
  "banca": "Vunesp", "prova": "2027-03-14", "legislacao_ate": "2026-10-14",
  "objetiva": { "formato": "me", "questoes": 70, "escala": 10, "minimo_total": 0.5 },
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
  "texto": "texto.txt"
}
```

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

## O painel

O painel continua sendo um único artifact com banco, agora genérico:

- **Carrega** a taxonomia, os editais e o banco de questões dos arquivos publicados com ele (`dados/catalogo.json` e um `dados/provas/<id>.json` por prova, gerados pelo script a partir do repo).
- **Placar por edital**: blocos, cortes e pesos calculados pela interseção de temas, com uma chave para cada edital ativo. Um edital cuja prova passou sai da chave sozinho.
- **Sessão automática** ("Revisar agora"): escolhe questões pela ordem
  1. revisões vencidas (questões erradas, em +1, +3, +7, +15 e +30 dias);
  2. temas fracos, com peso pelo bloco do edital mais próximo;
  3. temas ainda não vistos que o edital cobre;
  nunca repete questão real antes do prazo de revisão, e respeita filtros (banca, edital, matéria).
- **Sessão do Claude**: as antigas, com mini-aula, continuam visíveis; não são mais criadas automaticamente.
- **Treino**: cada alternativa marcada em `vf` vira um card de verdadeiro ou falso, com revisão espaçada própria.
- **Três formatos** na tela: A–E, C/E (com a nota líquida Cebraspe) e discursiva (campo de texto e contador de linhas; depois da entrega, o padrão de resposta e os critérios para autoavaliação).

### Onde fica cada dado

| Dado | Onde | Tamanho |
|---|---|---|
| Questões, provas, taxonomia, editais | **arquivos publicados com o painel** (vindos do repo) | ~2 KB por questão; 10 mil questões ≈ 20 MB, dentro dos 256 MB por versão |
| Progresso de cada pessoa (sessões, respostas, estado das revisões, Treino, discursivas, ajustes) | banco do painel, em `data/users/<id>/` (privado) | ~2 documentos por dia de estudo, por pessoa |

O banco do artifact aceita **25.000 documentos** de até **256 KB**, somando todas as pessoas. Com as questões fora dele, um ano de estudo diário usa menos de mil documentos por pessoa: cabe com folga um grupo de dez colegas. Uma questão nova entra no painel com um commit no repo e uma republicação dos arquivos; o progresso no banco não é tocado.

## Para um colega começar

1. O dono compartilha o painel pelo menu Share do artifact, com nível **Contributor**.
2. O colega abre o link com a própria conta do claude.ai e escolhe, em Ajustes, os editais que estuda.
3. Edital ou prova que ainda não está no banco: o dono cadastra no repositório (Claude ajuda a partir do PDF) e republica o painel; o progresso de ninguém é tocado.

## Ponto de partida

O framework foi construído do zero e substituiu a estrutura anterior. O que havia antes (sessões, painel v1, notas de progresso) está preservado no branch `legado`, e o histórico de estudo foi importado para o banco do painel v2.

## Fases

| Fase | Situação |
|---|---|
| 1. **Fundação**: esquemas, taxonomia, editais do TRF3 e do TJ-SP, validador | feita |
| 2. **Banco real**: Vunesp TJ-SP 2023 e 2024, FCC TRF3 2019, com gabaritos definitivos e figuras | feita (262 itens, 0 pendências) |
| 3. **Painel v2**: placar por edital calculado, sessão automática, revisões, banco filtrável, discursiva | feita para múltipla escolha e discursiva; **Certo/Errado ainda não exibido** |
| 4. **Template**: guia para colegas (README, AGENTS.md), publicação do painel | feita; falta um script que crie o painel de um colega de uma vez |

Próximos passos naturais: mais provas (outras de oficial de justiça da Vunesp e da FCC), Certo/Errado no painel quando entrar uma prova Cebraspe, e a criação automática do painel para quem copiar o template.
