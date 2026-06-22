# Threat Model

**Generated:** 2026-05-23
**Companion to:** [SECURITY_RISK_REGISTER.md](./SECURITY_RISK_REGISTER.md), [SECURITY_DATA_INVENTORY.md](./SECURITY_DATA_INVENTORY.md)

STRIDE-lite per surface. Severity-bearing rows live only in the [register](./SECURITY_RISK_REGISTER.md); this doc is the *map of attack surfaces*.

## Actors

| Actor | Capability | Intent (worst case) |
|-------|-----------|---------------------|
| **Anonymous internet visitor** | hit any public URL | recon, abuse public utility surface |
| **Unauth attacker (target)** | knows a student username (e.g. `AAA1`) | brute-force the 4-digit PIN |
| **Authenticated student (other parent's child)** | valid student session for child A | read/modify child B's data (horizontal escalation) |
| **Authenticated parent (other family)** | valid parent session for parent A | read parent B's children, reports, copilot output |
| **Authenticated student (own)** | valid student session | escalate vertically (admin/dev routes), abuse rate-limited surfaces |
| **Insider with code access** | repo / Vercel access | exfiltrate secrets, deploy backdoor |
| **Malicious dependency / supply-chain** | published npm package | inject runtime code |
| **Operator misconfiguration** | env-flag mistake | accidentally enable dev backdoor in production |
| **Abuse (spam / cost)** | scripted hits to TTS / nakdan / contact | inflate cost, drown signal |

## STRIDE-lite per surface

### S1. Public marketing (`/`, `/about`, `/contact`, `/gallery`, `/game`, `/offline/*`)

| Threat | Vector | Risk row |
|--------|--------|----------|
| Tampering | XSS via reflected query, gallery rendering | R-XSS-01 |
| DoS / cost | spam on `/contact`, scripted hits on `/api/gallery` | R-PUB-01, R-RATE-01 |
| Information disclosure | accidental leakage of internal links | (low) |

### S2. Student auth (`/api/student/login`, `/student/login`, `/api/student/me`)

| Threat | Vector | Risk row |
|--------|--------|----------|
| Spoofing | brute-force PIN | **R-AUTH-01 (P0)** |
| Tampering | crafted body to bypass identity | R-AUTH-03 (admin token hardening principles) |
| Information disclosure | error messages leaking valid usernames | (suspected — confirm in doc 5) |
| DoS | login flood | R-AUTH-01, R-RATE-01 |
| Elevation | session fixation if cookie flags weak | R-COOKIE-01 |

### S3. Parent auth (Supabase auth + parent bearer)

| Threat | Vector | Risk row |
|--------|--------|----------|
| Spoofing | bearer token theft via XSS or insecure storage | R-XSS-01, R-COOKIE-01 |
| Information disclosure | `/api/parent/list-students` for wrong tenant | R-OWN-01 |
| Repudiation | no audit log of parent actions on child accounts | R-LOG-02 |

### S4. Learning APIs (`/api/learning/session/*`, `/api/learning/answer`, `/api/learning/planner-recommendation`)

| Threat | Vector | Risk row |
|--------|--------|----------|
| Tampering | crafted answer payloads to inflate mastery | (defense-in-depth; product-side scoring is server-driven) |
| Information disclosure | response leaks another student's session via missing filter | **R-RLS-01 (P1)**, R-OWN-02 |
| DoS | flood `/answer` to exhaust cost / Supabase quota | R-RATE-01 |

### S5. Parent APIs (`/api/parent/*` except copilot-turn)

| Threat | Vector | Risk row |
|--------|--------|----------|
| Spoofing | missing/invalid bearer accepted | R-OWN-01 |
| Information disclosure | parent A reads parent B's `report-data` | **R-OWN-01 (P1)** |
| Tampering | parent A modifies parent B's child via `update-student` / `delete-student` | R-OWN-01 |
| Elevation | dev backdoor on parent surface (none expected) | (verify in doc 5) |

### S6. Parent Copilot (`/api/parent/copilot-turn`)

| Threat | Vector | Risk row |
|--------|--------|----------|
| Spoofing | unauth bypass via `PARENT_COPILOT_ALLOW_UNAUTH_LOCAL_PAYLOAD` leaking to production | R-COPILOT-01 |
| Tampering | client-supplied snapshot trusted as ground truth | **R-COPILOT-01 (P0)** |
| Information disclosure | reply contains another child's data due to `studentId` mismatch | R-COPILOT-02 |
| Information disclosure | LLM hallucinates child PII or recommendations | **deferred** (see [parent-ai/final-status.md](../parent-ai/final-status.md)) |
| DoS / cost | flood Copilot to inflate LLM cost | R-RATE-01 |

### S7. Arcade (`/api/arcade/*`)

| Threat | Vector | Risk row |
|--------|--------|----------|
| Tampering | crafted action to inflate balance | R-RLS-01 (service-role usage) |
| Information disclosure | view another student's balance / room | R-OWN-02 |
| Elevation | dev coin top-up reachable in production | **R-DEV-01 (P0)** |

### S8. Hebrew utility (`/api/hebrew-nakdan`, `/api/hebrew-audio-*`)

| Threat | Vector | Risk row |
|--------|--------|----------|
| DoS / cost | unauth call flood | **R-RATE-01 (P1)** |
| Information disclosure | server logs include user-typed text → PII risk | R-LOG-02 |

### S9. Dev / admin (`/learning/dev-*`, `/api/dev-*`, `/api/learning-simulator/*`, `/api/student/dev-add-coins`)

| Threat | Vector | Risk row |
|--------|--------|----------|
| Elevation | reachable in production due to public-flag misuse | **R-AUTH-02, R-DEV-01, R-DEV-02 (P0/P1)** |
| Spoofing | non-timing-safe token compare | R-AUTH-03 |
| Information disclosure | ~~`/api/learning-supabase/health`~~ *(removed)* | R-DBG-01 closed |

### S10. Storage layer (Supabase)

| Threat | Vector | Risk row |
|--------|--------|----------|
| Information disclosure | RLS gap relied on app-layer filter only | R-RLS-01..02 |
| Elevation | service-role key leakage | R-ENV-01 (and any commit-history leak — confirm via doc 14) |

### S11. Operator / pipeline

| Threat | Vector | Risk row |
|--------|--------|----------|
| Tampering | preview deploy reachable publicly | R-VERCEL-01 |
| Spoofing | placeholder secret copied as real | **R-ENV-01 (P0)** |
| Repudiation | no audit log for env changes | (out of scope; rely on Vercel audit log) |

### S12. Supply chain

| Threat | Vector | Risk row |
|--------|--------|----------|
| Tampering | malicious npm release | R-DEP-01 |
| Information disclosure | dependency telemetry phones home | R-DEP-01 (review opt-out flags in doc 20) |

## Trust boundaries (sketch)

```
Internet
  │
  ├── public pages ── (S5/S1) ──────────────────────┐
  │                                                  │
  ├── /api/student/login (S2) ──── student cookie ──┤
  │                                                  │
  ├── /parent/login (Supabase auth, S3) ── bearer ──┤
  │                                                  │
  └── /api/{learning,parent,arcade,copilot} (S3/S4/S5/S6/S7) ──── service-role ──┐
                                                                                  │
                                                                          Supabase (S10)
                                                                                  │
                                                                          Operator (S11)
```

## Highest-impact targets (this product)

1. Cross-tenant leak between parent accounts (covers R-OWN-01, R-RLS-01).
2. Brute-force of student PIN (R-AUTH-01).
3. Dev backdoors reachable in production (R-DEV-01/02, R-AUTH-02).
4. Copilot trust pivot (R-COPILOT-01).
5. Secret leakage via env example or commit history (R-ENV-01).

Mitigations and fix sequencing live in [reports/security/security-planning-summary.md](../../reports/security/security-planning-summary.md).
