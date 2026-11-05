# Arquitetura do framework de estudo para concursos

Proposta para transformar o `public-prep` num **template**: cada pessoa copia o repositório, cadastra os editais dos seus concursos e estuda com um painel próprio. O método (como montar sessões, corrigir e revisar) vem junto, legível em arquivos, não escondido num prompt.

## Decisões já tomadas

| Pergunta | Decisão |
|---|---|
| Como um colega usa | **Cada um com sua cópia** do template. Melhorias no banco de questões voltam por pull request. |
| Quem monta a sessão | **O painel e o Claude.** O painel monta sozinho as sessões de revisão a partir do banco; Claude escreve as mini-aulas, marca as provas novas e corrige as discursivas. Quem não usa Claude ainda consegue estudar. |
| Visibilidade | **Repositório privado**, compartilhado por convite. Pode guardar o texto integral das provas. |
| Formatos | **Múltipla escolha (A–E), Certo/Errado e discursiva/estudo de caso.** |
| Etiquetas | **Temas** (em níveis) e **dispositivos** citados, por questão. **Banca** vem da prova. A relevância para cada concurso é **calculada**, nunca etiquetada. |
| Níveis de tema | Matéria e, abaixo dela, **até 3 níveis**. O detalhe mais fino fica nos dispositivos. |
| Normas que renumeram (NSCGJ) | Tema normal; dispositivo por **tomo, capítulo e seção**; a prova registra a data de aplicação. |
| Dificuldade | **Personalizada**: calculada pelo histórico de cada pessoa, guardada só no painel dela. |
| Pastas | `provas/<banca>/<órgão>/<cargo>/<ano>/` e `editais/<órgão>/<cargo>/<ano>/`. |
| Ponto de partida | **Do zero**, no branch `develop`, que depois passa a ser a `main`. |

## A ideia central: etiquetar pelo conteúdo, calcular a relevância

Cada questão é etiquetada **uma vez**, pelo que ela trata. Cada edital lista os temas que cobra. A questão conta para um concurso quando algum tema dela está no edital.

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

### Edital (`editais/trf3/oficial-de-justica-avaliador-federal/2026/edital.json`)

O edital lista temas em qualquer nível: listar `cpc.atos` cobre tudo abaixo dele.

```json
{
  "id": "trf3/oficial-de-justica-avaliador-federal/2026",
  "orgao": "TRF3", "cargo": "Oficial de Justiça Avaliador Federal", "banca": "Vunesp",
  "prova": "2027-01-31",
  "formato": "multipla-escolha",
  "blocos": [
    { "id": "gerais", "nome": "Conhecimentos Gerais", "questoes": 24, "peso": 1, "minimo": 12,
      "temas": ["portugues", "rl", "etica.improbidade", "pcd"] },
    { "id": "especificos", "nome": "Conhecimentos Específicos", "questoes": 36, "peso": 2, "minimo": 18,
      "temas": ["const", "adm", "cpc", "cpp", "trib", "prev"] }
  ],
  "discursiva": { "tipo": "estudo-de-caso", "max": 10, "minimo": 5, "linhas": 30 }
}
```

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
| Constituição | `CF` | `CF 5º XXXI` |
| Código de Processo Civil | `CPC` | `CPC 246 §1º-A` |
| Código de Processo Penal | `CPP` | `CPP 362 p.ú.` |
| Leis | `L<número>` | `L8112 13 §6º`, `L6830 7º III` |
| Normas da Corregedoria SP | `NSCGJ` | `NSCGJ T1 C6 S4` (tomo, capítulo, seção) |

## O painel

O painel continua sendo um único artifact com banco, agora genérico:

- **Carrega** a taxonomia, os editais e o banco de questões dos arquivos publicados com ele (`dados/catalogo.json` e um `dados/provas/<id>.json` por prova, gerados pelo script a partir do repo).
- **Placar por edital**: blocos, cortes e pesos calculados pela interseção de temas, com uma chave para cada edital ativo. Um edital cuja prova passou sai da chave sozinho.
- **Sessão automática** ("Revisar agora"): escolhe questões pela ordem
  1. revisões vencidas (questões erradas, em +1, +3, +7, +15 e +30 dias);
  2. temas fracos, com peso pelo bloco do edital mais próximo;
  3. temas ainda não vistos que o edital cobre;
  nunca repete questão real antes do prazo de revisão, e respeita filtros (banca, edital, matéria).
- **Sessão do Claude**: quando existe, aparece primeiro, com a mini-aula.
- **Três formatos** na tela: A–E, C/E (com a nota líquida Cebraspe) e discursiva (campo de texto e contador de linhas; a correção fica pendente até Claude corrigir pelos critérios).

### Onde fica cada dado

| Dado | Onde | Tamanho |
|---|---|---|
| Questões, provas, taxonomia, editais | **arquivos publicados com o painel** (vindos do repo) | ~2 KB por questão; 10 mil questões ≈ 20 MB, dentro dos 256 MB por versão |
| `sessoes/<id>` (ids das questões e mini-aula) | banco do painel | 1 por dia |
| `respostas/<id>` | banco do painel | 1 por dia |
| `estado/questoes` (revisão espaçada e dificuldade pessoal, agregadas) | banco do painel | poucos documentos |
| `meta/painel`, `meta/revisoes` | banco do painel | 2 |

O banco do artifact aceita **25.000 documentos** de até **256 KB**. Com as questões fora dele, um ano de estudo diário usa menos de mil documentos. Uma questão nova entra no painel com um commit no repo e uma republicação dos arquivos; o progresso no banco não é tocado.

## Para um colega começar

1. Copiar o repositório (template).
2. Cadastrar os editais em `editais/` (Claude ajuda a partir do PDF do edital, ligando cada item do conteúdo programático a temas da taxonomia).
3. Rodar o script de importação, que cria o painel do colega com o banco já carregado.
4. Estudar. Provas novas etiquetadas por qualquer um podem voltar ao template por pull request.

## Ponto de partida

O framework começa **do zero no branch `develop`**, sem as sessões e o painel atuais. Enquanto isso, a `main` segue com o estudo do dia a dia (painel único, sessão 0015). Quando a `develop` tiver painel e banco funcionando, ela passa a ser a `main`, e o histórico atual fica num branch de arquivo (`legado`).

O que é reaproveitado como **dado de entrada**, não como estrutura: o texto da prova TJ-SP 2024 e o conhecimento dos dois editais.

## Fases

1. **Fundação**: esquemas, taxonomia das matérias dos dois editais, editais do TRF3 e do TJ-SP e script de validação.
2. **Banco real**: etiquetar a prova TJ-SP 2024 inteira (100 questões) e a TJ-SP 2023; depois FCC TRF3 2019 para os temas só do TRF3.
3. **Painel v2**: placar por edital calculado por tema, sessão automática, C/E e discursiva.
4. **Template**: `METODO.md`, guia para colegas e script de criação de painel.
