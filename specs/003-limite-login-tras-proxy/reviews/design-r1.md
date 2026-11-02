---
artifact: review
feature: F003
kind: design
target: design.md@1 (with docs/adr/ADR-0001-confianza-en-cabeceras-de-proxy-delegada-en-uvicorn.md, proposed)
sources: [brief.md@1, requirements.md@1, decisions.md, .sdd/constitution.md, .sdd/stack.yaml, .sdd/architecture.md, .sdd/product.md, .sdd/roadmap.md, .sdd/skills.yaml]
round: 1
verdict: changes-required
---

# Review: design.md@1, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 1. Earlier Findings

Not applicable in round 1.

---

## 2. Findings

### R1-01: The `*` value is described as unsafe only with port 8000 exposed, but with `*` the client IP is the leftmost, client-controlled entry even behind a proxy

- **Severity:** Blocking
- **Where:** design.md#IF-01 (Guarantees), design.md section 8 (second row of the failure table), ADR-0001 section 5 and its "Option A" pros
- **What is wrong:** IF-01 says that "con la lista de confianza" the resulting IP is the first untrusted one from the right, so a client cannot choose it by prepending values. It then says `*` "confía en cualquier conexión y no debe usarse con el puerto 8000 accesible", which implies `*` is safe when the proxy is the only way in. In uvicorn 0.47.0 `*` takes a different path (`always_trust`): the client address is the FIRST (leftmost) element of `X-Forwarded-For`. A proxy that appends the real IP (nginx `$proxy_add_x_forwarded_for`, Caddy, Traefik) leaves whatever the client sent on the left, so with `*` any client can pick its own IP even with port 8000 closed. The design's guarantee therefore does not hold for the `*` value. The same applies to a network wide enough to include real clients. This matters because the design is the basis for T-03 (README), RISK-01 has High impact, and the README's current warning ("si el 8000 queda accesible... y es amplio o `*`") has the same gap. AC-04.2 needs the documentation to match what is observed, and AC-04.1 and REQ-04 ask for a warning against over-broad values.
- **Evidence:** `backend/.venv/Lib/site-packages/uvicorn/middleware/proxy_headers.py:163-164`: `if self.always_trust: return _parse_host_port(x_forwarded_for_hosts[0])`. The right-to-left walk (lines 166-170) only runs when `always_trust` is false. The design's own experiment (section 1) covers neither `*` nor a proxy that appends to a client-supplied header.
- **Recommended fix:** Correct IF-01, the failure table and ADR-0001 so that the right-to-left guarantee applies only to explicit IPs or networks. State that `*` (or a network that includes clients) lets any client forge its IP regardless of whether 8000 is exposed. Add this case to T-02 (or declare it not verified) and to the T-03 README text.

### R1-02: The design does not say how AC-02.3 is run, and ASM-05's simulation (a single client on the host acting as the proxy) cannot produce it

- **Severity:** Minor
- **Where:** design.md#ASM-05, design.md#NFR-01, design.md section 11 (T-02), design.md section 8 (second and third rows)
- **What is wrong:** AC-02.3 needs a proxy de confianza configured and, at the same time, a connection from a different, non-trusted source sending `X-Forwarded-For`. ASM-05 only has the host-side client (which Compose presents as the bridge gateway IP) play the proxy. With the list including that IP, the host cannot also be the untrusted connection. Without a second source IP (another container on the network, a second network, or similar) AC-02.3 would fall back to the AC-01.1 scenario, which does not exercise "trusted proxy configured". The row "Valor demasiado amplio" also says it is detected by "AC-02.3 con esa configuración", which does not match how AC-02.3 is defined.
- **Evidence:** requirements.md AC-02.3 (Given a proxy de confianza configurado / When una conexión que no procede del proxy...) against design.md ASM-05 and NFR-01 ("IPs de origen distintas simuladas mediante X-Forwarded-For desde el host").
- **Recommended fix:** In the design, name the mechanism for the second source (for example a second container with a different IP) or state that AC-02.3 will be declared not verified if it cannot be built. Reword the failure-table row so it points to the right check.

### R1-03: OQ-02 narrows REQ-01 and CON-01 for local runs and is settled by default, but the requirements were approved without that limit

- **Severity:** Minor
- **Where:** design.md#OQ-02, design.md#RISK-04, design.md section 9.1 (default value in the Dockerfile), decisions.md section 3 (row 2)
- **What is wrong:** REQ-01 and CON-01 (human-approved) say that by default no proxy is trusted. With uvicorn's default `127.0.0.1`, that is false for a process started locally behind a proxy on the same machine: the header is honored. The design records this as a default-proposed open question and as a "decided along the way" row, with no human decision, and section 12 says "Coverage gaps: None". For Compose, the only context in the brief (section 2), the effect is nil, so this is not blocking. But the deviation from the approved wording of the contract should be a decision the human sees, not one the design closes on its own.
- **Evidence:** proxy_headers.py line 23 (`trusted_hosts ... = "127.0.0.1"`) and config.py:344 against requirements.md REQ-01 and brief.md CON-01. The `FORWARDED_ALLOW_IPS=""` alternative in the Dockerfile was discarded for being unnecessary in Compose, not because it is wrong.
- **Recommended fix:** Put OQ-02 to the human in decisions.md as an explicit choice (document the limit, or set the empty value) and, if the limit stays, note that REQ-01 holds in the Compose context only.

### R1-04: NFR-02 names the existing backend suite as verification, but no existing test checks the limit values

- **Severity:** Minor
- **Where:** design.md#NFR-02 (Verified by), requirements.md NFR-02 (Verify)
- **What is wrong:** The design says NFR-02 is verified by `git diff main` on `limiter.py` and the decorators, and by `uv run pytest -q`. The only reference to the limiter in `backend/tests/test_api.py` is `limiter.reset()` (line 118). A search for `429` finds nothing in the tests, so the suite passing does not show that the 10/min and 20/min limits are unchanged. The diff alone does.
- **Evidence:** `backend/tests/test_api.py`: only lines 20 and 118 mention the limiter; no `429` assertion in `backend/tests`.
- **Recommended fix:** Make the diff the verification of NFR-02, with the suite as a regression check only. Or let T-02 record the observed 429 counts against 10/min and 20/min.

### R1-05: The example value of `FORWARDED_ALLOW_IPS` is left unspecified, although a wide example would work against the warning

- **Severity:** Minor
- **Where:** design.md#C-03, design.md section 11 (T-01)
- **What is wrong:** C-03 asks for "una red de ejemplo que no es un comodín". Common ranges used in Docker examples (`172.16.0.0/12`, `10.0.0.0/8`) are wide and can include real clients or other containers, which is what RISK-01 and the README warn against. The design leaves the choice to the plan, which could make the example copyable but over-broad.
- **Evidence:** design.md C-03 and RISK-01 (brief.md@1); AC-04.1 only requires "no es un comodín".
- **Recommended fix:** State in the design that the example is the narrowest realistic network (a single IP or a small CIDR) and that the note says to replace it with the proxy's address.

---

## 3. Verdict

- **Verdict:** Changes required
- **Blocking findings:** 1 (R1-01)
- **Minor findings:** 4 (R1-02, R1-03, R1-04, R1-05)
- **Converging:** Not applicable in round 1
- **Limits of this review:** I did not execute anything: not the experiment in design.md section 1, not Compose, and not the backend tests. Behavior of uvicorn is judged from reading `proxy_headers.py` and `config.py` (0.47.0) in `backend/.venv`. I did not read `.sdd/` files in full, only checked the design's references to them against the code and the feature files. The README text was checked only in the "Despliegue detrás de un proxy" section. The review is independent: the author's reasoning was not available to me.

### 3.1 What Should Be Kept

- The decision to add no application code and to delegate trust to uvicorn (ADR-0001) fits the requirements, PR-004 and NC-008. The three-option comparison is fair and the rejection of option C is well grounded.
- C-01 and the failure-mode rows for mistyped values correctly describe uvicorn's behavior (a malformed value is kept as a literal and trusts nobody, fails closed). This matches `_TrustedHosts` (lines 117-138).
- The task list is small, covers every AC, and the T-02 to T-03 dependency makes the README follow what was observed.

---

## 4. Maintenance Guidelines

This file is never changed once written.

- The answers go in `design-r1-answers.md`, one line per finding: `R1-03: fixed (design.md@3)` or `R1-03: rejected: <reason>`. A rejection is grounded in the requirements, a decision already made, or evidence.
- After a revision, the next round is a new file with the next round number.
- A disagreement that survives a revision, or rounds that stop converging, go to the human through the feature's decisions record.

### Source of Truth

- This file is the canonical record of what this round found and its verdict.
- The answers file records how each finding was resolved.
- The target and its sources are the artifacts reviewed; this file never repeats their content.
