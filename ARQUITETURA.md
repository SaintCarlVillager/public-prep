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
| **Taxonomia** | a árvore de temas de cada matéria | `taxonomia/*.json` |
| **Editais** | data, blocos, pesos, cortes e temas cobertos | `editais/*.json` |
| **Provas** | metadados da prova e suas questões etiquetadas | `provas/<id>/` |
| **Questões autorais** | as criadas por Claude, quando falta questão real | `autorais/*.json` |
| **Método** | as regras de professor | `METODO.md` e `CLAUDE.md` |
| **Candidato** | sessões, respostas, revisões e temas fracos | banco do painel (privado) |
| **Painel** | a interface de estudo | `painel/` |

O **repositório é a fonte de verdade**: legível, versionado, revisável. Um script valida tudo e gera o pacote que o painel carrega. O **banco do painel** guarda o banco de questões (copiado do repo) e o progresso de quem estuda.

## Esquemas

### Taxonomia (`taxonomia/cpc.json`)

Árvore de até 3 níveis. O identificador é um caminho com pontos, estável para sempre (o nome exibido pode mudar).

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

### Edital (`editais/trf3-2026-oja.json`)

O edital lista temas em qualquer nível: listar `cpc.atos` cobre tudo abaixo dele.

```json
{
  "id": "trf3-2026-oja",
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

### Prova (`provas/vunesp-2024-tjsp-oj/prova.json`)

```json
{
  "id": "vunesp-2024-tjsp-oj",
  "banca": "Vunesp", "orgao": "TJ-SP", "cargo": "Oficial de Justiça", "ano": 2024,
  "caderno": "TJSP2403/001",
  "gabarito": "resolvido",            // "oficial" | "definitivo" | "resolvido" (pela lei, sem oficial)
  "anuladas": [],
  "texto": "provas/vunesp-2024-tjsp-oj/texto.txt"
}
```

### Questão (`provas/vunesp-2024-tjsp-oj/questoes.json`)

As três etiquetas ficam assim: **temas** e **dispositivos** na questão; **banca** (com órgão, cargo e ano) herdada da prova.

**Múltipla escolha**

```json
{
  "id": "vunesp-2024-tjsp-oj#43",
  "tipo": "me",
  "numero": 43,
  "texto_base": null,
  "enunciado": "A Prefeitura de um determinado Município...",
  "alt": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
  "gab": "D",
  "temas": ["cpc.intervencao.denunciacao"],
  "dispositivos": ["CPC 125 §1º", "CPC 1.015 IX", "CF 37 §6º"],
  "exp": "...",
  "dificuldade": null
}
```

**Certo/Errado** (Cebraspe): itens agrupados pelo texto-base, cada item com seu gabarito e suas etiquetas. A nota segue a regra da banca: **uma errada anula uma certa**, e deixar em branco vale zero.

```json
{
  "id": "cebraspe-2024-xxx#bloco-3",
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
  "id": "vunesp-2023-tjsp-oj#d1",
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
| Normas da Corregedoria SP | `NSCGJ` | `NSCGJ I.VI.?` |

## O painel

O painel continua sendo um único artifact com banco, agora genérico:

- **Carrega** do repositório a taxonomia, os editais e o banco de questões (importados pelo script).
- **Placar por edital**: blocos, cortes e pesos calculados pela interseção de temas, com uma chave para cada edital ativo. Um edital cuja prova passou sai da chave sozinho.
- **Sessão automática** ("Revisar agora"): escolhe questões pela ordem
  1. revisões vencidas (questões erradas, em +1, +3, +7, +15 e +30 dias);
  2. temas fracos, com peso pelo bloco do edital mais próximo;
  3. temas ainda não vistos que o edital cobre;
  nunca repete questão real antes do prazo de revisão, e respeita filtros (banca, edital, matéria).
- **Sessão do Claude**: quando existe, aparece primeiro, com a mini-aula.
- **Três formatos** na tela: A–E, C/E (com a nota líquida Cebraspe) e discursiva (campo de texto e contador de linhas; a correção fica pendente até Claude corrigir pelos critérios).

### Banco do painel

| Caminho | Conteúdo | Quantidade esperada |
|---|---|---|
| `questoes/<id>` | uma questão (ou um bloco C/E) | ~2 KB cada; até milhares |
| `meta/catalogo` | taxonomia, editais e lista de provas | 1 |
| `sessoes/<id>` | sessão (lista de ids de questão e mini-aula) | 1 por dia |
| `respostas/<id>` | respostas de uma sessão | 1 por dia |
| `estado/questoes` | revisão espaçada por questão, agregada | poucos documentos |
| `meta/painel`, `meta/revisoes` | fracos, discursivas e fila | 2 |

Capacidade do banco: **25.000 documentos** de até **256 KB** cada. Um ano de estudo diário com um banco de 10 mil questões usa menos da metade. O estado da revisão espaçada fica agregado (não um documento por resposta) para não crescer sem limite.

## Para um colega começar

1. Copiar o repositório (template).
2. Cadastrar os editais em `editais/` (Claude ajuda a partir do PDF do edital, ligando cada item do conteúdo programático a temas da taxonomia).
3. Rodar o script de importação, que cria o painel do colega com o banco já carregado.
4. Estudar. Provas novas etiquetadas por qualquer um podem voltar ao template por pull request.

## Migração do que existe hoje

- As 4 sessões do painel único (0013, 0014, TRF3·01, 0015) viram questões etiquetadas no banco; as sessões passam a apontar para elas por id.
- As etiquetas de concurso (`concursos`) saem; a relevância vem dos editais do TRF3 e do TJ-SP.
- O histórico 0001–0012, que só existe agregado por matéria, fica como está (`base`).
- O painel atual continua no mesmo link; os dados de progresso são preservados.

## Fases

1. **Fundação**: esquemas, taxonomia das matérias dos dois editais, editais do TRF3 e do TJ-SP, script de validação e migração das questões já usadas.
2. **Banco real**: etiquetar a prova TJ-SP 2024 inteira (100 questões) e a TJ-SP 2023; depois FCC TRF3 2019 para os temas só do TRF3.
3. **Painel v2**: placar por edital calculado por tema, sessão automática, C/E e discursiva.
4. **Template**: `METODO.md`, guia para colegas e script de criação de painel.

## Em aberto

- **Profundidade da taxonomia**: 3 níveis bastam? Mais fundo dá estatística mais fina, mas etiquetar fica mais lento e mais inconsistente.
- **Normas da Corregedoria (NSCGJ)**: a numeração muda com frequência; talvez etiquetar por capítulo e não por artigo.
- **Dificuldade**: calcular pelo seu histórico de acertos (e dos colegas, se um dia compartilharem estatísticas) ou deixar em branco.
