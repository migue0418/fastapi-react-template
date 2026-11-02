---
artifact: review
feature: F003
kind: design
target: design.md@2 (with docs/adr/ADR-0001-confianza-en-cabeceras-de-proxy-delegada-en-uvicorn.md, proposed)
sources: [brief.md@1, requirements.md@1, decisions.md, .sdd/constitution.md, .sdd/stack.yaml, .sdd/architecture.md, .sdd/product.md, .sdd/roadmap.md, .sdd/skills.yaml]
round: 2
verdict: approve
---

# Review: design.md@2, round 2

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 1. Earlier Findings

| Finding | Answer | Status | Note |
|---|---|---|---|
| R1-01 | Fixed | Resolved | IF-01 now limits the right-to-left guarantee to explicit IPs or networks and says `*` (and wide networks) let a client forge its IP even with port 8000 closed. This matches `uvicorn/middleware/proxy_headers.py:163-164` (`always_trust` returns the first entry) and 166-170 (right-to-left walk). The failure table has rows for `*` and wide networks, T-02 adds the `*` scenario, T-03 carries the warning, and ADR-0001 sections 3 and 5 are corrected. |
| R1-02 | Fixed | Resolved | ASM-05 and NFR-01 name a second container on the project network as the untrusted source for AC-02.3, with "not verified" as the fallback. The failure-table rows point to the right checks. See R2-01 for a detail left open. |
| R1-03 | Fixed | Resolved | OQ-02 is resolved by the human decision H-04 (decisions.md, "Documentar el límite"). Design 9.1 and 12 say REQ-01 and CON-01 hold in the Compose context, the only one in the brief. |
| R1-04 | Fixed | Resolved | NFR-02 is verified by the diff on `core/limiter.py` and `features/auth/router.py` plus the 429 counts observed in T-02; the suite is only a regression check. (The approved requirements.md NFR-02 "Verify" still mentions existing limit tests; the design's mechanism is stronger, so this is not a conflict.) |
| R1-05 | Fixed | Resolved | C-03 and T-01 require the narrowest realistic value and a note to replace it, and forbid `*`, `10.0.0.0/8` and `172.16.0.0/12`. |

---

## 2. Findings

### R2-01: AC-03.1 runs the trusted value as a network, which can include the second container that AC-02.3 needs as untrusted

- **Severity:** Minor
- **Where:** design.md#NFR-01, design.md#ASM-05, design.md#ASM-06, design.md section 11 (T-02)
- **What is wrong:** ASM-06 says T-02 runs a CIDR network in AC-03.1, and NFR-01 uses a second container "fuera de la lista de confianza" for AC-02.3. On a Compose bridge the host connection (gateway) and the second container sit in the same subnet. If the network used in the list covers the subnet, the second container is trusted and AC-02.3 would pass or fail for the wrong reason. The design does not say that the network must contain the gateway and exclude the other container.
- **Evidence:** design.md ASM-05 (the gateway IP and the second container are on the same network, with different IPs) against ASM-06 (T-02 "lo ejecuta con una red en AC-03.1"); `_TrustedHosts.__contains__` (proxy_headers.py:123-135) trusts any IP inside a listed network.
- **Recommended fix:** In the plan for T-02, state that the AC-03.1/AC-02.3 value is a single IP or the smallest network that includes the gateway and excludes the second container, and that the CIDR-format check (ASM-06) is done in a separate step if needed.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 1 (R2-01)
- **Converging:** Yes. The round-1 blocking finding is resolved and the revision introduced no blocking finding.
- **Limits of this review:** I did not execute anything: not the experiment in design.md section 1, not Compose, not the backend tests. uvicorn behavior was judged from `config.py:344` and `proxy_headers.py` (0.47.0) in `backend/.venv`; README, Dockerfile and compose were checked only where the design cites them (`env_file` line 28, port 8000, `CMD` without `--forwarded-allow-ips`). I did not read the `.sdd/` files in full. The review is independent: the author's reasoning was not available to me.

### 3.1 What Should Be Kept

- The corrected IF-01 guarantee (explicit list versus `*`) and the matching ADR-0001 text; they are accurate to the code.
- The failure table with the closed-fail rows for malformed values, `*` and wide networks.
- Three small tasks with T-03 depending on T-02, so the README states only what was observed.

---

## 4. Maintenance Guidelines

This file is never changed once written.

- The answers go in `design-r2-answers.md`, one line per finding: `R2-01: fixed (design.md@3)` or `R2-01: rejected: <reason>`. A rejection is grounded in the requirements, a decision already made, or evidence.
- After a revision, the next round is a new file with the next round number.
- A disagreement that survives a revision, or rounds that stop converging, go to the human through the feature's decisions record.

### Source of Truth

- This file is the canonical record of what this round found and its verdict.
- The answers file records how each finding was resolved.
- The target and its sources are the artifacts reviewed; this file never repeats their content.
