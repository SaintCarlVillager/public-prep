@AGENTS.md

## Só para o Claude

- As regras do projeto estão em `AGENTS.md` (importado acima). Este arquivo só acrescenta o que é específico do Claude Code.
- **Subagentes:** use a ferramenta Agent para dividir trabalho grande (etiquetar blocos de uma prova, ler um edital, conferir leis) e rode-os em paralelo, em segundo plano, quando forem independentes. Siga a seção "Subagentes" do `AGENTS.md`.
- **Subagentes com PR:** dispare-os com `isolation: "worktree"` (cada um ganha a sua cópia do repositório) e em segundo plano. No briefing, diga o branch (`agente/<tarefa>`) e peça o PR em rascunho pela API REST (`gh api repos/<dono>/<repo>/pulls -X POST … -F draft=true`), porque o `gh pr create` não funciona neste ambiente. Para pedir ajuste, continue o mesmo subagente com SendMessage. O merge é seu, depois de rodar o validador e o empacotador no branch do PR e revisar.
- **Roteamento:** na ferramenta Agent, passe `model` conforme a tabela "Roteamento" do `AGENTS.md`: `haiku` para o mecânico, `sonnet` para o intermediário e o modelo padrão (o do orquestrador) só para o que exige mais. Use `effort` (`low`, `medium`, `high`) pela mesma tabela.
- **Painel:** é um Artifact do claude.ai com banco de dados. Antes de mexer no código dele, leia `DESIGN.md`.
