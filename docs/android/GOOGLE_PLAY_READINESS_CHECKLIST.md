# Google Play Readiness Checklist

**Date:** 2026-05-31  
**Status:** Readiness documentation only — **NOT submitting to Google Play in this phase**  
**App:** LEO K (`com.leok.kids`)  
**Production URL:** `https://liosh-website.vercel.app`

---

## Publishing Gate (Hard Rules)

- **Do not publish to Google Play.**
- **Do not create a Play Console release.**
- **Do not upload AAB/APK to Google Play.**
- **Do not configure the store listing without explicit owner approval.**
- All items below are readiness documentation for a future phase.

---

## 1. WebView Policy Review

Google Play restricts low-value WebView wrapper apps. Before any submission:

| Check | Status | Notes |
|-------|--------|-------|
| App owned by same owner as website | Ready | First-party LEO K learning product |
| Provides real learning product experience | Ready | Full platform: activities, games, reports, parent/school portals |
| Not affiliate/referral traffic | Ready | No third-party referral or ad-driven traffic |
| Remote-URL mode disclosed | Required | Document that app loads production web app via Capacitor WebView |
| Policy risk assessment | **Medium** | WebView apps face scrutiny; TWA may be preferable for Play Store |
| Policy reference | — | [Google Play WebView app policy](https://support.google.com/googleplay/android-developer/answer/9888379) |

**Recommendation:** Before Play submission, evaluate Trusted Web Activity (TWA) as an alternative to Capacitor remote-URL for better Play policy alignment.

---

## 2. Google Play Families Policy

Product is for children/students/parents. Families policy applies if target audience includes children under 13.

### Target audience declaration

| Item | Required declaration |
|------|---------------------|
| Primary audience | Children ages 6–12 (learning platform) |
| Mixed audience | Yes — parents, teachers, school staff also use the app |
| Directed to children | Likely **yes** or **mixed audience** — triggers Families policy review |

### Families policy requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| No behavioural advertising | **Pass** | No ad SDKs in app or website |
| No interest-based ads to children | **Pass** | No ads at all |
| Privacy policy covers child data | **Review needed** | Verify `/privacy` covers student activity data, PIN login, parent accounts |
| Comply with applicable child privacy laws | **Review needed** | COPPA (US), GDPR-K (EU) if applicable to user base |
| No social features without parental gate | **Pass** | No open social/chat features |
| Teacher approved content only | **Pass** | Content is curriculum-based, teacher/parent assigned |
| Data collection minimized for children | **Review needed** | Document exactly what student data is collected |

### Student / child data disclosures

Data collected from students (via app/web):

| Data type | Collected | Purpose | Play Data Safety category |
|-----------|-----------|---------|--------------------------|
| Student username/code | Yes | Login authentication | Personal info |
| PIN (hashed) | Yes | Login authentication | Personal info |
| Activity answers | Yes | Learning progress tracking | App activity |
| Session data | Yes | Maintain login state | App activity |
| Learning progress/scores | Yes | Reports for parents/teachers | App activity |
| Device identifiers | No | — | — |

### School / parent account data disclosures

| Data type | Collected | Purpose | Play Data Safety category |
|-----------|-----------|---------|--------------------------|
| Parent email | Yes | Account authentication | Personal info |
| Parent name | Yes | Account profile | Personal info |
| Student reports | Yes | Parent dashboard | App activity |
| Assigned activities | Yes | Parent/teacher workflow | App activity |
| School staff email | Yes | Staff authentication | Personal info |
| Class/student assignments | Yes | School portal | App activity |

### Data Safety form readiness

| Data Safety section | Status |
|--------------------|--------|
| Data collection declared | Draft ready (see tables above) |
| Data sharing declared | Supabase (backend); no third-party sharing for ads |
| Security practices | HTTPS, HttpOnly cookies, CSP headers |
| Data deletion | `/data-deletion` page exists — verify content |
| Encryption in transit | Yes (HTTPS) |
| Encryption at rest | Supabase-managed |

---

## 3. Privacy Policy

| Item | Status | URL |
|------|--------|-----|
| Privacy policy page exists | **Pass** | `https://liosh-website.vercel.app/privacy` |
| Publicly accessible | **Verify before submission** | Must load without login |
| Covers child/student data | **Review needed** | Owner review of Hebrew policy text |
| Data deletion page | **Pass** | `https://liosh-website.vercel.app/data-deletion` |
| Terms of service | **Pass** | `https://liosh-website.vercel.app/terms` |

---

## 4. App Content Rating

| Item | Expected |
|------|----------|
| Rating system | IARC (via Play Console questionnaire) |
| Expected rating | Everyone / PEGI 3 / ESRB Everyone |
| Violence | None |
| User interaction | None (no chat/social) |
| Shares location | No |
| Shares personal info | Yes (account data — declare in questionnaire) |
| Digital purchases | No (unless added later) |

---

## 5. Store Listing Requirements

| Asset | Requirement | Status |
|-------|-------------|--------|
| App icon (512×512 PNG) | High-res, no transparency issues | Source: `public/images/leo-icons/icon-512.png` |
| Feature graphic | 1024×500 px | **Not created** |
| Phone screenshots | Minimum 2 | **Not created** — capture from Android device |
| 7" tablet screenshots | Minimum 1 | **Not created** |
| Short description | Max 80 characters | **Not written** |
| Full description | Max 4000 characters | **Not written** (Hebrew + English recommended) |
| App category | Education | — |
| Contact email | Owner email required | **Owner to provide** |
| Privacy policy URL | Required | `https://liosh-website.vercel.app/privacy` |

---

## 6. Release and Testing Requirements

### 12-tester closed testing rule

**Important:** If the owner opens a **new personal Google Play developer account**, Google may require:

- A **closed test track** with at least **12 testers opted in**
- Testers must remain opted in for a minimum of **14 continuous days**
- Only after this period is **production access** granted

**Plan for this in advance.** Do not assume immediate production publication is available for a new developer account.

### Release track path (future)

```
Internal Test → Closed Test (12+ testers, 14 days) → Open Test → Production
```

| Track | Purpose | When |
|-------|---------|------|
| Internal Test | Developer team only (up to 100) | First upload |
| Closed Test | Selected testers (12+ for new accounts) | Before production |
| Open Test | Public beta | Optional |
| Production | Public release | After all checks pass + owner approval |

---

## 7. Signing (Future — Not Executed)

| Item | Recommendation |
|------|---------------|
| Signing approach | Google Play App Signing (Google manages app signing key) |
| Upload key | Owner generates locally, never commits to repo |
| Keystore location | Owner machine only — outside repo |
| `*.jks` / `*.keystore` | Added to `.gitignore` |
| Signing passwords | Owner-managed only — never in repo, docs, logs, or screenshots |

---

## 8. Technical Readiness (Future Play Release)

| Item | Current status | Action before Play |
|------|---------------|-------------------|
| Capacitor remote-URL mode | Working for debug APK | Evaluate TWA alternative |
| Release AAB build | Not built | `./gradlew bundleRelease` with signing config |
| Icon per-density optimization | Debug quality | Generate proper density icons |
| Splash screen | Default Capacitor | Customize with Leo K branding |
| Push notifications | Not implemented | Not planned (per scope) |
| Android permissions | INTERNET only | Verify no plugins add permissions |
| Target SDK | 36 | Keep current at submission time |
| 64-bit support | Required by Play | Capacitor 8 supports by default |

---

## 9. Pre-Submission Checklist (Future)

Use this when owner approves Play Store submission:

- [ ] Owner approves Play Store submission explicitly
- [ ] WebView policy review completed and documented
- [ ] Families policy compliance verified
- [ ] Privacy policy reviewed and updated for child data
- [ ] Data Safety form completed in Play Console
- [ ] IARC content rating questionnaire completed
- [ ] Target audience declared (children/mixed)
- [ ] Store listing assets created (screenshots, feature graphic, descriptions)
- [ ] Release AAB built and signed with upload key
- [ ] Closed test track set up with 12+ testers (if new developer account)
- [ ] 14-day closed test period completed (if required)
- [ ] Device QA matrix in `ANDROID_QA_REPORT.md` all Pass
- [ ] No secrets or keystore files in repo

---

## Summary

This checklist is **complete as readiness documentation**. No Google Play submission, release, or store listing configuration has been performed. All Play Store steps require explicit owner approval in a future phase.
