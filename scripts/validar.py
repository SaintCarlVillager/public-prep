"""Valida taxonomia, normas e editais do framework.

Uso: python3 scripts/validar.py
Sai com código 1 se encontrar erros. Avisos não reprovam.
"""
import glob
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_NIVEIS = 3  # abaixo da matéria
ART = r"\d+(?:-[A-Z]{1,2})?"
INTERVALO = re.compile(rf"^(\*|{ART}(?:-{ART})?)$")
DISPOSITIVO = re.compile(r"^(?P<norma>[A-Z][A-Za-z0-9-]*) (?P<art>\d+(?:-[A-Z]{1,2})?)(?P<resto>(?:[- ].*)?)$")

erros, avisos = [], []


def carregar(caminho):
    try:
        with open(caminho, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        erros.append(f"{os.path.relpath(caminho, RAIZ)}: não é JSON válido ({e})")
        return None


def chave_art(a):
    m = re.match(r"^(\d+)(?:-([A-Z]{1,2}))?$", a)
    return (int(m.group(1)), m.group(2) or "")


def validar_taxonomia():
    temas = {}
    for caminho in sorted(glob.glob(os.path.join(RAIZ, "taxonomia", "*.json"))):
        rel = os.path.relpath(caminho, RAIZ)
        d = carregar(caminho)
        if d is None:
            continue
        materia = d.get("materia")
        if materia != os.path.basename(caminho)[:-5]:
            erros.append(f"{rel}: 'materia' deve ser igual ao nome do arquivo")
        if not d.get("nome"):
            erros.append(f"{rel}: falta 'nome'")

        def visitar(nos, pai, nivel):
            for n in nos:
                i = n.get("id", "")
                if not re.fullmatch(r"[a-z0-9-]+(\.[a-z0-9-]+)*", i):
                    erros.append(f"{rel}: id inválido '{i}'")
                if not i.startswith(pai + ".") or "." in i[len(pai) + 1:]:
                    erros.append(f"{rel}: '{i}' deve ser filho direto de '{pai}'")
                if nivel > MAX_NIVEIS:
                    erros.append(f"{rel}: '{i}' passa de {MAX_NIVEIS} níveis abaixo da matéria")
                if i in temas:
                    erros.append(f"{rel}: id repetido '{i}'")
                if not n.get("nome"):
                    erros.append(f"{rel}: '{i}' sem nome")
                temas[i] = n.get("nome")
                visitar(n.get("filhos", []), i, nivel + 1)

        temas[materia] = d.get("nome")
        visitar(d.get("temas", []), materia, 1)
    if not temas:
        erros.append("taxonomia/: nenhum arquivo encontrado")
    return temas


def validar_normas():
    d = carregar(os.path.join(RAIZ, "normas", "normas.json")) or {}
    for sigla in d:
        if not re.fullmatch(r"[A-Z][A-Za-z0-9-]*", sigla):
            erros.append(f"normas/normas.json: sigla inválida '{sigla}'")
    return d


def validar_dispositivo(texto, normas, onde):
    m = DISPOSITIVO.match(texto)
    if not m:
        erros.append(f"{onde}: dispositivo mal escrito '{texto}' (ex.: 'CPC 246 §1º-A')")
    elif m.group("norma") not in normas:
        erros.append(f"{onde}: norma '{m.group('norma')}' não está em normas/normas.json")


def validar_editais(temas, normas):
    for caminho in sorted(glob.glob(os.path.join(RAIZ, "editais", "**", "edital.json"), recursive=True)):
        rel = os.path.relpath(caminho, RAIZ)
        d = carregar(caminho)
        if d is None:
            continue
        esperado = os.path.relpath(os.path.dirname(caminho), os.path.join(RAIZ, "editais"))
        if d.get("id") != esperado:
            erros.append(f"{rel}: 'id' deve ser '{esperado}' (o caminho da pasta)")
        for campo in ("orgao", "cargo", "banca", "prova", "objetiva", "blocos"):
            if campo not in d:
                erros.append(f"{rel}: falta '{campo}'")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(d.get("prova", ""))):
            erros.append(f"{rel}: 'prova' deve ser uma data AAAA-MM-DD")
        total = 0
        for b in d.get("blocos", []):
            onde = f"{rel} › bloco {b.get('id')}"
            total += b.get("questoes", 0)
            soma_cob = 0
            for c in b.get("cobertura", []):
                m = c.get("materia")
                if m not in temas:
                    erros.append(f"{onde}: matéria '{m}' não existe na taxonomia")
                if not c.get("temas") and not c.get("normas"):
                    erros.append(f"{onde} › {m}: cobertura sem 'temas' nem 'normas'")
                for t in c.get("temas", []):
                    if t not in temas:
                        erros.append(f"{onde} › {m}: tema '{t}' não existe na taxonomia")
                for sigla, ints in c.get("normas", {}).items():
                    if sigla not in normas:
                        erros.append(f"{onde} › {m}: norma '{sigla}' não está em normas/normas.json")
                    for it in ints:
                        if not INTERVALO.match(it):
                            erros.append(f"{onde} › {m}: intervalo inválido '{sigla} {it}'")
                            continue
                        if it != "*" and re.fullmatch(rf"({ART})-({ART})", it):
                            a, z = re.fullmatch(rf"({ART})-({ART})", it).groups()
                            if chave_art(a) > chave_art(z):
                                erros.append(f"{onde} › {m}: intervalo invertido '{sigla} {it}'")
                for disp in c.get("destaques", []):
                    validar_dispositivo(disp, normas, f"{onde} › {m} › destaques")
                soma_cob += c.get("questoes", 0)
            if soma_cob and soma_cob != b.get("questoes"):
                erros.append(f"{onde}: a soma das questões por matéria ({soma_cob}) difere do bloco ({b.get('questoes')})")
        obj = d.get("objetiva", {}).get("questoes")
        if obj and total != obj:
            erros.append(f"{rel}: os blocos somam {total} questões, a objetiva tem {obj}")


def validar_provas(temas, normas):
    total = pendentes = 0
    for caminho in sorted(glob.glob(os.path.join(RAIZ, "provas", "**", "prova.json"), recursive=True)):
        rel = os.path.relpath(caminho, RAIZ)
        pasta = os.path.dirname(caminho)
        p = carregar(caminho)
        if p is None:
            continue
        esperado = os.path.relpath(pasta, os.path.join(RAIZ, "provas"))
        if p.get("id") != esperado:
            erros.append(f"{rel}: 'id' deve ser '{esperado}' (o caminho da pasta)")
        for campo in ("banca", "orgao", "cargo", "ano", "aplicacao", "formato", "questoes", "gabarito"):
            if campo not in p:
                erros.append(f"{rel}: falta '{campo}'")
        gab = p.get("gabarito", {}).get("respostas", {})
        if p.get("formato") == "me" and len(gab) != p.get("questoes"):
            erros.append(f"{rel}: gabarito com {len(gab)} respostas para {p.get('questoes')} questões")
        for nome in (p.get("arquivos") or {}).values():
            if not os.path.exists(os.path.join(pasta, nome)):
                erros.append(f"{rel}: arquivo '{nome}' não encontrado na pasta")
        anuladas = set(p.get("anuladas", []))

        partes = ([os.path.join(pasta, "questoes.json")] if os.path.exists(os.path.join(pasta, "questoes.json")) else []) \
            + sorted(glob.glob(os.path.join(pasta, "questoes", "*.json")))
        if not partes:
            avisos.append(f"{rel}: ainda sem questoes.json (nem questoes/*.json)")
            continue
        relq = os.path.relpath(partes[0] if len(partes) == 1 else os.path.join(pasta, "questoes"), RAIZ)
        d = {"textos": {}, "questoes": []}
        for parte in partes:
            dp = carregar(parte)
            if dp is None:
                continue
            if dp.get("prova") not in (None, p.get("id")):
                erros.append(f"{os.path.relpath(parte, RAIZ)}: 'prova' deve ser '{p.get('id')}'")
            for tid, t in (dp.get("textos") or {}).items():
                if tid in d["textos"] and d["textos"][tid] != t:
                    erros.append(f"{os.path.relpath(parte, RAIZ)}: texto-base '{tid}' definido de dois jeitos")
                d["textos"][tid] = t
            d["questoes"].extend(dp.get("questoes", []))
        vistos = set()
        textos = d.get("textos", {})
        usados = set()
        for tid, t in textos.items():
            if not (t or {}).get("texto"):
                erros.append(f"{relq} › texto {tid}: vazio")
        for q in d.get("questoes", []):
            if q.get("texto"):
                usados.add(q["texto"])
                if q["texto"] not in textos:
                    erros.append(f"{relq} › Q{q.get('numero')}: texto-base '{q['texto']}' não existe em 'textos'")
            for campo in [q.get("enunciado", "")] + list(q.get("alt", {}).values()):
                if re.search(r"</?[a-z]+>", campo or ""):
                    erros.append(f"{relq} › Q{q.get('numero')}: HTML no texto; use **negrito** e __sublinhado__")
                    break
            n = q.get("numero")
            onde = f"{relq} › Q{n}"
            if q.get("id") != f"{p.get('id')}#{n}":
                erros.append(f"{onde}: id deve ser '{p.get('id')}#{n}'")
            if n in vistos:
                erros.append(f"{onde}: número repetido")
            vistos.add(n)
            if not q.get("enunciado"):
                erros.append(f"{onde}: enunciado vazio")
            if q.get("tipo") == "me":
                if sorted(q.get("alt", {})) != list("ABCDE"):
                    erros.append(f"{onde}: alternativas devem ser A a E")
                if any(not v for v in q.get("alt", {}).values()):
                    erros.append(f"{onde}: alternativa vazia")
                if n not in anuladas and q.get("gab") != gab.get(str(n)):
                    erros.append(f"{onde}: gabarito '{q.get('gab')}' difere do oficial '{gab.get(str(n))}'")
            if not q.get("temas"):
                erros.append(f"{onde}: sem temas")
            for t in q.get("temas", []):
                if t not in temas:
                    erros.append(f"{onde}: tema '{t}' não existe na taxonomia")
            for disp in q.get("dispositivos", []):
                validar_dispositivo(disp, normas, onde)
            if q.get("tipo") == "disc":
                if not q.get("padrao_resposta") or not q.get("criterios"):
                    erros.append(f"{onde}: discursiva sem 'padrao_resposta' ou 'criterios'")
            elif not q.get("exp"):
                avisos.append(f"{onde}: sem explicação")
            for campo in ("pendencias", "observacoes"):
                v = q.get(campo, [])
                if not isinstance(v, list) or any(not isinstance(x, str) or not x.strip() for x in v):
                    erros.append(f"{onde}: '{campo}' deve ser lista de textos")
            if "desatualizada" in q and not (isinstance(q["desatualizada"], str) and q["desatualizada"].strip()):
                erros.append(f"{onde}: 'desatualizada' deve explicar o motivo (texto)")
            for img in q.get("imagens", []):
                if not os.path.exists(os.path.join(pasta, img)):
                    erros.append(f"{onde}: imagem '{img}' não encontrada")
            if q.get("pendencias"):
                pendentes += 1
            total += 1
    return total, pendentes


def main():
    temas = validar_taxonomia()
    normas = validar_normas()
    validar_editais(temas, normas)
    n_questoes, n_pend = validar_provas(temas, normas)
    for a in avisos:
        print("aviso:", a)
    for e in erros:
        print("erro:", e)
    n_editais = len(glob.glob(os.path.join(RAIZ, "editais", "**", "edital.json"), recursive=True))
    print(f"{len(temas)} temas, {len(normas)} normas, {n_editais} editais, "
          f"{n_questoes} questões ({n_pend} com pendência): "
          + ("ok" if not erros else f"{len(erros)} erro(s)"))
    sys.exit(1 if erros else 0)


if __name__ == "__main__":
    main()
