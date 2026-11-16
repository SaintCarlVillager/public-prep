# AGENTS.md

Instruções para qualquer agente de IA (Claude, Codex, Copilot…) que trabalhe neste repositório. Converse e escreva em **português do Brasil**.

## O que é

Um framework de estudo para concursos públicos: **provas reais etiquetadas** por tema e dispositivo, **editais** que dizem o que cada concurso cobra, e um **painel** que monta sessões, corrige e agenda revisões. O desenho completo está em [`ARQUITETURA.md`](ARQUITETURA.md); o visual do painel, em [`DESIGN.md`](DESIGN.md).

## Mapa

| Caminho | O quê |
|---|---|
| `taxonomia/<matéria>.json` | árvore de temas (matéria + até 3 níveis) |
| `normas/normas.json` | siglas das normas usadas nos dispositivos |
| `editais/<órgão>/<cargo>/<ano>/edital.json` | o que o concurso cobra, blocos, notas de corte; PDFs ao lado |
| `provas/<banca>/<órgão>/<cargo>/<ano>/` | `prova.json` (metadados e gabarito), `questoes.json`, `texto.txt`, PDFs |
| `scripts/validar.py` | validação de tudo acima |
| `scripts/empacotar.py` | gera os dados que o painel carrega |
| `painel/index.html` | o painel (Artifact do claude.ai) |
| `estudo/` | dados do candidato (progresso, link do painel) |

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
- `desatualizada`: texto dizendo por que a resposta oficial não vale mais hoje (lei nova, emenda). O painel avisa o candidato.
- `imagens`: recortes de figura da prova, relativos à pasta da prova (`["figuras/q84.png"]`).
- `anulada`: `true` quando a banca anulou; `gab` guarda o gabarito preliminar.
- `vf`: cada alternativa como card de verdadeiro/falso do **Treino** (`{"A": false, "B": true, "C": false, "D": null, "E": false}`). `true`/`false` é o valor de verdade da afirmação lida junto com o enunciado; `null` deixa a alternativa fora do treino (não se sustenta sozinha). Os valores **saem do gabarito oficial**, nunca de opinião: na questão que pede a correta, só o gabarito é `true`; na que pede a incorreta ou "exceto", só o gabarito é `false`. O gabarito é sempre marcado (é ele que diz o sentido da questão). Fica sem `vf`: questão anulada, desatualizada, de lacunas, com alternativas que só fazem sentido entre si ("I e II, apenas", "todas as anteriores") ou com gabarito discutível. O validador confere tudo isso contra o gabarito.

**Destaques gráficos da prova** (termo em negrito ou sublinhado a que o enunciado se refere): `**negrito**` e `__sublinhado__`. Nunca HTML. Figuras, gráficos e tabelas que o texto não reproduz são descritos entre colchetes (`[Gráfico de setores: …]`) e registrados em `pendencias`.

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

### Publicar o painel
1. `python3 scripts/empacotar.py` (valida e gera `painel/dados/`: catálogo, uma prova por arquivo, figuras).
2. Publique `painel/index.html` como Artifact do claude.ai com a capability `db` e **todos os arquivos de `painel/dados/`** como arquivos do artifact (caminhos `dados/...`). Republique no **mesmo link** registrado em `estudo/progresso.md`, para não perder o progresso salvo no banco.
3. O progresso (sessões, respostas, revisões, discursivas) fica no banco do artifact, não no repositório.

### Estudo do dia a dia (com o candidato)
Comece por `estudo/progresso.md`. Banco do painel (ferramenta de dados do artifact):

| Documento | Conteúdo |
|---|---|
| `meta/config` | editais ativos e tamanho da sessão |
| `sessoes/<id>` | `{titulo, data, origem: "claude"|"auto", aula, questoes: [ids], inline: [questões autorais]}` |
| `respostas/<id>` | respostas entregues (`{idQuestão: letra}`), acertos, total |
| `estado/<prova>` | por questão: tentativas, acertos, última, próxima revisão, intervalo |
| `discursivas/<id>` | texto do candidato; `nota` e `feedback` preenchidos na correção |
| `meta/historico` | agregados do painel antigo |
| `meta/claude` | configuração da correção automática |
| `claude/<id>` | trava e situação do pedido de correção (`pedido`, `em andamento`, `pronto`, `erro`) |
| `correcoes/<id>` | comentário do Claude sobre a entrega e id da próxima sessão |
| `treino/<prova>` | cards de verdadeiro/falso por `"<id da questão>\|<letra>"`: tentativas, acertos, última, próxima revisão, intervalo |

Quando o candidato disser **"corrigi a <sessão>"**:
1. Leia `respostas/<id>` e as questões; para cada erro, diga o que marcou, o certo e a regra em uma linha.
2. Monte a próxima sessão com **exatamente o número de questões configurado em `meta/config.tamanho_sessao`** (leia antes de montar; o candidato muda esse número no painel) e com **questões reais do catálogo** (temas fracos, revisões vencidas, nunca vistas relevantes ao edital mais próximo; sem repetir questões de sessões ainda abertas), com mini-aula começando pelos erros; grave em `sessoes/<id>` com `origem: "claude"`. Autoral só quando faltar questão real, em `inline` com `autoral: true`.
3. Discursiva entregue: corrija pelos critérios do edital, grave `nota` e `feedback` em `discursivas/<id>`. Cobre texto corrido e uso do espaço.
4. Atualize o placar e os temas fracos em `estudo/progresso.md` e faça o commit.

### Correção automática
Há dois modos, escolhidos em `meta/claude` no banco do painel:

- **`"modo": "agendado"`** (o que está em uso): uma **tarefa agendada** do claude.ai ("Correção automática do public-prep", duas vezes por dia, por volta das 7h e das 21h, horário de Brasília) abre uma sessão do Claude Code, anexa este repositório e corrige o que estiver pendente: `respostas/<id>` sem `claude/<id>` com `status: "pronto"`, e `discursivas/<id>` com `nota: null`. Sem pendência, ela encerra sem escrever nada. O painel mostra "na próxima rodada agendada" no cartão da sessão.
- **Pelo painel, na hora da entrega:** o painel abriria a sessão sozinho pelo conector **Claude Code Remote** (`create_session`). Exige que esse conector exista na conta do claude.ai; na conta atual ele não existe, e a página recebe "connector access isn't confirmed". Para voltar a este modo, declare a capability `mcp` com esse conector ao publicar e tire `"modo": "agendado"`.

Em qualquer dos modos, a sessão que corrige:

1. Siga a rotina acima ("corrigi a <sessão>") para a entrega indicada.
2. Grave o comentário em `correcoes/<id>`: `{"texto": "markdown curto: nota, cada erro com o que marcou, o certo e a regra em uma linha", "proxima": "<id da sessão nova>", "criadaEm": ISO}`. O painel mostra esse texto no cartão da sessão entregue, com o botão "Abrir a próxima sessão".
3. Discursiva: grave `nota`, `max` e `feedback` em `discursivas/<id>`.
4. Atualize `estudo/progresso.md` (e `estudo/sessoes/<id>.json` da sessão nova), valide, commit e push na `main`.
5. Por último, `claude/<id>`: `{"status": "pronto"}`; se falhar, `{"status": "erro", "motivo": "…"}`.
6. Mexa só no banco do painel e em `estudo/`. Se outra sessão já estiver corrigindo a mesma entrega (`claude/<id>` com `status: "pronto"`), pare.

Configuração em `meta/claude`: `{"ativo": true, "modo": "agendado", "rodadas": "texto mostrado no painel", "environment_id": "env_…", "source_url": "https://github.com/<dono>/<repo>", "painel_url": "<link do painel>", "permission_mode": "auto", "modelo": opcional}`. Com `ativo: false` e sem `modo`, o painel não menciona correção automática e mostra só o gabarito. A instrução completa da rodada agendada está na própria tarefa agendada; se mudar a rotina aqui, atualize também a tarefa.

## Subagentes

Use subagentes **sempre que a tarefa puder ser dividida** ou exigir ler muito material (provas inteiras, editais, leis). Isso mantém o contexto principal limpo e acelera o trabalho.

### Fluxo: cada subagente abre o seu PR

1. **O orquestrador recorta** a tarefa para que cada subagente mexa em **arquivos diferentes** (veja abaixo) e dá a cada um um briefing **autocontido**: caminhos, formato, regras deste arquivo, nome do branch e o que pôr no PR.
2. **O subagente trabalha num branch próprio** (`agente/<tarefa>`, ex. `agente/tjsp-2023-bloco-II`), valida com `python3 scripts/validar.py`, faz o commit, o push e abre um **PR em rascunho** para a `main`. Na descrição do PR: o que fez, contagens, pendências, discordâncias com o gabarito e **temas ou normas que sugere criar**.
3. **O orquestrador revisa**: faz checkout do branch e roda `python3 scripts/validar.py` e `python3 scripts/empacotar.py` (os dois têm de passar); ele confere por amostragem (gabarito × explicação, dispositivos, transcrição contra o PDF) e, se precisar, **pede ajustes ao mesmo subagente**, que corrige no mesmo branch.
4. **O orquestrador faz o merge** quando estiver tudo certo, e só ele mexe nos arquivos compartilhados.

**Arquivos compartilhados** (`taxonomia/`, `normas/normas.json`, `AGENTS.md`, `scripts/`, `painel/`, `estudo/`): subagente não edita. Precisa de tema ou norma nova? Sugere no PR; o orquestrador cria num PR próprio, antes ou junto do merge.

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
| Etiquetagem jurídica com explicação, divergência com o gabarito, redação de mini-aulas, correção de discursivas, código do painel, decisões de arquitetura | o mais capaz | médio ou alto |

- Na dúvida, comece pelo nível mais barato que provavelmente resolve e **suba se o resultado vier fraco**.
- O orquestrador **confere por amostragem** o trabalho de modelos mais leves (gabarito, dispositivos, transcrição) antes de juntar.
- Tarefas que mexem em muitas questões de uma vez ou que ninguém vai revisar linha a linha pedem o modelo mais capaz.

## Git

- `main`: o framework e o estudo. O conteúdo anterior à reestruturação está no branch `legado`.
- Mensagens de commit em português, no imperativo ou descritivas ("Prova TJ-SP 2024: Bloco II etiquetado").
- **Subagentes** trabalham em `agente/<tarefa>` e entregam por PR em rascunho; **o orquestrador** revisa e faz o merge (ver "Subagentes").
- Atualizações rotineiras de dados do estudo (`estudo/`, sessões, progresso) podem ir direto para a `main`; mudanças de estrutura, de esquema ou deste arquivo, por pull request.
- Não há checagem automática no GitHub (o GitHub Actions foi desligado para não gerar custo): **antes de cada merge**, quem revisa roda `python3 scripts/validar.py` e `python3 scripts/empacotar.py` no branch do PR.
