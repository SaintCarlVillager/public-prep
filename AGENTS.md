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
`<SIGLA> <artigo>[ complemento]`, com a sigla registrada em `normas/normas.json` e o número do artigo **sem "º"**: `CF 5 XI`, `CPP 362 p.ú.`, `L8112 13 §6º`, `CNJ-R354 8`, `CPC 1015 IX` (sem ponto de milhar). Parágrafos e incisos seguem a forma usual (`§1º`, `p.ú.`, `IX`). Intervalos em editais: `"240-250"`, `"396-396-A"`, `"*"` para a norma inteira.

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

## Subagentes

Use subagentes **sempre que a tarefa puder ser dividida** ou exigir ler muito material (provas inteiras, editais, leis). Isso mantém o contexto principal limpo e acelera o trabalho.

- Dê a cada subagente um briefing **autocontido**: caminhos dos arquivos, formato de saída, regras acima e o arquivo onde escrever.
- Subagentes **não fazem commit** nem editam o repositório: escrevem num arquivo temporário; quem coordena revisa, junta, valida e faz o commit.
- Peça de volta só um resumo curto (contagens, pendências, problemas), nunca o conteúdo inteiro.
- Bom recorte: um bloco ou matéria de uma prova por subagente; um edital por subagente.

## Git

- `develop`: o framework em construção. `main`: o estudo do dia a dia, até a `develop` substituí-la.
- Mensagens de commit em português, no imperativo ou descritivas ("Prova TJ-SP 2024: Bloco II etiquetado").
- Atualizações rotineiras de dados (provas, questões, editais) podem ir direto para o branch de trabalho; mudanças de estrutura, de esquema ou deste arquivo, por pull request.
