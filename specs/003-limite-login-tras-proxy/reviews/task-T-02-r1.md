---
artifact: review
feature: F003
kind: task
target: task/003-T-02@e25fbba
sources: [plan.md@1 (T-02), requirements.md@1, design.md@3, .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: task/003-T-02@e25fbba, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 2. Findings

Diff reviewed: `git diff feature/003-limite-login-tras-proxy...task/003-T-02`. It has one commit (e25fbba) and one file, `specs/003-limite-login-tras-proxy/evidence/t02-comprobacion-proxy.md` (81 lines added). That is exactly the file list of T-02. The merge base equals the feature branch tip (b64f74c).

Checks that passed:

- **Delivers:** the record has a verdict for AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-02.3, AC-03.1, AC-03.2, NFR-01 and NFR-02. Each verdict points to a scenario row, and the observed sequences support it: 401 x10 then 429 at the 11th for login and token, 401 x20 then 429 at the 21st for refresh, B at 401 after A is exhausted, the untrusted container at 429, and `*` giving no 429. The expected result in the plan matches what was recorded in every scenario.
- **Plan steps:** the record covers the environment (Docker version, gateway IP, container IPs), the commands, the observed sequences, a "No verificado" section, the S5 extra scenario and the cleanup. S4 uses `172.25.0.0/31`, which includes the gateway `.1` and excludes `.2` to `.4`, as ASM-06 asks. ASM-05 is confirmed with an access-log line.
- **NFR-02:** I ran `git diff main -- backend/app/core/limiter.py backend/app/features/auth/router.py` and it is empty. `git diff main...task/003-T-02 -- backend` is also empty.
- **Safety and project rules:** the invented credentials (`nadie` / `x`) contain no secrets. The maintainer's `backend/.env`, containers and volumes were not touched. No dependencies were added (NC-008). The text is in Spanish (NC-009). The commit message names `F003 T-02` (EP-002) and the branch name follows EP-001.
- **Honesty (PR-002):** CIDR networks wider than /31, a mistyped value, a run without Docker, and a real proxy are declared not verified instead of claimed.

### R1-01: S1 does not say that the counters were reset between its two rows

- **Severity:** Minor
- **Where:** `specs/003-limite-login-tras-proxy/evidence/t02-comprobacion-proxy.md`, "Entorno" (the line on recreating the service) and "S1".
- **What is wrong:** the record says the backend was recreated "entre escenarios". Plan T-02 step 3 requires a recreate between the two S1 rows too (with header, then without). Both rows use the same connection IP (`172.25.0.1`). Without a reset, the second row could not show 401 x10, so the observed sequence only holds if a reset happened. The record does not state it, so a reader of Verify cannot tell whether the second row is valid.
- **Evidence:** S1 row 2 reports "401 x10, 429" right after row 1 exhausted the same per-IP counter. The "Entorno" paragraph only mentions recreating between scenarios.
- **Recommended fix:** state that the service was recreated between the two S1 rows, or note it when Verify repeats the run.

### R1-02: The record shows the commands only in outline

- **Severity:** Minor
- **Where:** `specs/003-limite-login-tras-proxy/evidence/t02-comprobacion-proxy.md`, "Escenarios y resultados".
- **What is wrong:** plan step 4 asks for "el comando de cada escenario". The record gives one `curl` template, and a one-line description for `token`, `refresh` and the second container. It does not show the loop that varies `X-Forwarded-For`, nor the Python snippet of the second container. That makes the record harder for Verify to repeat exactly.
- **Evidence:** the S3 and S5 rows reference "`urllib` de la propia imagen" with no script.
- **Recommended fix:** add the loop and the snippet, or reference where Verify can take them from.

### R1-03: Wording of NFR-01 verdict

- **Severity:** Minor
- **Where:** `specs/003-limite-login-tras-proxy/evidence/t02-comprobacion-proxy.md`, verdict table, NFR-01 row.
- **What is wrong:** the row says "Nada declarado no verificado", while the file has a "No verificado" section. The statement is true only for AC-01.1, AC-02.1 and AC-02.3 (the NFR-01 target), but it reads as if nothing is unverified.
- **Evidence:** "No verificado" lists four items, none of them in the NFR-01 target.
- **Recommended fix:** say "nada declarado no verificado de AC-01.1, AC-02.1 y AC-02.3".

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 3 (R1-01, R1-02, R1-03)
- **Converging:** Yes (round 1)
- **Limits of this review:** I did not re-run the Compose scenarios, so I could not confirm the observed status sequences myself. I judged the record for consistency with the plan, the design (ASM-05, ASM-06, IF-01) and the requirements, and I checked only the NFR-02 diff by running it. Verify repeats the run. I did not compare against `decisions.md` or `state.yaml`, which have uncommitted changes in the main working tree. This review was written from the files alone. The task and the commit message were not part of my context before the review, so it is independent.

### 3.1 What Should Be Kept

The "No verificado" section, the confirmation of the gateway IP from the access log, and the S5 scenario with `*` (which supports the README warning in T-03).

---

## 4. Maintenance Guidelines

This file is never changed once written.

- The answers go in `task-T-02-r1-answers.md`, one line per finding: `R1-03: fixed (...)` or `R1-03: rejected: <reason>`. A rejection is grounded in the requirements, a decision already made, or evidence.
- After a revision, the next round is a new file with the next round number.
- A disagreement that survives a revision, or rounds that stop converging, go to the human through the feature's decisions record.

### Source of Truth

- This file is the canonical record of what this round found and its verdict.
- The answers file records how each finding was resolved.
- The target and its sources are the artifacts reviewed; this file never repeats their content.
