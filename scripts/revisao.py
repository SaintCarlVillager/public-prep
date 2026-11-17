"""Gera a fila do painel de revisão (revisao/dados/revisao.json).

Uso: python3 scripts/revisao.py

O painel de revisão (revisao/index.html, publicado como Artifact do claude.ai) lista o que
precisa do olho de quem mantém o banco: questões com pendência, questões muito recorridas,
questões desatualizadas, observações e normas cobradas sem lei seca. As decisões ficam no
banco do Artifact (coleção `decisoes`) e o Claude as aplica no repositório (ver AGENTS.md).
"""
import datetime
import glob
import json
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "revisao", "dados", "revisao.json")
MIN_RECURSOS = 100
DISP = re.compile(r"^(?P<sigla>\S+) (?P<art>(?:DT-)?\d+(?:-[A-Z]{1,2})?)")


def ler(caminho):
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def leis():
    return {os.path.splitext(os.path.basename(c))[0]: ler(c) for c in glob.glob(os.path.join(RAIZ, "leis", "*.json"))}


def artigos_citados(q, lei_seca):
    out, vistos = [], set()
    for d in q.get("dispositivos", []):
        m = DISP.match(d)
        if not m or (m["sigla"], m["art"]) in vistos:
            continue
        vistos.add((m["sigla"], m["art"]))
        lei = lei_seca.get(m["sigla"])
        a = next((x for x in lei["artigos"] if x["art"] == m["art"]), None) if lei else None
        out.append({"disp": d, "sigla": m["sigla"], "art": m["art"], "texto": a["texto"] if a else None,
                    "fonte": lei.get("fonte") if lei else None})
    return out


def main():
    normas = ler(os.path.join(RAIZ, "normas", "normas.json"))
    lei_seca = leis()
    itens = []

    for caminho in sorted(glob.glob(os.path.join(RAIZ, "provas", "**", "prova.json"), recursive=True)):
        pasta = os.path.dirname(caminho)
        p = ler(caminho)
        rotulo = f"{p.get('orgao')} {p.get('cargo')} {p.get('ano')}"
        status = (p.get("gabarito") or {}).get("status")
        if status != "definitivo":
            itens.append({"id": f"gabarito:{p['id']}", "cat": "gabarito", "titulo": rotulo,
                          "pergunta": f"Gabarito {status or 'sem status'}: confirmar o definitivo.",
                          "detalhe": (p.get("gabarito") or {}).get("fonte", "")})
        partes = ([os.path.join(pasta, "questoes.json")] if os.path.exists(os.path.join(pasta, "questoes.json")) else []) \
            + sorted(glob.glob(os.path.join(pasta, "questoes", "*.json")))
        textos = {}
        questoes = []
        for parte in partes:
            d = ler(parte)
            textos.update(d.get("textos") or {})
            questoes.extend(d.get("questoes", []))
        for q in sorted(questoes, key=lambda x: (isinstance(x.get("numero"), str), x.get("numero"))):
            base = {
                "prova": rotulo, "numero": q.get("numero"), "arquivo": os.path.relpath(parte if len(partes) == 1 else os.path.join(pasta, "questoes"), RAIZ),
                "q": {k: q.get(k) for k in ("enunciado", "alt", "gab", "exp", "exp_alt", "vf", "temas", "dispositivos",
                                             "pendencias", "observacoes", "desatualizada", "recursos", "anulada", "imagens")},
                "texto": textos.get(q["texto"]) if q.get("texto") else None,
                "artigos": artigos_citados(q, lei_seca),
            }
            titulo = f"{rotulo} · Q{q.get('numero')}"
            if q.get("pendencias"):
                itens.append({**base, "id": f"pendencia:{q['id']}", "cat": "pendencia", "titulo": titulo,
                              "pergunta": "Conferir e resolver a pendência.", "detalhe": " ".join(q["pendencias"])})
            if (q.get("recursos") or 0) >= MIN_RECURSOS:
                itens.append({**base, "id": f"recursos:{q['id']}", "cat": "recursos", "titulo": titulo,
                              "pergunta": f"{q['recursos']} recursos: conferir se a explicação responde à dúvida mais provável.",
                              "detalhe": ""})
            if q.get("desatualizada"):
                itens.append({**base, "id": f"desatualizada:{q['id']}", "cat": "desatualizada", "titulo": titulo,
                              "pergunta": "Questão marcada como desatualizada: conferir o motivo.", "detalhe": q["desatualizada"]})
            if q.get("observacoes"):
                itens.append({**base, "id": f"observacao:{q['id']}", "cat": "observacao", "titulo": titulo,
                              "pergunta": "Ler as observações e dizer se alguma muda a questão.", "detalhe": " ".join(q["observacoes"])})

    for caminho in sorted(glob.glob(os.path.join(RAIZ, "editais", "**", "edital.json"), recursive=True)):
        e = ler(caminho)
        rotulo = f"{e.get('orgao')} {e.get('cargo_curto') or e.get('cargo')}"
        faltam = {}
        for b in e.get("blocos", []):
            for c in b.get("cobertura", []):
                for s, ints in c.get("normas", {}).items():
                    if s not in lei_seca:
                        faltam.setdefault(s, set()).update(ints)
        for s, ints in sorted(faltam.items()):
            itens.append({"id": f"lei:{e['id']}:{s}", "cat": "lei", "titulo": f"{rotulo} · {s}",
                          "pergunta": "Norma cobrada sem lei seca: conferir se a fonte e a versão estão disponíveis.",
                          "detalhe": f"{normas.get(s, s)}. Cobrança no edital: {', '.join(sorted(ints))}."})

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    dados = {"gerado": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
             "itens": itens}
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, separators=(",", ":"))
    por_cat = {}
    for i in itens:
        por_cat[i["cat"]] = por_cat.get(i["cat"], 0) + 1
    print(f"{len(itens)} itens: " + ", ".join(f"{k} {v}" for k, v in sorted(por_cat.items())))
    print(f"{os.path.relpath(SAIDA, RAIZ)}: {os.path.getsize(SAIDA) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
