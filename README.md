# public-prep

Framework de estudo para concursos públicos: provas reais etiquetadas por tema e dispositivo, editais que dizem o que cada concurso cobra, e um painel que monta sessões, corrige e agenda revisões.

Comece por [`ARQUITETURA.md`](ARQUITETURA.md). Agentes de IA: leiam [`AGENTS.md`](AGENTS.md). Visual do painel: [`DESIGN.md`](DESIGN.md).

## Estrutura (em construção)

| Pasta | Conteúdo |
|---|---|
| `taxonomia/` | árvore de temas por matéria |
| `normas/normas.json` | siglas das normas (`CPC`, `L8112`, `CNJ-R354`…) e seus nomes |
| `editais/<órgão>/<cargo>/<ano>/` | o que cada concurso cobra |
| `provas/<banca>/<órgão>/<cargo>/<ano>/` | provas reais e suas questões etiquetadas |
| `autorais/` | questões criadas quando falta questão real |
| `painel/` | a interface de estudo (`index.html`) |
| `scripts/` | `validar.py` e `empacotar.py` |
| `estudo/` | dados de quem estuda: progresso e link do painel |

## Validação

```
python3 scripts/validar.py
```

Confere a taxonomia (ids, hierarquia e no máximo 3 níveis abaixo da matéria), as normas e os editais (temas e normas existentes, intervalos de artigos bem escritos, soma de questões por bloco).

## Começar a usar

1. Copie este repositório (template) e troque `estudo/progresso.md` pelo seu.
2. Cadastre o edital do seu concurso em `editais/` (o `AGENTS.md` explica; um agente de IA faz isso a partir do PDF).
3. Acrescente provas da sua banca em `provas/` e etiquete-as.
4. `python3 scripts/empacotar.py` e publique o painel (ver `AGENTS.md`, "Publicar o painel").
5. Estude no painel; peça ao Claude para corrigir as sessões e montar as próximas.

## O que já tem

- **Editais 2026:** TRF3 (Oficial de Justiça Avaliador Federal) e TJ-SP (Oficial de Justiça).
- **Provas etiquetadas:** Vunesp TJ-SP 2023 e 2024 (Oficial de Justiça) e FCC TRF3 2019 (Analista Judiciário – Área Judiciária), com gabaritos definitivos, 262 itens e figuras.
