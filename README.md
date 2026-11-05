# public-prep

Framework de estudo para concursos públicos: provas reais etiquetadas por tema e dispositivo, editais que dizem o que cada concurso cobra, e um painel que monta sessões, corrige e agenda revisões.

> Branch `develop`: o framework em construção, começando do zero. O estudo do dia a dia continua na `main` até esta branch substituí-la.

Comece por [`ARQUITETURA.md`](ARQUITETURA.md).

## Estrutura (em construção)

| Pasta | Conteúdo |
|---|---|
| `taxonomia/` | árvore de temas por matéria |
| `normas/normas.json` | siglas das normas (`CPC`, `L8112`, `CNJ-R354`…) e seus nomes |
| `editais/<órgão>/<cargo>/<ano>/` | o que cada concurso cobra |
| `provas/<banca>/<órgão>/<cargo>/<ano>/` | provas reais e suas questões etiquetadas |
| `autorais/` | questões criadas quando falta questão real |
| `painel/` | a interface de estudo |

## Validação

```
python3 scripts/validar.py
```

Confere a taxonomia (ids, hierarquia e no máximo 3 níveis abaixo da matéria), as normas e os editais (temas e normas existentes, intervalos de artigos bem escritos, soma de questões por bloco).
