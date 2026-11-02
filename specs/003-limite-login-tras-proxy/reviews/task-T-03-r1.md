---
artifact: review
feature: F003
kind: task
target: task/003-T-03@a40325c
sources: [plan.md@1 (T-03), requirements.md@1 (AC-04.2), design.md@3, evidence/t02-comprobacion-proxy.md (feature branch), .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: task/003-T-03@a40325c, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 2. Findings

Diff reviewed: `git diff feature/003-limite-login-tras-proxy...task/003-T-03`. One commit (a40325c), one file (`README.md`), 4 lines added and 1 removed, all inside "Despliegue detrás de un proxy". That matches the task's file list. The heading and the anchor `#despliegue-detrás-de-un-proxy` are unchanged, and the TLS bullet, the "Un solo camino de entrada" bullet and the "Rate limit en memoria" bullet are untouched.

Claim-by-claim comparison with the T-02 record:

| README claim | Support |
|---|---|
| Without the variable, clients behind a proxy share the quota (login, token, refresh) | S1: 429 at the 11th attempt despite 11 different `X-Forwarded-For`. Token and refresh limits are shown in S2. Matches. |
| With the variable, each client has its own quota | S2: A exhausted, B still gets 401. Matches. |
| Value is an IP or a CIDR network | S2 (IP) and S4 (/31). Matches. |
| Narrowest value possible; Docker Desktop shows the gateway as the connection IP | Environment section and access-log line (ASM-05). Matches. |
| A connection not in the list cannot choose its IP | S3 and S4 (second container at 429). Matches. |
| With `*`, any client can spoof its IP and skip the limit, from the host and from another container | S5: 401 x11, no 429, both sources. Matches. |
| Wide networks: "se espera", "no se ha ejecutado" | "No verificado" section, first item. Written as not verified. Matches. |
| Mistyped value trusts nobody and gives no warning; "Este caso no se ha ejecutado" | "No verificado", second item, and design RISK-03. Matches. |
| Outside Compose uvicorn defaults to `127.0.0.1`; in Compose it does not apply | design H-04 and RISK-04; S1 shows the connection arrives from `172.25.0.1`. Matches. |
| `backend/.env`, commented example in `backend/.example.env`, Compose passes it with `env_file` | `docker-compose.yml` has `env_file: ./backend/.env` for the backend service; `.example.env` contains the commented `FORWARDED_ALLOW_IPS=203.0.113.10`. Matches. |

Other checks that passed: Spanish (NC-009); no dependency, code or other file changed; no secrets; the commit message names `F003 T-03` and the branch follows EP-001; the unobserved cases are labelled as such, as the plan requires.

### R1-01: Two README statements are not covered by the T-02 record and are not marked as unverified

- **Severity:** Minor
- **Where:** `README.md`, second bullet of the section ("Con una lista concreta, uvicorn toma como IP del cliente la primera no confiada empezando por la derecha de `X-Forwarded-For`") and the first bullet ("o una lista separada por comas").
- **What is wrong:** plan T-03 says "Sin afirmaciones que el registro no respalde; lo no verificado se escribe como tal". The record never ran a comma-separated list (S2 used a single IP, S4 a CIDR) and never sent a multi-entry `X-Forwarded-For`, so the "first untrusted from the right" rule was not observed. Both come from the design (ASM-06) and from the uvicorn documentation the section links to. The plan itself asks for this wording, so the risk is low, but the README states them in the same tone as the observed facts.
- **Evidence:** "No verificado" in `t02-comprobacion-proxy.md` lists wide CIDR, mistyped value, local run and real proxy only; neither the list nor the right-to-left rule appears among the scenarios.
- **Recommended fix:** add a short "(según la documentación de uvicorn; no se ha ejecutado)" to those two statements, or leave them and let Verify cover them.

### R1-02: The correspondence between claims and S1 to S5 is not written anywhere the reviewer can see it

- **Severity:** Minor
- **Where:** commit a40325c message; plan T-03 "How it is checked".
- **What is wrong:** the plan asks to note the correspondence in the task description. The commit message only says the section was "alineada con el registro". I rebuilt the table above myself, so the check was possible, but the record of it is absent.
- **Evidence:** commit body: "F003 T-03 (AC-04.2): sección Despliegue detrás de un proxy alineada con el registro de T-02."
- **Recommended fix:** put the claim-to-scenario table in the task report or the merge description.

### R1-03: First bullet reads as an absolute and sits in tension with the last bullet

- **Severity:** Minor
- **Where:** `README.md`, first bullet ("Sin esa variable, la app no confía en ningún proxy de la red") against the fifth ("Fuera de Compose ... vale por defecto `127.0.0.1`").
- **What is wrong:** uvicorn trusts `127.0.0.1` by default, so "no confía en ningún proxy" is true only for the Compose case that S1 observed. The fifth bullet gives the exception, but a reader of the first bullet alone gets a wrong picture for a local run.
- **Evidence:** design RISK-04 and H-04; the record observed only the Compose case.
- **Recommended fix:** start the first claim with "En Compose, sin esa variable ..." or add a pointer to the last bullet.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 3 (R1-01, R1-02, R1-03)
- **Converging:** Yes (round 1)
- **Limits of this review:** I did not run Compose or any scenario; I compared the README with the T-02 record as written (version on the feature branch), with design.md@3 and with the repository files at the task commit. I did not verify the uvicorn documentation links or the uvicorn behavior directly. The record's own minor findings (S1 reset between rows) were not re-judged here. I did not read the uncommitted `decisions.md` or `state.yaml`. The review was written from the files alone and was independent: the author's reasoning was not in my context.

### 3.1 What Should Be Kept

The explicit "no se ha ejecutado" notes on wide networks and the mistyped value, the "observado con `*`" wording tied to S5, and the untouched anchor and neighbouring bullets.

---

## 4. Maintenance Guidelines

This file is never changed once written.

- The answers go in `task-T-03-r1-answers.md`, one line per finding: `R1-03: fixed (...)` or `R1-03: rejected: <reason>`. A rejection is grounded in the requirements, a decision already made, or evidence.
- After a revision, the next round is a new file with the next round number.
- A disagreement that survives a revision, or rounds that stop converging, go to the human through the feature's decisions record.

### Source of Truth

- This file is the canonical record of what this round found and its verdict.
- The answers file records how each finding was resolved.
- The target and its sources are the artifacts reviewed; this file never repeats their content.
