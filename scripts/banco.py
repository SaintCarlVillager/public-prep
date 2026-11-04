"""Regenera banco/usadas.md a partir de sessoes/*.json."""
import collections, glob, json, os, re

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
used = collections.defaultdict(list)
for f in sorted(glob.glob(os.path.join(R, "sessoes", "*.json"))):
    s = json.load(open(f, encoding="utf-8"))
    sid = s.get("rotulo") or os.path.basename(f)[:-5]
    for q in s["questoes"]:
        m = re.match(r"(Vunesp|FCC) · (.+?) · (.+?) · Q(\d+)", q.get("fonte", ""))
        if m:
            used[f"{m.group(1)} {m.group(2)} · {m.group(3)}"].append((int(m.group(4)), sid, q["tema"]))
        else:
            used["Autorais"].append((q["n"], sid, q["tema"]))
out = ["# Banco de questões usadas", "", "Antes de montar uma sessão, confira aqui para não repetir questão real.", ""]
for k in sorted(used):
    rows = sorted(used[k], key=(lambda x: (x[1], x[0])) if k == "Autorais" else None)
    out += [f"## {k}", "", "| Q | Sessão | Tema |", "|---|---|---|"] + [f"| {n} | {s} | {t} |" for n, s, t in rows] + [""]
open(os.path.join(R, "banco", "usadas.md"), "w", encoding="utf-8").write("\n".join(out))
