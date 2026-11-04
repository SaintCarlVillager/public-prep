# Scripts

Fluxo diário (feito por Claude numa sessão):

1. Ler `respostas/<id>` no banco do painel e corrigir.
2. Atualizar `meta/painel` (fracos) e `meta/revisoes`.
3. Escrever `sessoes/<próximo id>.json` aqui e gravar no banco do painel com a ferramenta ArtifactData (`set` em `sessoes/<id>`).
4. Registrar as questões reais usadas em `banco/usadas.md` (`python3 scripts/banco.py`).
5. Commit.
