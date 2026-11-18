"""Empacota o repositório nos arquivos que o app lê (web/public/dados/).

Uso: python3 scripts/empacotar.py [--sem-validar] [--saida <pasta>]

Lê taxonomia/, normas/normas.json, editais/**/edital.json e
provas/**/prova.json + questoes.json e gera:

  <saída>/catalogo.json               matérias, temas, normas, editais, provas e um
                                      índice leve das questões (para placar e banco)
  <saída>/provas/<slug>.json          metadados, textos-base e questões de cada prova
  <saída>/figuras/<slug>/*.png        figuras da prova

A saída padrão é web/public/dados/ (o app em web/ serve esses arquivos).

slug = id da prova com "/" trocado por "--".
Antes de empacotar roda scripts/validar.py e aborta se falhar
(--sem-validar pula essa etapa, só para testes).
"""
import datetime
import glob
import json
import os
import shutil
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "web", "public", "dados")
if "--saida" in sys.argv:
    SAIDA = os.path.abspath(sys.argv[sys.argv.index("--saida") + 1])


def ler(caminho):
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def gravar(caminho, dados):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, separators=(",", ":"))


def slug(id_):
    return id_.replace("/", "--")


def validar():
    r = subprocess.run([sys.executable, os.path.join(RAIZ, "scripts", "validar.py")],
                       capture_output=True, text=True)
    saida = (r.stdout + r.stderr).strip()
    if r.returncode != 0:
        print(saida)
        print("\nValidação falhou: nada foi empacotado. Corrija os erros (ou use --sem-validar só para testes).")
        sys.exit(1)
    print(saida.splitlines()[-1] if saida else "validação ok")


def taxonomia():
    materias, temas = {}, {}
    for caminho in sorted(glob.glob(os.path.join(RAIZ, "taxonomia", "*.json"))):
        d = ler(caminho)
        materias[d["materia"]] = d.get("nome", d["materia"])

        def visitar(nos):
            for n in nos:
                temas[n["id"]] = n.get("nome", n["id"])
                visitar(n.get("filhos", []))

        visitar(d.get("temas", []))
    return materias, temas


def editais():
    lista = [ler(c) for c in sorted(glob.glob(os.path.join(RAIZ, "editais", "**", "edital.json"), recursive=True))]
    lista.sort(key=lambda e: (e.get("prova") or "9999", e.get("id", "")))
    return lista


def indice_questao(q, anulada):
    """Campos mínimos para relevância, placar, revisões e filtros do banco."""
    i = {"id": q["id"], "n": q.get("numero"), "tipo": q.get("tipo", "me"),
         "temas": q.get("temas", []), "disp": q.get("dispositivos", [])}
    if q.get("texto"):
        i["tx"] = q["texto"]
    if anulada:
        i["anulada"] = True
    if q.get("desatualizada"):
        i["desat"] = True
    if q.get("imagens"):
        i["img"] = len(q["imagens"])
    if q.get("tipo") == "disc" and q.get("max") is not None:
        i["max"] = q["max"]
    if q.get("vf") and not anulada and not q.get("desatualizada"):
        # Letras que viram card de verdadeiro/falso no Treino (o valor fica só no arquivo da prova).
        i["vf"] = [L for L, v in q["vf"].items() if v is not None]
    return i


def provas():
    resumo, indice, tamanhos, figuras = [], {}, 0, 0
    for caminho in sorted(glob.glob(os.path.join(RAIZ, "provas", "**", "prova.json"), recursive=True)):
        pasta = os.path.dirname(caminho)
        p = ler(caminho)
        pid, s = p["id"], slug(p["id"])
        partes = ([os.path.join(pasta, "questoes.json")] if os.path.exists(os.path.join(pasta, "questoes.json")) else []) \
            + sorted(glob.glob(os.path.join(pasta, "questoes", "*.json")))
        d = {"textos": {}, "questoes": []}
        for parte in partes:
            dp = ler(parte)
            d["textos"].update(dp.get("textos") or {})
            d["questoes"].extend(dp.get("questoes", []))
        d["questoes"].sort(key=lambda q: (isinstance(q.get("numero"), str), q.get("numero") if isinstance(q.get("numero"), int) else str(q.get("numero"))))
        anuladas_n = set(p.get("anuladas", []))

        meta = {k: v for k, v in p.items() if k != "gabarito"}
        gab = p.get("gabarito") or {}
        meta["gabarito"] = {k: v for k, v in gab.items() if k != "respostas"}

        questoes, idx = [], []
        for q in d.get("questoes", []):
            q = dict(q)
            anulada = bool(q.get("anulada")) or q.get("numero") in anuladas_n
            if anulada:
                q["anulada"] = True
            q["prova"] = pid
            q["banca"] = p.get("banca")
            q["ano"] = p.get("ano")
            if q.get("imagens"):
                novas = []
                for img in q["imagens"]:
                    origem = os.path.join(pasta, img)
                    nome = os.path.basename(img)
                    destino = os.path.join(SAIDA, "figuras", s, nome)
                    if os.path.exists(origem):
                        os.makedirs(os.path.dirname(destino), exist_ok=True)
                        shutil.copyfile(origem, destino)
                    else:
                        print(f"aviso: {pid}#{q.get('numero')}: imagem '{img}' não encontrada")
                    novas.append(f"figuras/{s}/{nome}")
                q["imagens"] = novas
            questoes.append(q)
            idx.append(indice_questao(q, anulada))

        # Figuras da pasta que nenhuma questão cita ainda também vão (outros agentes podem estar ligando-as).
        for png in sorted(glob.glob(os.path.join(pasta, "figuras", "*.png"))):
            destino = os.path.join(SAIDA, "figuras", s, os.path.basename(png))
            if not os.path.exists(destino):
                os.makedirs(os.path.dirname(destino), exist_ok=True)
                shutil.copyfile(png, destino)
        figuras += len(glob.glob(os.path.join(SAIDA, "figuras", s, "*.png")))

        arquivo = f"provas/{s}.json"
        gravar(os.path.join(SAIDA, arquivo), {"prova": meta, "textos": d.get("textos", {}), "questoes": questoes})
        indice[pid] = idx
        resumo.append({
            "id": pid, "banca": p.get("banca"), "orgao": p.get("orgao"), "cargo": p.get("cargo"),
            "ano": p.get("ano"), "aplicacao": p.get("aplicacao"),
            "questoes": len(questoes), "anuladas": sorted(n for n in (anuladas_n | {q["numero"] for q in questoes if q.get("anulada")}) if isinstance(n, int)),
            "gabarito_status": gab.get("status"), "arquivo": arquivo,
        })
        if p.get("blocos"):
            # Blocos do caderno ({id, nome, questoes: "1-20"}), para o resultado da prova anterior no Simulado.
            resumo[-1]["blocos"] = p["blocos"]
    return resumo, indice, figuras


def leis():
    """Copia a lei seca (leis/*.json) e devolve o resumo para o catálogo."""
    resumo = {}
    for caminho in sorted(glob.glob(os.path.join(RAIZ, "leis", "*.json"))):
        d = ler(caminho)
        sigla = d["sigla"]
        gravar(os.path.join(SAIDA, "leis", f"{sigla}.json"), d)
        resumo[sigla] = {"artigos": len(d.get("artigos", [])), "consultado": d.get("consultado"), "fonte": d.get("fonte")}
    return resumo


def tamanho_pasta(p):
    return sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(p) for f in fs)


def main():
    if "--sem-validar" in sys.argv:
        print("aviso: validação pulada (--sem-validar)")
    else:
        validar()

    if os.path.isdir(SAIDA):
        shutil.rmtree(SAIDA)
    os.makedirs(SAIDA)

    materias, temas = taxonomia()
    normas = ler(os.path.join(RAIZ, "normas", "normas.json"))
    lista_provas, indice, n_fig = provas()
    catalogo = {
        "gerado": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "materias": materias,
        "temas": {**materias, **temas},
        "normas": normas,
        "editais": editais(),
        "provas": lista_provas,
        "indice": indice,
        "leis": leis(),
    }
    gravar(os.path.join(SAIDA, "catalogo.json"), catalogo)

    n_q = sum(p["questoes"] for p in lista_provas)
    print(f"{len(lista_provas)} provas, {n_q} questões, {len(catalogo['editais'])} editais, "
          f"{len(temas)} temas, {n_fig} figuras, {len(catalogo['leis'])} leis")
    print(f"catálogo: {os.path.getsize(os.path.join(SAIDA, 'catalogo.json')) / 1024:.0f} KB · "
          f"total em {os.path.relpath(SAIDA, RAIZ)}/: {tamanho_pasta(SAIDA) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
