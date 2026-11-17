# ServentIA

Estudo para concursos do Judiciário (repositório `public-prep`) com **provas reais etiquetadas** por tema e dispositivo, **editais** que dizem o que cada concurso cobra, e um **app web** que monta sessões, corrige pelo gabarito oficial e agenda revisões.

Comece por [`ARQUITETURA.md`](ARQUITETURA.md). Agentes de IA: leiam [`AGENTS.md`](AGENTS.md). Visual: [`DESIGN.md`](DESIGN.md).

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `taxonomia/` | árvore de temas por matéria |
| `normas/normas.json` | siglas das normas (`CPC`, `L8112`, `CNJ-R354`…) e seus nomes |
| `editais/<órgão>/<cargo>/<ano>/` | o que cada concurso cobra |
| `provas/<banca>/<órgão>/<cargo>/<ano>/` | provas reais e suas questões etiquetadas |
| `scripts/` | `validar.py` e `empacotar.py` |
| `web/` | o app (Next.js, criado com create-t3-app) |

## Rodar o app

Precisa de Node 20+ e Python 3.

```bash
cd web
npm install
npm run dev
```

O `dev` e o `build` rodam antes `python3 ../scripts/empacotar.py`, que valida o repositório e gera `web/public/dados/` (fora do git). Testes da lógica: `npm test`.

O progresso de quem estuda fica **no navegador** (sem login); em Ajustes dá para exportar e importar.

## Publicar na Vercel

1. Importe o repositório na Vercel.
2. Em **Root Directory**, escolha `web`. O framework (Next.js) é detectado sozinho; não há variável de ambiente obrigatória.
3. Cada push na `main` publica; cada pull request ganha uma prévia.

## Validação

```bash
python3 scripts/validar.py
```

Confere a taxonomia, as normas, os editais e as provas (temas e normas existentes, intervalos de artigos, gabaritos, `vf`).

## O que já tem

- **Editais 2026:** TRF3 (Oficial de Justiça Avaliador Federal) e TJ-SP (Oficial de Justiça).
- **Provas etiquetadas:** Vunesp TJ-SP 2023 e 2024 (Oficial de Justiça) e FCC TRF3 2019 (Analista Judiciário – Área Judiciária), com gabaritos definitivos, 262 itens e figuras.
