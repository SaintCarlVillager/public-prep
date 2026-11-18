"""Valida taxonomia, normas, editais, provas e lei seca do framework.

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
# Artigo da lei seca ou de dispositivo: também "DT-1" (artigo das Disposições Transitórias de leis de SP).
ART_LEI = r"(?:DT-)?\d+(?:-[A-Z]{1,2})?"
INTERVALO = re.compile(rf"^(\*|{ART}(?:-{ART})?)$")
DISPOSITIVO = re.compile(r"^(?P<norma>[A-Z][A-Za-z0-9-]*) (?P<art>(?:DT-)?\d+(?:-[A-Z]{1,2})?)(?P<resto>(?:[- ].*)?)$")

erros, avisos = [], []


def carregar(caminho):
    try:
        with open(caminho, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        erros.append(f"{os.path.relpath(caminho, RAIZ)}: não é JSON válido ({e})")
        return None


def chave_art(a):
    """Ordem dos artigos: os das Disposições Transitórias ("DT-1") vêm depois dos permanentes."""
    m = re.match(r"^(DT-)?(\d+)(?:-([A-Z]{1,2}))?$", a)
    return (1 if m.group(1) else 0, int(m.group(2)), m.group(3) or "")


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
        for campo in ("orgao", "cargo", "cargo_curto", "banca", "prova", "objetiva", "blocos"):
            if campo not in d:
                erros.append(f"{rel}: falta '{campo}'")
        if "cargo_curto" in d and not (isinstance(d["cargo_curto"], str) and 0 < len(d["cargo_curto"]) <= 20):
            erros.append(f"{rel}: 'cargo_curto' deve ser um texto curto (até 20 caracteres), ex.: \"Escrevente\"")
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
        objetiva = d.get("objetiva", {})
        dur = objetiva.get("duracao_min")
        if dur is None:
            avisos.append(f"{rel}: objetiva sem 'duracao_min' (o simulado fica sem cronômetro)")
        elif not (isinstance(dur, int) and not isinstance(dur, bool) and 0 < dur <= 720):
            erros.append(f"{rel}: 'objetiva.duracao_min' deve ser um número inteiro de minutos (ex.: 300)")
        if "duracao_inclui" in objetiva and not (isinstance(objetiva["duracao_inclui"], str) and objetiva["duracao_inclui"].strip()):
            erros.append(f"{rel}: 'objetiva.duracao_inclui' deve ser um texto curto")


def validar_vf(q, anulada, onde):
    """`vf` marca cada alternativa como card de verdadeiro/falso do treino:
    true/false = valor de verdade da afirmação; null = não faz sentido sozinha (fica fora do treino).
    Os valores têm de bater com o gabarito oficial: na questão que pede a correta, só o gabarito é
    verdadeiro; na que pede a incorreta, só o gabarito é falso."""
    vf = q["vf"]
    if q.get("tipo") != "me":
        erros.append(f"{onde}: 'vf' só vale para múltipla escolha")
        return
    if anulada or q.get("anulada") or q.get("desatualizada"):
        erros.append(f"{onde}: questão anulada ou desatualizada não entra no treino; tire 'vf'")
        return
    if not isinstance(vf, dict) or sorted(vf) != sorted(q.get("alt", {})):
        erros.append(f"{onde}: 'vf' deve ter exatamente as letras das alternativas")
        return
    if any(v not in (True, False, None) or (v is not None and not isinstance(v, bool)) for v in vf.values()):
        erros.append(f"{onde}: 'vf' aceita só true, false ou null")
        return
    marcadas = {L: v for L, v in vf.items() if v is not None}
    if not marcadas:
        erros.append(f"{onde}: 'vf' sem nenhuma alternativa marcada; tire o campo")
        return
    gab = q.get("gab")
    if vf.get(gab) is None:
        # Sem o gabarito marcado não dá para saber se a questão pede a correta ou a incorreta.
        erros.append(f"{onde}: em 'vf', o gabarito '{gab}' tem de ser marcado (true ou false)")
        return
    pede_correta = all(v == (L == gab) for L, v in marcadas.items())
    pede_incorreta = all(v == (L != gab) for L, v in marcadas.items())
    if not (pede_correta or pede_incorreta):
        erros.append(f"{onde}: 'vf' não bate com o gabarito '{gab}' (só o gabarito pode ser o diferente)")


def validar_exp_alt(q, onde):
    """`exp_alt` é o comentário de cada alternativa que vira card no Treino (lido sozinho, sem as outras).
    Cobre exatamente as letras com `vf` true/false."""
    ea, vf = q["exp_alt"], q.get("vf")
    if not isinstance(vf, dict):
        erros.append(f"{onde}: 'exp_alt' só existe junto com 'vf'")
        return
    if not isinstance(ea, dict):
        erros.append(f"{onde}: 'exp_alt' deve ser um objeto {{letra: comentário}}")
        return
    com_card = sorted(L for L, v in vf.items() if v is not None)
    if sorted(ea) != com_card:
        erros.append(f"{onde}: 'exp_alt' deve ter exatamente as letras com card em 'vf' ({', '.join(com_card)})")
    for L, t in ea.items():
        if not isinstance(t, str) or not t.strip():
            erros.append(f"{onde}: 'exp_alt' da letra {L} vazio")
        elif re.search(r"</?[a-z]+>", t):
            erros.append(f"{onde}: HTML no 'exp_alt' da letra {L}; use **negrito**")


FAIXA = re.compile(r"^(\d+)-(\d+)$")


def validar_blocos_prova(p, rel):
    """'blocos' de prova.json: [{"id", "nome", "questoes": "1-20"}], faixas sem sobreposição dentro de 1..questoes."""
    blocos = p.get("blocos")
    if blocos is None:
        return
    if not isinstance(blocos, list) or not blocos:
        erros.append(f"{rel}: 'blocos' deve ser uma lista de {{id, nome, questoes}}")
        return
    vistos, ids = set(), set()
    for b in blocos:
        onde = f"{rel} › bloco {b.get('id')}"
        if not b.get("id") or not b.get("nome"):
            erros.append(f"{onde}: bloco sem 'id' ou 'nome'")
        if b.get("id") in ids:
            erros.append(f"{onde}: id de bloco repetido")
        ids.add(b.get("id"))
        m = FAIXA.match(str(b.get("questoes", "")))
        if not m or int(m.group(1)) > int(m.group(2)):
            erros.append(f"{onde}: 'questoes' deve ser uma faixa \"1-20\"")
            continue
        faixa = set(range(int(m.group(1)), int(m.group(2)) + 1))
        if faixa & vistos:
            erros.append(f"{onde}: faixa {b['questoes']} se sobrepõe a outro bloco")
        if max(faixa) > (p.get("questoes") or 0):
            erros.append(f"{onde}: faixa {b['questoes']} passa do número de questões da prova")
        vistos |= faixa
    faltam = set(range(1, (p.get("questoes") or 0) + 1)) - vistos
    if faltam:
        avisos.append(f"{rel}: questões fora de qualquer bloco: {sorted(faltam)[:10]}")


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
        validar_blocos_prova(p, rel)

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
            if "vf" in q:
                validar_vf(q, n in anuladas, onde)
            if "exp_alt" in q:
                validar_exp_alt(q, onde)
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


DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validar_leis(normas):
    """leis/<SIGLA>.json: texto oficial de cada norma, artigo por artigo. Devolve {sigla: {artigos}}."""
    leis = {}
    for caminho in sorted(glob.glob(os.path.join(RAIZ, "leis", "*.json"))):
        rel = os.path.relpath(caminho, RAIZ)
        d = carregar(caminho)
        if d is None:
            continue
        sigla = os.path.splitext(os.path.basename(caminho))[0]
        if d.get("sigla") != sigla:
            erros.append(f"{rel}: 'sigla' deve ser '{sigla}' (o nome do arquivo)")
        if sigla not in normas:
            erros.append(f"{rel}: norma '{sigla}' não está em normas/normas.json")
        elif d.get("nome") != normas[sigla]:
            avisos.append(f"{rel}: 'nome' difere de normas/normas.json ('{normas[sigla]}')")
        if not isinstance(d.get("fonte"), str) or not d["fonte"].strip():
            erros.append(f"{rel}: falta 'fonte' (de onde o texto saiu)")
        if not DATA.match(str(d.get("consultado", ""))):
            erros.append(f"{rel}: 'consultado' deve ser uma data AAAA-MM-DD")
        arts = d.get("artigos")
        if not isinstance(arts, list) or not arts:
            erros.append(f"{rel}: 'artigos' deve ser uma lista não vazia")
            continue
        vistos, anterior, fora_de_ordem = set(), None, 0
        for i, a in enumerate(arts):
            onde = f"{rel} › artigos[{i}]"
            num = str(a.get("art", ""))
            if not re.fullmatch(ART_LEI, num):
                erros.append(f"{onde}: 'art' inválido '{num}' (ex.: '246', '396-A', 'DT-1', sem º nem ponto)")
                continue
            if num in vistos:
                erros.append(f"{onde}: artigo '{num}' repetido")
            vistos.add(num)
            if not isinstance(a.get("texto"), str) or not a["texto"].strip():
                erros.append(f"{onde}: artigo '{num}' sem 'texto'")
            if anterior is not None and chave_art(num) < chave_art(anterior):
                fora_de_ordem += 1
            anterior = num
        if fora_de_ordem:
            avisos.append(f"{rel}: {fora_de_ordem} artigo(s) fora da ordem numérica")
        leis[sigla] = vistos
    return leis


def conferir_editais_na_lei(leis):
    """Aviso, edital por edital, para cada norma cobrada que ainda não tem lei seca em leis/."""
    for caminho in sorted(glob.glob(os.path.join(RAIZ, "editais", "**", "edital.json"), recursive=True)):
        d = carregar(caminho) or {}
        faltam = sorted({s for b in d.get("blocos", []) for c in b.get("cobertura", []) for s in c.get("normas", {}) if s not in leis})
        if faltam:
            avisos.append(f"lei seca: {d.get('id')} cobra {len(faltam)} norma(s) sem leis/: {', '.join(faltam)}")


def conferir_dispositivos_na_lei(leis):
    """Aviso quando uma questão cita artigo que não existe na lei seca (renumerado, revogado ou erro)."""
    if not leis:
        return
    faltam = {}
    arquivos = glob.glob(os.path.join(RAIZ, "provas", "**", "questoes.json"), recursive=True) \
        + glob.glob(os.path.join(RAIZ, "provas", "**", "questoes", "*.json"), recursive=True)
    for caminho in arquivos:
        d = carregar(caminho) or {}
        for q in d.get("questoes", []):
            for disp in q.get("dispositivos", []):
                m = DISPOSITIVO.match(disp)
                if m and m.group("norma") in leis and m.group("art") not in leis[m.group("norma")]:
                    faltam.setdefault(f"{m.group('norma')} {m.group('art')}", []).append(q.get("id"))
    for disp, ids in sorted(faltam.items()):
        avisos.append(f"lei seca: '{disp}' não está em leis/ (citado por {', '.join(ids[:3])}{'…' if len(ids) > 3 else ''})")


def main():
    temas = validar_taxonomia()
    normas = validar_normas()
    validar_editais(temas, normas)
    n_questoes, n_pend = validar_provas(temas, normas)
    leis = validar_leis(normas)
    conferir_dispositivos_na_lei(leis)
    conferir_editais_na_lei(leis)
    for a in avisos:
        print("aviso:", a)
    for e in erros:
        print("erro:", e)
    n_editais = len(glob.glob(os.path.join(RAIZ, "editais", "**", "edital.json"), recursive=True))
    print(f"{len(temas)} temas, {len(normas)} normas, {n_editais} editais, "
          f"{n_questoes} questões ({n_pend} com pendência), {len(leis)} leis: "
          + ("ok" if not erros else f"{len(erros)} erro(s)"))
    sys.exit(1 if erros else 0)


if __name__ == "__main__":
    main()
