# Progresso do candidato

> Esta pasta é **do candidato**, não do framework. Quem copiar o template troca este arquivo pelo seu.

## Concursos

| Concurso | Edital | Prova | Inscrições |
|---|---|---|---|
| TRF3 · Oficial de Justiça Avaliador Federal | `editais/trf3/oficial-de-justica-avaliador-federal/2026` | **31/01/2027** | até 23/11/2026 (pagar até 24/11, 21h59) |
| TJ-SP · Oficial de Justiça | `editais/tj-sp/oficial-de-justica/2026` | **14/03/2027** | até 10/12/2026 |

## Plano

- Até 31/01/2027: sessões diárias de ~20 questões, primeiro o que cai no TRF3 (comum e só TRF3), depois o que é só do TJ-SP. Depois de 31/01/2027, 100% TJ-SP.
- Mini-aula curta começando pelos erros da sessão anterior.
- Revisão espaçada calculada pelo painel (+1, +3, +7, +15, +30, +60 dias).
- Discursivas: TJ-SP (2 questões, 40 pts, mínimo 24) e estudo de caso do TRF3 (10 pts, mínimo 5, até 30 linhas). **Ponto fraco: texto curto e em tópicos.**

## Painel

- **Painel atual (v2):** https://claude.ai/artifact/R5HRQxk4rnsrVBvz7XDurv
- Painel antigo (v1, congelado, só consulta): https://claude.ai/artifact/SfWicPDqnHeqzhpVs34t6Y — o histórico dele foi importado para o v2 (sessões 0013, 0014, TRF3·01 e a 0015, aberta).
- Painéis anteriores (congelados): TJ-SP https://claude.ai/artifact/G9YruxCx44VEHoviH43bdZ · TRF3 https://claude.ai/artifact/Vat7RVmtg16E2y9ayBfdxR

## Placar em 16/11/2026 (noite)

- **Entregas de 16/11, seis no total: 37/51 (73%).** 0022: **7/10**; 0023: **4/10**; 0024: **6/10**; automáticas: **10/10** (12:55), **9/10** (16:03) e **1/1** (16:09).
- **Acertou enfim o MMC/calendário** (2023 #84, na 7ª tentativa) e os juros com troca de aplicação (2024 #83).
- Erros de processo da FCC/TRF3, todos na **exceção expressa do artigo**: recuperação judicial com interesse da União (`CPC 45 I`), nulidades (`CPC 276`, `CPC 279 §2º`, `CPC 282 §2º`), foro de senador por crime anterior ao mandato (`CF 109 IV`), auxílio-moradia (`L8112 60-B VI`), atos executivos em comarca contígua (`CPC 782 §1º`, `§4º`) e inexigibilidade contra a Fazenda (`CPC 535 §5º`, `§7º`).
- Erros de conta parada antes do fim: geometria (2024 #86, **2ª vez**, 2/7), média ponderada (2023 #83), diagrama de três conjuntos (2023 #89) e sequência (2023 #90). Voltaram a cair: negação da condicional (2023 #87), condicional V + conjunção F (2023 #92), "preferível a" (2024 #16) e "não me lembra" / "nunca os pomos" (2024 #20).
- **0025** montada no painel com **10 questões** (tamanho de `meta/config`): 7 revisões (`CPC 45 I`, nulidades, foro do parlamentar, auxílio-moradia, `CPC 782`, `CPC 535`, geometria) e 3 inéditas (diagrama 2024 #90, sequência 2024 #92, embargos de declaração TRF3 #44). Nenhuma outra sessão estava aberta. Cópia em `estudo/sessoes/0025.json`.
- Temas mais fracos: exceções do CPC cobradas pela FCC (competência, nulidades, execução), condicional (negação × V/F), regência nominal e pronomes oblíquos, geometria (razão de áreas), diagramas e sequências.

## Placar em 16/11/2026 (madrugada)

- **Sessão automática de 15/11 (21:37):** **7/10 (70%)**. Erros, todos de conta parada antes do fim: MMC/calendário (2023 #84, marcou "segunda", o certo é quinta; **6ª tentativa**, 1 acerto), juros simples com troca de aplicação (2024 #83, marcou 10,3%, certo 9,7%) e área do triângulo no retângulo (2024 #86, marcou 2/9 = região 2 ÷ folha, o certo é 2/7 = região 2 ÷ região 1). Acertou de novo razão e proporção (2023 #85) e média ponderada (2024 #85).
- **0024** montada no painel com **10 questões** (tamanho de `meta/config`): 3 revisões dos erros de hoje, 2 revisões vencidas com 1 acerto em 2 (`CPC 36 §2º`, `CF 93 VIII-B`) e 5 inéditas da FCC/TRF3 (`CTN 105`/`111`/`112`, `CF 109 IV`, `L8112 60-B`, nulidades `CPC 278`–`282`, conexão `CPC 55`). Não repete questões da 0022 nem da 0023, ainda abertas. Cópia em `estudo/sessoes/0024.json`.
- Temas mais fracos: MMC/calendário (1 acerto em 6), juros simples com sistema, geometria (razão de áreas), regência nominal, prazos de mandado na NSCGJ, condicional (negação × equivalência), colocação pronominal e pronomes oblíquos. Padrão da rodada: **conta certa até a metade**; a mini-aula pede sublinhar o que o enunciado pede antes de olhar as alternativas.

## Placar em 15/11/2026 (madrugada)

- **Revisões automáticas de 14/11:** **9/10** (09:25; erro: prazos de mandado para audiência, `NSCGJ 995 §§3º e 4º`: marcou 10 e 20, o certo é 20 e 10) e **10/10** (09:35). Total: **19/20 (95%)**, o melhor resultado até aqui.
- **Acertou as quatro que vinham repetindo erro:** razão e proporção (2023 #85, depois de 5 erros), MMC/calendário (2023 #84), execução fiscal (2023 #71) e média ponderada (2024 #85).
- **0023** montada no painel com **10 questões** (tamanho de `meta/config`): 4 revisões (mandados na NSCGJ, regência nominal ×2, chamamento ao processo) e 6 inéditas (pessoa jurídica `CC 43–45`, `CPC 782`, `CPC 535 §§5º–8º`, `CPC 45 I`, diagrama de conjuntos, sequência). Não repete questões da 0022, que continua aberta. Cópia em `estudo/sessoes/0023.json`.
- Temas mais fracos: regência nominal (1 acerto em 3–4 tentativas), prazos de mandado na NSCGJ, condicional (negação × equivalência), colocação pronominal e pronomes oblíquos, desconsideração da personalidade jurídica. A matemática de enunciado longo melhorou nas revisões; falta confirmar em questão nova (0022).

## Placar em 14/11/2026 (madrugada)

- **0021** (entregue em 13/11): **5/10 (50%)**. Erros: desconsideração na inicial (`CPC 134 §2º`, `§3º`: sem incidente e sem suspensão), execução fiscal (`L6830 8`, `L6830 2 §8º`), razão e proporção (16,4 mi, **5ª vez**), argumento válido (modus tollens + De Morgan), média ponderada (x = 63). Acertou chamamento, regência nominal, equivalência da condicional, gráfico de setores e a redação FCC.
- **Sessão automática de 13/11 (17:28):** **6/10 (60%)**. Erros: colocação pronominal (pronome no início da frase), MMC/calendário (marcou "terça" de novo), negação da condicional (p ∧ ~q), pronomes ("nunca os pomos").
- **0022** montada no painel com **10 questões** (tamanho de `meta/config`): 5 revisões de erros desta rodada e 5 inéditas (média ponderada com gráfico, tabela e porcentagem, números naturais, contagem de algarismos, concordância/regência em lacunas). As quatro questões já repetidas demais (2023 #84, #85, #71 e 2024 #85) ficaram de fora desta sessão para medir o raciocínio em questão nova; voltam pelas revisões vencidas. Cópia em `estudo/sessoes/0022.json`.
- Entregas corrigidas nesta rodada: 11/20 (55%).
- Temas mais fracos: matemática de enunciado longo (razão, MMC, média ponderada), condicional (negação × equivalência), colocação pronominal e pronomes oblíquos, execução fiscal, argumento válido, desconsideração da personalidade jurídica. O padrão de **erro repetido com letra nova** continua nas questões de conta.

## Placar em 12/11/2026 (noite)

- **0020** (entregue em 12/11): **4/10 (40%)**. Erros: chamamento ao processo (`CPC 130 III`, `CPC 131 p.ú.`), execução fiscal (`L6830 8`, `L6830 2 §3º`), MMC/calendário, razão e proporção (16,4 mi, **4ª vez**), regência nominal ("interesse com", "incumbência de"), equivalência da condicional (~p ∨ q, A de novo). Acertou colocação pronominal, denunciação, juízo de delibação e permuta.
- **Revisões de 12/11:** **8/10** (17:40; erros: concordância com "que" relativo, média ponderada) e **9/10** (18:36; erro: dedução com condicional e conjunção, que tinha acertado em 09/11).
- **0021** montada no painel com **10 questões** (tamanho de `meta/config`): 6 revisões de erros e 4 inéditas nos mesmos temas (desconsideração da personalidade jurídica na inicial, argumento válido, gráfico de setores, redação FCC). Cópia em `estudo/sessoes/0021.json`.
- Entregas corrigidas nesta rodada: 21/30 (70%).
- Temas mais fracos: matemática de enunciado longo (razão, MMC, média ponderada), execução fiscal, regência nominal, condicional (equivalência e dedução), intervenção de terceiros (chamamento). O **chute em questão repetida** piorou: nas revisões o candidato acerta, na sessão montada erra as mesmas com letra nova. A mini-aula pede escrever a conta ou o artigo antes de ler as alternativas.

## Placar em 11/11/2026 (noite)

- **0019** (entregue em 10/11): **5/10 (50%)**. Os 5 erros repetem questões já erradas antes, com outra letra: regência nominal ×2 ("medo de", "preferível a"), execução fiscal (`L6830 8`, arresto do `L6830 7 III`), MMC/calendário e razão e proporção (16,4 mi, **3ª vez**).
- **Revisão de 11/11 (manhã, TJ-SP 2024):** **7/10**. Erros: colocação pronominal (mesóclise, "que" atrai), denunciação indeferida → ação autônoma (`CPC 125 §1º`), equivalência da condicional (~p ∨ q).
- **Sessão automática de 11/11 (noite):** **10/10** (tributário, Judiciário, PcD, concordância, lógica, citação eletrônica, mandados, regra de três).
- **0020** montada no painel com **10 questões** (tamanho de `meta/config`): 6 revisões de erros, 2 revisões vencidas (`CPC 36 §2º`, `CF 93 VIII-B`) e 2 inéditas (colocação pronominal, chamamento ao processo). Cópia em `estudo/sessoes/0020.json`.
- Entregas corrigidas nesta rodada: 22/30 (73%).
- Temas mais fracos: matemática de enunciado longo (razão, MMC), regência nominal, execução fiscal, condicional (negação e equivalência), colocação pronominal, intervenção de terceiros. Padrão novo: **erro repetido com letra diferente** (chute); a mini-aula pede escrever a regra/conta antes de marcar.

## Placar em 10/11/2026 (manhã)

- **0018** (entregue em 09/11): **6/10 (60%)**. Erros: súmula vinculante (`CF 103-A §3º`), regência/pronome ("não me lembra", "nunca os pomos"), videoconferência (`CPC 453 §1º`), juros simples (9,7%).
- **Revisões de 09/11 (TJ-SP 2023):** **10/10** (19:04) e **8/10** (19:13). Erros: razão e proporção (16,4 mi) e negação da condicional (p ∧ ~q).
- **0019** montada no painel com **10 revisões** (tamanho de `meta/config`): as 6 de hoje + regência nominal ×2, execução fiscal e MMC. Cópia em `estudo/sessoes/0019.json`.
- Entregas corrigidas nesta rodada: 24/30 (80%). Objetivas somadas: 100/172 (histórico) + 0018 e revisões de 09/11 em andamento no painel.
- Temas mais fracos: matemática de enunciado longo (juros, proporção, MMC), regência, súmula vinculante, condicional (negação), execução fiscal.

## Placar em 08/11/2026 (noite)

- **0017** (entregue em 08/11): **7/10 (70%)**. Erros: execução fiscal (prazo de 5 dias, `L6830 8`; CDA emendável, `L6830 2 §8º`), qualidade de segurado em auxílio-acidente (`L8213 15 I`), regência/pronomes ("não me lembra", "nunca os pomos"). Acertou a negação de "ou… ou", a Justiça Militar estadual, a carga única e a regra de três.
- **0018** montada no painel com **10 revisões** (tamanho de `meta/config`): execução fiscal, previdência, regência, súmula vinculante, taxa, cota de PcD, oitiva por videoconferência, juros simples, condicional. Cópia em `estudo/sessoes/0018.json`.
- Objetivas no total: **100/172 (58%)**, somando o histórico 0001–0012.
- Temas mais fracos: execução fiscal, regência (verbal e nominal), previdenciário (qualidade de segurado, cota de PcD), tributário básico (taxa), súmula vinculante.

## Placar em 08/11/2026 (tarde)

- **0016** (entregue em 08/11): **10/20 (50%)**. **Acertou as 2 de condicional** (esquema que tinha errado 3 vezes). Erros: regência verbal e nominal, execução fiscal (interrupção da prescrição e edital de 60 dias, `L6830 8`), taxa (`CTN 77`), cota de PcD (`L8213 93`), permuta de magistrados (`CF 93 VIII-B`), súmula vinculante (`CF 103-A`), juízo de delibação (`CPC 36 §2º`), MMC, prazos de mandado para audiência (NSCGJ). Duas dessas estavam explicadas na própria mini-aula.
- **0017** (08/11) montada no painel com **10 questões** (o tamanho configurado em `meta/config`): 4 revisões da 0015 e 6 inéditas. Cópia em `estudo/sessoes/0017.json`.
- A sessão "Revisões de 06/11" (20 questões da prova TJ-SP 2023, nunca entregue) foi excluída a pedido do candidato em 08/11; as questões dela voltam a ficar disponíveis.
- Objetivas no total: **93/162 (57%)**, somando o histórico 0001–0012.
- Correção automática: tarefa agendada às 7h e às 21h; **ainda sem acesso ao repositório** (falta escolher o repositório na tarefa, em claude.ai → Agendados).
- Temas mais fracos: regência (verbal e nominal), execução fiscal (prazos e efeitos da `L6830`), tributário básico (taxa, fontes), Poder Judiciário (permuta, Justiça Militar, súmula vinculante), cota e avaliação da PcD, negação de quantificadores, matemática (MMC, juros).

## Placar em 06/11/2026

- **0015** (entregue em 06/11): **12/21 (57%)**. Erros: Justiça Militar estadual (`CF 125 §3º`), prazo da execução fiscal (5 dias, `L6830 8`), avaliação e vulnerabilidade da PcD (`L13146 2 §1º`, `5 p.ú.`), negação de "existe… ou… ou", regência nominal, oitiva por videoconferência (`CPC 453 §1º`), juros simples, condicional + "e" (**3ª vez**), citação eletrônica sem confirmação (`CPC 246 §1º-A`).
- **0016** (06/11) montada no painel: 19 questões reais inéditas sobre esses pontos + 1 autoral de condicional, com tributário e cota de PcD para o TRF3. Cópia em `estudo/sessoes/0016.json`.
- Objetivas no total: **83/142 (58%)**, somando o histórico 0001–0012.
- Discursivas TJ-SP: 13/40 (0006) e 12/40 (0012), abaixo do mínimo. Próximo passo: treinar o estudo de caso do TRF3 no painel ("Treinar discursiva").
- Temas mais fracos: raciocínio lógico (condicional + "e": errou 3 vezes o mesmo esquema; negação de quantificador e de "ou… ou"), citação eletrônica (`CPC 246` × `231 IX`), concordância e regência, hora certa (`CPC 252–254`), Estatuto da PcD, execução fiscal (prazos da `L6830`).
