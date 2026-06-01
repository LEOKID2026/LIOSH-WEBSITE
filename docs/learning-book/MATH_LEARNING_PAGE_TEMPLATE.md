# Math Learning Page — Template

**Status:** Documentation only. No code implemented. No SQL executed. No commits made.
**Date:** June 2026
**Purpose:** Reusable structure for future Math learning page authoring.
            Apply the correct age-band template based on the student's grade.
**Language:** English structure. All content fields will be authored in Hebrew.
             Hebrew title examples are draft suggestions only.
             All Hebrew labels below are marked `[DRAFT — not owner-approved]`.

---

## How to Use This Template

1. Identify the target `grade` and `skill_id` for the page being authored.
2. Look up the recommended `page_type` in `MATH_LEARNING_BOOK_CURRICULUM_MAP.md`.
3. Select the age-band template that matches the grade:
   - Grades 1–2 → use Section A
   - Grades 3–4 → use Section B
   - Grades 5–6 → use Section C
4. Fill in all required fields. Mark all optional fields clearly.
5. Write the `title_hebrew` as a draft. It must be approved by the product owner before
   `approval_status` can be set to `"approved"` or `"active"`.

---

## Content Model Reminder

```
learning_page_id    "math:{grade}:{skill_id}"   e.g. "math:g1:add_two"
skill_id            Must match data/curriculum-spine/v1/skills.json
grade               g1 | g2 | g3 | g4 | g5 | g6
subject             "math"
title_hebrew        [DRAFT — not owner-approved]
page_type           concept_foundation | visual_intuition | step_by_step_procedure |
                    word_problem_strategy | practice_bridge | mixed | needs_review
age_band            grades_1_2 | grades_3_4 | grades_5_6
approval_status     draft | review | approved | active
```

---

## Section A — Grades 1–2 Template

**Design principles:**
- Short sentences; active voice
- Always anchor to a concrete visual (number line, objects, drawings)
- One concept only per page
- Avoid technical terms unless the child has already seen them
- Maximum one "watch out" note
- No formal notation beyond a simple number sentence (a + b = c)

---

### A.1 — What Are We Learning?

> **Purpose:** State the topic in one or two simple child-facing sentences.
> Write as if speaking directly to the child. Use "we" or "you."

**Template:**
```
היום נלמד [topic name in Hebrew, simple language].
[One sentence: when does this come up in everyday life — coins, steps, blocks, etc.]
```

**Example for `add_two` Grade 1:**
> "[DRAFT — not owner-approved]"
> היום נלמד לחבר שני מספרים.
> כשאנחנו מאחדים שתי קבוצות יחד — זה חיבור!

---

### A.2 — Simple Explanation

> **Purpose:** Explain the concept in 2–4 short sentences.
> Use one concrete anchor (object, story, picture).
> No sub-rules or exceptions here.

**Template:**
```
[Concept in 1 sentence — what it means]
[Concrete anchor — connect to something the child knows]
[Show the number sentence format that will be used]
```

**Example for `ns_complement10` Grade 1:**
> "[DRAFT — not owner-approved]"
> יש זוגות מספרים שמתחברים ל-10.
> חשבו על 10 קוביות בשורה. אם יש 3 קוביות כחולות, כמה קוביות כתומות חסרות?
> 3 + 7 = 10. הזוג של 3 הוא 7!

---

### A.3 — Visual or Concrete Example

> **Purpose:** A diagram, drawing description, or visual sequence the author can replicate.
> Describe exactly what should be drawn or shown.
> This section is visual-first — minimum words, maximum picture.

**Template:**
```
[Description of visual: what to draw or show]
[Label or caption for the visual]
[Optional: how the child should interact with it — trace, count, circle]
```

**Guidance notes:**
- Number lines: always show 0 at left, mark the start and end of the jump
- Arrays: draw dots in rows × columns, label each row count
- Ten-frames: 2 rows of 5 boxes; fill some with dots
- Base-10 rods: a long bar = 10, small cube = 1
- Object illustrations: simple shapes (circles, stars) with counts labeled

---

### A.4 — Let's Solve Together

> **Purpose:** One worked example, solved step by step with narration.
> Use the same visual anchor from A.3 if possible.
> Show each step on its own line.

**Template:**
```
שאלה: [the worked problem]
שלב 1: [first step — what to do and why]
שלב 2: [second step]
[...additional steps as needed, max 3 for grades 1–2]
תשובה: [final answer with the complete number sentence]
```

**Example:**
> "[DRAFT — not owner-approved]"
> שאלה: 6 + 4 = ?
> שלב 1: מסמנים את 6 על ציר המספרים.
> שלב 2: קופצים 4 צעדים קדימה.
> תשובה: נחתנו על 10. אז 6 + 4 = 10.

---

### A.5 — Try One

> **Purpose:** One practice question the student solves independently.
> Use the exact same structure as the worked example.
> Do not add new concepts.

**Template:**
```
עכשיו תנסו בעצמכם:
[single practice question]
[optional: hint in parentheses if the question type is new]
```

---

### A.6 — Common Mistake

> **Purpose:** Name and show one typical error, then show the correct approach.
> Keep this brief (2–3 lines max).
> Do not use negative language. Frame as "easy to mix up" rather than "wrong."

**Template:**
```
שימו לב — קל לתעות כאן:
[show the common error]
[show the correct version]
[one-line explanation of why]
```

**Example for `cmp` Grade 1:**
> "[DRAFT — not owner-approved]"
> שימו לב: 7 > 4 אבל 4 < 7. הפה של הסמל תמיד פונה לצד המספר הגדול יותר.

---

### A.7 — Go Practice

> **Purpose:** A brief invitation to move to the practice activity.
> One or two lines only. Friendly, encouraging tone.

**Template:**
```
מוכנים לתרגל?
[one line connecting to the activity type or skill name]
```

---

## Section B — Grades 3–4 Template

**Design principles:**
- Introduce the formal procedure name
- Show numbered steps clearly — the student should be able to follow them without a teacher
- At least one fully worked example
- One "common mistake" section
- May reference previously learned skills briefly
- Language may be slightly more formal than Grades 1–2 but still accessible

---

### B.1 — What Is the Topic?

> **Purpose:** Name the topic and place it in context of what the student already knows.

**Template:**
```
[Topic name in Hebrew — use the classroom term the student would know]
[1–2 sentences: what type of calculation or thinking is involved]
[1 sentence: how this connects to a skill from a previous grade]
```

---

### B.2 — When Do We Use It?

> **Purpose:** Give 2–3 real-world or school-problem contexts where this skill appears.
> Not a list of use cases — a short narrative or mini-scenario.

**Template:**
```
משתמשים ב-[skill] כאשר:
• [context 1 — concrete, grade-appropriate]
• [context 2 — slightly more abstract]
• [context 3 — optional, connects to another subject or everyday situation]
```

---

### B.3 — How Do We Start?

> **Purpose:** Describe the setup or reading step before computation begins.
> For algorithms: describe how to write the numbers on paper.
> For word problems: describe how to identify what is given and what is asked.

**Template:**
```
לפני שמחשבים:
[setup instruction — how to arrange the numbers or read the problem]
[what to identify first]
```

---

### B.4 — Step-by-Step Solution

> **Purpose:** Numbered algorithm or strategy steps. 3–6 steps maximum.
> Each step is one action. No compound steps ("do X and also Y" → split into two).

**Template:**
```
שלב 1: [action + brief reason]
שלב 2: [action]
שלב 3: [action]
[...continue to max 6 steps]
```

---

### B.5 — Worked Example

> **Purpose:** Apply the steps from B.4 to a specific numbers problem.
> Show each step with the actual numbers, not just abstract descriptions.

**Template:**
```
דוגמה: [the problem written out]
שלב 1: [step with actual numbers]
שלב 2: [step with actual numbers]
...
תשובה: [complete answer with the full number sentence]
בדיקה: [optional — quick check strategy appropriate for the grade]
```

---

### B.6 — Common Mistake

> **Purpose:** Show one specific, realistic error — not a vague warning.
> Show the mistake, label it, and show the correct version side by side.

**Template:**
```
טעות נפוצה:
❌ [show the incorrect work or answer]
[Brief label: "כאן שכחו ל..."]
✓ [show the correct version]
```

---

### B.7 — Check Your Answer

> **Purpose:** Teach one verification strategy appropriate for the skill and grade.
> Not "look at it again" — a concrete check.

**Template:**
```
איך בודקים?
[1 sentence: the check strategy]
[demonstrate the check on the worked example from B.5]
```

**Examples by skill type:**
- Addition check: subtract the addend from the sum → should get the other addend
- Division check: multiply quotient × divisor + remainder → should get dividend
- Equation check: substitute the answer back into the sentence
- Estimation check: round both numbers and verify the result is in the expected range

---

### B.8 — Practice

> **Purpose:** 2–3 practice problems without worked solutions.
> Must be within the grade's number range (see `utils/math-constants.js`).

**Template:**
```
נסו בעצמכם:
1. [problem]
2. [problem]
3. [problem — optional, may be slightly harder]
```

---

## Section C — Grades 5–6 Template

**Design principles:**
- Begin with strategy identification ("what type of problem is this?")
- Include strategy selection when multiple methods exist
- Include a reasonableness check as a required step, not optional
- Multiple solution paths may be shown where they exist
- Language is more formal and classroom-aligned
- Connect explicitly to prior learning

---

### C.1 — Core Idea

> **Purpose:** State the mathematical principle or definition clearly.
> This should read like a short, precise definition — not a story.

**Template:**
```
[Topic name — formal Hebrew term]
[Definition or principle in 1–2 sentences]
[The formula or symbolic representation, if applicable]
[Connection to prior learning: "this extends... / this generalizes..."]
```

---

### C.2 — How to Identify the Question Type

> **Purpose:** Teach the student to recognize when this skill applies.
> This is the "reading the problem" step — before any calculation.

**Template:**
```
שאלה מסוג זה מופיעה כאשר:
• [signal word or phrase in the problem — what to look for]
• [structural clue — e.g., "the problem asks for the total of...", "there are two unknowns..."]
• [common misidentification: "do not confuse this with... because..."]
```

---

### C.3 — Strategy Selection

> **Purpose:** Present the decision point: which method to use and why.
> Use a brief comparison if two valid strategies exist.

**Template:**
```
יש [number] דרכים לפתור שאלה כזו:
דרך 1: [strategy name] — מתאימה כאשר [condition]
דרך 2: [strategy name] — מתאימה כאשר [condition]
[recommendation: "בשאלות מסוג זה מומלץ להשתמש ב-..."]
```

If only one strategy applies, explain why alternatives do not work here.

---

### C.4 — Step-by-Step Solution

> **Purpose:** Same as B.4 but may be longer (up to 8 steps) and include
> sub-decisions within steps.

**Template:**
```
שלב 1: [action — identify givens and unknowns]
שלב 2: [action — set up the expression or equation]
שלב 3: [action — first computation]
שלב 4: [action — continue]
...
שלב N: [final computation]
תשובה: [complete answer]
```

---

### C.5 — Reasonableness Check

> **Purpose:** A required step — not optional. Train the student to verify
> that their answer makes sense in context.
> This is NOT the same as the algebraic check in B.7 — it is a contextual sanity check.

**Template:**
```
בדיקת סבירות:
[question to ask: "האם התשובה הגיונית?"]
[estimation or bounding argument: "הגודל אמור להיות בין X ל-Y כי..."]
[conclusion: "כן, [answer] סביר" or flag if not]
```

---

### C.6 — Common Mistakes

> **Purpose:** Up to two common mistakes for complex skills.
> Show incorrect work, label the error type, show correction.

**Template:**
```
טעויות נפוצות:

טעות 1 — [short label]:
❌ [show incorrect setup or calculation]
✓ [show correct version]
[1 sentence: why this happens and how to avoid it]

טעות 2 — [short label, optional]:
❌ [show incorrect setup or calculation]
✓ [show correct version]
```

---

### C.7 — Practice Bridge

> **Purpose:** 3–4 problems that progress in difficulty.
> The first problem should be solvable using the exact method from C.4.
> Later problems may require adaptation or combination with prior skills.

**Template:**
```
תרגול:
1. [direct application — same structure as the worked example]
2. [same skill, different numbers or slight variation]
3. [requires connecting to a prior skill or applying in a different context]
4. [optional: open-ended or multi-step]
```

---

## Approval Checklist (All Age Bands)

Before a learning page moves from `draft` to `review`:

- [ ] `skill_id` verified in `data/curriculum-spine/v1/skills.json`
- [ ] Grade verified within `minGrade`–`maxGrade` of that skill
- [ ] Content scope does not exceed `utils/math-constants.js` allowed operations for the grade
- [ ] `title_hebrew` is present (even if still marked `[DRAFT — not owner-approved]`)
- [ ] At least one worked example present (sections A.4 / B.5 / C.4)
- [ ] Common mistake section present (A.6 / B.6 / C.6)
- [ ] No freeform AI-generated text is included without human review
- [ ] All Hebrew text has been read by a Hebrew-speaking reviewer
- [ ] No content from a higher grade has been introduced

Before a learning page moves from `review` to `approved`:

- [ ] Product owner has read the full page in Hebrew
- [ ] Product owner has explicitly approved the `title_hebrew`
- [ ] No open questions about content scope or grade appropriateness
- [ ] Approval recorded with `last_reviewed_by` and `last_reviewed_at`
