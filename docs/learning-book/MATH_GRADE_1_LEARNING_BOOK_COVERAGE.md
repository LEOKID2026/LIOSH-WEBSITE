# Math Learning Book — Grade 1 Coverage

**Status:** Documentation / mapping only. No code implemented. No SQL executed. No commits made.
**Date:** June 2026
**Sources:**
- `data/curriculum-spine/v1/skills.json` — all skills with `subject: "math"` and `minGrade: 1`
- `utils/math-constants.js` — `GRADES.g1` operations and `GRADE_LEVELS[1]` number ranges
**Language:** English. Hebrew titles are draft suggestions only.
All Hebrew titles below are marked `[DRAFT — not owner-approved]`.

---

## Overview

Grade 1 has **19 Math skills** in the curriculum spine where `minGrade = 1`.

These cover five areas:
1. Number sense (counting, number line, place value, neighbors, even/odd)
2. Comparison (comparing two numbers)
3. Basic addition and subtraction (with concrete and positional strategies)
4. Early multiplication (×1–×5 only, up to product 20)
5. Word problems (coins, money spent, time/calendar)

In addition, simple missing-number equations (`eq_add_simple`, `eq_sub_simple`) are present
as a form of pre-algebraic balance, not as formal algebra.

**Grade 1 operates within numbers 0–30** depending on difficulty level:
- Easy: up to 10
- Medium: up to 20
- Hard: up to 30

All Grade 1 skills allow fractions: **no**.
All Grade 1 skills allow negatives: **no**.

---

## Grade 1 Geometry Note

Geometry is a separate subject in the curriculum spine. Grade 1 geometry skills include:
- `geometry:kind:shapes_basic_rectangle` (g1 only)
- `geometry:kind:shapes_basic_square` (g1 only)
- `geometry:kind:transformations` (g1–g2)

These are **out of scope** for this document. They should be covered in a future
`GEOMETRY_GRADE_1_LEARNING_BOOK_COVERAGE.md` document.

---

## Template Used

All Grade 1 pages use the **Grades 1–2 age band** structure from
`MATH_LEARNING_PAGE_TEMPLATE.md`. Key characteristics:
- Short, simple Hebrew sentences
- Anchored to concrete objects or the number line
- One idea per page
- Maximum one "watch out" note
- No formal notation beyond a number sentence

---

## Skill Entries (19 Skills)

---

### 1. `ns_counting_forward`
**Full skill ID:** `math:kind:ns_counting_forward`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1 only

**What the child should understand:**
Numbers come in order. Starting from any number, the next number is always one more.
Counting forward means moving to the right on the number line.

**What a learning page should explain:**
- The number line from 0 to 20 (or 0 to 10 for easy level)
- How to place your finger on a starting number and move right
- That counting forward by 1 each time gives 1, 2, 3, 4, 5 ...
- Counting forward from a number other than 1 (e.g., start at 7, say 7, 8, 9 ...)

**Age-appropriate examples:**
- A caterpillar walking on a number line from 3 to 8
- Stairs labeled 1–10 — how many steps to reach step 9 if you start at step 4?
- Filling in missing numbers in a row: 5, __, 7, __, 9

**What must NOT appear on this page:**
- Skip counting by 2s, 5s, or 10s (those belong to later skills/grades)
- Negative numbers
- Numbers beyond 20 at this stage
- Formal algebraic notation

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "ספירה קדימה על ציר המספרים"

---

### 2. `ns_counting_backward`
**Full skill ID:** `math:kind:ns_counting_backward`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1 only

**What the child should understand:**
Counting backward means moving to the left on the number line.
Each step backward gives one fewer.

**What a learning page should explain:**
- How to move left on the number line
- That 5, 4, 3, 2, 1, 0 is "counting down"
- Connecting countdown to subtraction (this is an informal bridge, not a formal equation)

**Age-appropriate examples:**
- A rocket countdown: 10, 9, 8, 7 ... liftoff!
- Frogs jumping back on lily pads: start at 6, jump back 3 — where do you land?
- Fill in the missing numbers: 9, __, 7, __, 5

**What must NOT appear on this page:**
- Negative numbers (do not continue past 0)
- Formal subtraction algorithm (that is `sub_two`)
- Numbers beyond 20

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "ספירה לאחור על ציר המספרים"

---

### 3. `ns_number_line`
**Full skill ID:** `math:kind:ns_number_line`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1 only

**What the child should understand:**
The number line is a tool for organizing numbers in order.
Every number has exactly one spot on the line. Larger numbers are to the right.

**What a learning page should explain:**
- What the number line looks like (horizontal line with evenly spaced marks)
- How to read a number line (label on each mark)
- Locating a given number on the line
- Identifying which number is at a given position

**Age-appropriate examples:**
- A labeled number line 0–10; "put your finger on 7"
- A number line with some labels missing; fill in the blanks
- "Which number is 2 steps to the right of 4?" → 6

**What must NOT appear on this page:**
- Number lines with decimals or fractions
- Number lines beyond 20
- Skip-count patterns
- Negative numbers

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "ציר המספרים"

---

### 4. `ns_place_tens_units`
**Full skill ID:** `math:kind:ns_place_tens_units`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1–g2 (Grade 1 page covers tens and units up to 30)

**What the child should understand:**
Every two-digit number is made of tens and units.
12 = one ten and two units. 20 = two tens and zero units.

**What a learning page should explain:**
- What a "ten" looks like (10 blocks grouped together)
- How to break a number like 14 into "1 ten and 4 units"
- Reading a place value chart with tens column and units column
- Writing the number given the tens/units (e.g., 2 tens, 3 units = 23)

**Age-appropriate examples:**
- Base-10 block pictures: show 1 rod (ten) and 5 small cubes (units) = 15
- Fill-in: "2 tens and 7 units = __"
- Fill-in: "19 = __ tens and __ units"

**What must NOT appear on this page:**
- Hundreds column (introduced in g2–g3)
- Numbers above 30 in Grade 1 context
- Expanded notation with + sign (too formal for g1; bridge belongs to g2)

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "עשרות ואחדות"

---

### 5. `ns_neighbors`
**Full skill ID:** `math:kind:ns_neighbors`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1–g6 (this is the Grade 1 version)

**What the child should understand:**
Every number has a neighbor before it (one less) and a neighbor after it (one more).
The neighbors of 5 are 4 and 6.

**What a learning page should explain:**
- The concept of "one before" and "one after"
- Connecting this to the number line (left neighbor = one less; right neighbor = one more)
- Finding the neighbors of any given number 1–20

**Age-appropriate examples:**
- "What are the neighbors of 8?" → 7 and 9
- Fill in: __, 13, __ (neighbors of 13)
- A number line with one number hidden: what is the missing neighbor?

**What must NOT appear on this page:**
- Skip-count neighbors (e.g., "2-apart neighbors") — not Grade 1 scope
- Two-digit numbers beyond 30 in Grade 1 context

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "שכנים של מספר"

---

### 6. `ns_even_odd`
**Full skill ID:** `math:kind:ns_even_odd`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1–g4 (this is the Grade 1 version)

**What the child should understand:**
Numbers can be sorted into two groups: even and odd.
Even numbers can be split into two equal groups. Odd numbers cannot.

**What a learning page should explain:**
- Even: 2, 4, 6, 8, 10 (pairing objects — every object has a partner)
- Odd: 1, 3, 5, 7, 9 (one object is always left without a partner)
- Quick rule: if a number ends in 0, 2, 4, 6, or 8, it is even; otherwise odd
- Applying this to numbers 1–20

**Age-appropriate examples:**
- Arrange 6 stars into pairs — all paired → even
- Arrange 7 stars into pairs — one left over → odd
- "Is 14 even or odd?" Circle the last digit: 4 → even
- Sort the numbers 1–10 into two bins: even / odd

**What must NOT appear on this page:**
- Properties of even × even, odd × odd (too advanced for g1)
- Divisibility language (belongs to g2+)
- Numbers beyond 20 in Grade 1 context

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "זוגי ואי-זוגי"

---

### 7. `ns_complement10`
**Full skill ID:** `math:kind:ns_complement10`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1–g4 (this is the Grade 1 version)

**What the child should understand:**
Some pairs of numbers add up to 10. These are called "ten-pairs" or "complements of 10."
Knowing these pairs by heart makes addition and subtraction much faster.

**What a learning page should explain:**
- The ten-pairs: 0+10, 1+9, 2+8, 3+7, 4+6, 5+5, 6+4, 7+3, 8+2, 9+1, 10+0
- A visual ten-frame showing how two groups fill 10 boxes
- That order does not matter: 3+7 and 7+3 both make 10

**Age-appropriate examples:**
- A ten-frame with 3 filled → "how many more to fill it?" → 7
- "I have 6 apples. How many more do I need to have 10?" → 4
- Fill in: 4 + __ = 10; 8 + __ = 10

**What must NOT appear on this page:**
- Complements of 100 (introduced in g3)
- Numbers beyond 10 in this context
- Formal algebra notation (e.g., x + 4 = 10)

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "זוגות של עשר"

---

### 8. `add_second_decade`
**Full skill ID:** `math:kind:add_second_decade`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1 only

**What the child should understand:**
The "second decade" is the numbers 11–19.
Adding within these numbers builds on knowledge of ten-pairs and the number line.

**What a learning page should explain:**
- How 11–19 are structured: 10 + something (11 = 10+1, 15 = 10+5, etc.)
- Using the ten-frame or the number line to add when the sum lands in the teens
- Example: 8 + 5 — first complete to 10 (8+2=10), then add the rest (10+3=13)

**Age-appropriate examples:**
- A two-level ten-frame: top row full (10), bottom row has 3 → "that is 13"
- 7 + 6 = ? → "7 needs 3 more to reach 10; 6 = 3+3; so 7+6 = 10+3 = 13"
- Fill in: 9 + __ = 14; 8 + __ = 12

**What must NOT appear on this page:**
- Sums beyond 20
- Carrying/regrouping algorithm (vertical addition is Grade 2)
- Subtraction in the teens (separate skill)

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "חיבור בעשרייה השנייה (11–19)"

---

### 9. `add_tens_only`
**Full skill ID:** `math:kind:add_tens_only`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1 only

**What the child should understand:**
Adding whole tens (10, 20, 30 ...) is just like counting by tens.
20 + 30 is the same as 2 tens + 3 tens = 5 tens = 50.

**What a learning page should explain:**
- What "whole tens" are (multiples of 10 from 0 to 100)
- That adding tens only changes the tens digit, not the units
- Using base-10 rods: 2 rods + 3 rods = 5 rods = 50

**Age-appropriate examples:**
- 30 + 40 = ? → show 3 rods + 4 rods → 7 rods → 70
- Fill in: 20 + __ = 50; 10 + 30 = __
- "I have 2 groups of 10 crayons and 4 groups of 10 crayons. How many total?"

**What must NOT appear on this page:**
- Mixed additions with a units part (that is `add_two` or `add_second_decade`)
- Sums beyond 100
- Vertical addition layout

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "חיבור עשרות שלמות"

---

### 10. `add_two`
**Full skill ID:** `math:kind:add_two`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1–g6 (this is the Grade 1 version)

**What the child should understand (Grade 1 only):**
Adding two numbers means combining two groups into one. The result is always larger
than each group (when both numbers are positive and greater than 0).

**What a learning page should explain (Grade 1 scope: sums up to 30):**
- Using the number line: start at the first number, count forward by the second
- Using fingers or objects to combine
- Writing the number sentence: 5 + 3 = 8
- The meaning of the + and = signs

**Age-appropriate examples:**
- "I have 4 marbles. My friend gives me 3. Now I have 4 + 3 = 7."
- Number line: start at 6, jump forward 4 → land at 10
- Fill in: 7 + __ = 11; __ + 5 = 9 (bridges to `eq_add_simple`)

**What must NOT appear on this page (Grade 1):**
- Adding three numbers (see `add_three`, Grade 3+)
- Carrying / regrouping (Grade 2)
- Sums above 30
- Vertical layout (Grade 2)
- Decimals or fractions

> Note: In Grades 2–6, the same `skill_id` is used but a separate, grade-specific page
> is required each time. The explanation, examples, number range, and complexity must
> match that grade's scope.

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "חיבור של שני מספרים" (Grade 1 version — up to 30)

---

### 11. `sub_two`
**Full skill ID:** `math:kind:sub_two`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1–g6 (this is the Grade 1 version)

**What the child should understand (Grade 1 only):**
Subtraction means taking away from a group. The result is always smaller than the
starting number (when the subtracted amount is positive).

**What a learning page should explain (Grade 1 scope: differences up to 30):**
- Using the number line: start at the first number, count backward by the second
- Using objects: show 8 blocks, cross out 3, count what remains (5)
- Writing the number sentence: 8 − 3 = 5
- The meaning of the − sign

**Age-appropriate examples:**
- "I had 9 stickers. I gave away 4. How many do I have left? 9 − 4 = 5."
- Number line: start at 7, jump back 2 → land at 5
- Fill in: 10 − __ = 6; __ − 3 = 5

**What must NOT appear on this page (Grade 1):**
- Borrowing / regrouping (Grade 2)
- Negative results (below zero) — stop at 0
- Vertical layout (Grade 2)
- Three-number expressions

> Note: Same skill ID is used in Grades 2–6 but each grade requires a separate page.

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "חיסור של שני מספרים" (Grade 1 version — עד 30)

---

### 12. `eq_add_simple`
**Full skill ID:** `math:kind:eq_add_simple`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1 only

**What the child should understand:**
A number sentence has two sides that balance. When one number is missing, we can figure
it out by thinking: "what do I add to get the result?"

**What a learning page should explain:**
- What a balanced number sentence looks like: 3 + __ = 7
- Using the number line to find the missing number
- Thinking strategy: "3 + ? = 7 → I need to jump from 3 to 7 → that is 4 jumps"

**Age-appropriate examples:**
- __ + 4 = 9 → use a number line, start at 4, count jumps to 9 → 5
- 6 + __ = 10 → ten-pair strategy: 6+4=10 → answer is 4
- 2 + __ = 8; __ + 5 = 11

**What must NOT appear on this page:**
- Variable notation (x, n, □ labels as "variables" — frame the missing as a puzzle, not algebra)
- Two missing numbers in one sentence
- Multiplication or division in the sentence

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "משפט חיבור עם נעלם פשוט"

---

### 13. `eq_sub_simple`
**Full skill ID:** `math:kind:eq_sub_simple`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1 only

**What the child should understand:**
When a number sentence has a missing subtracted number or a missing starting number,
we use what we know about subtraction to find it.

**What a learning page should explain:**
- Finding the missing number in: 9 − __ = 4 or __ − 3 = 5
- Number line strategy: jump from result toward start to find the gap
- Connecting to addition: if 9 − __ = 4, then 4 + __ = 9

**Age-appropriate examples:**
- 8 − __ = 3 → "I need to get from 3 back to 8; that is 5 steps"
- __ − 2 = 6 → "6 and 2 more is 8, so the answer is 8"
- 10 − __ = 7; __ − 4 = 3

**What must NOT appear on this page:**
- Results below zero
- Formal algebra
- Combined add/subtract sentences

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "משפט חיסור עם נעלם פשוט"

---

### 14. `cmp`
**Full skill ID:** `math:kind:cmp`
**Topic:** number_sense_and_operations
**Grade scope in spine:** g1–g6 (this is the Grade 1 version)

**What the child should understand (Grade 1 only, numbers up to 30):**
Two numbers can be compared. One is larger, one is smaller, or they are equal.
The symbols < (less than), > (greater than), and = (equal) show the relationship.

**What a learning page should explain:**
- What "larger" and "smaller" mean on the number line (right = larger)
- How to use < and > (the hungry crocodile always opens toward the bigger number)
- Writing: 7 < 12, 15 > 8, 6 = 6

**Age-appropriate examples:**
- Which is bigger: 9 or 14? → locate both on the number line → 14 is to the right
- Fill in < or >: 5 __ 11; 20 __ 17; 8 __ 8
- Draw the number line and mark both numbers

**What must NOT appear on this page (Grade 1):**
- Comparing three or more numbers
- Numbers above 30
- Decimals, fractions, or negative numbers

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "השוואת מספרים עם סימני < > ="

---

### 15. `mul`
**Full skill ID:** `math:kind:mul`
**Topic:** multiplication
**Grade scope in spine:** g1–g6 (this is the Grade 1 version)

**What the child should understand (Grade 1 only):**
Multiplication means adding the same number several times (repeated addition).
In Grade 1, only products up to 5 × 4 = 20 are introduced. The full multiplication
table is NOT a Grade 1 topic.

**What a learning page should explain:**
- Multiplication as repeated addition: 3 × 4 = 4 + 4 + 4
- Using arrays (rows and columns of dots) to visualize
- Writing: 2 × 5 = 10 means "2 groups of 5"
- Grade 1 scope: factors up to 5, products up to 20

**Age-appropriate examples:**
- 3 groups of 2 flowers = 2 + 2 + 2 = 3 × 2 = 6
- An array: 4 rows, 3 in each row → 4 × 3 = 12
- Fill in: 2 × __ = 8; __ × 3 = 9 (within Grade 1 range)

**What must NOT appear on this page (Grade 1):**
- Products above 20
- The full 10×10 multiplication table (Grade 2+)
- Formal "times table" drills
- Division (Grade 2+)
- Vertical multiplication layout

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "כפל — חיבור חוזר" (Grade 1 — עד 5×4)

---

### 16. `wp_coins`
**Full skill ID:** `math:kind:wp_coins`
**Topic:** word_problems
**Grade scope in spine:** g1–g2 (this is the Grade 1 version)

**What the child should understand:**
Each coin has a value. To find the total value of a group of coins,
add the values together.

**What a learning page should explain:**
- Coin values (context: Israeli agorot and shekel equivalents as appropriate, or general "coins worth X")
- Reading a word problem: "I have 3 coins worth 2 each and 1 coin worth 5. How much total?"
- Writing the addition sentence and computing

**Age-appropriate examples:**
- "I have 2 coins worth 5 and 3 coins worth 1. How much money do I have? 5+5+1+1+1 = 13"
- "A pencil costs 8 and a sticker costs 4. How much for both? 8+4=12"
- Visual: draw coins with values, add them up

**What must NOT appear on this page:**
- Change calculation (giving back money) — that is `wp_coins_spent`
- Multiplication of coin values (Grade 2+ strategy)
- Amounts beyond 30 in Grade 1

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "שאלות מילוליות — ערך מטבעות"

---

### 17. `wp_coins_spent`
**Full skill ID:** `math:kind:wp_coins_spent`
**Topic:** word_problems
**Grade scope in spine:** g1–g2 (this is the Grade 1 version)

**What the child should understand:**
When you spend money, you subtract from what you had. What remains is the change.

**What a learning page should explain:**
- Reading a "spending" word problem: what is the starting amount, what is spent
- Writing the subtraction sentence: 15 − 6 = 9
- That the answer is "how much is left" or "how much change"

**Age-appropriate examples:**
- "I had 12 coins. I spent 5 on a book. How many coins do I have left? 12 − 5 = 7."
- "I paid 10 for something that costs 7. What change do I get back? 10 − 7 = 3."
- Illustration: a wallet with coins; cross out the spent ones

**What must NOT appear on this page:**
- Multi-item purchases (Grade 2+)
- Amounts beyond 30 in Grade 1
- Division or equal-sharing strategies

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "שאלות מילוליות — כמה נשאר / עודף"

---

### 18. `wp_time_date`
**Full skill ID:** `math:kind:wp_time_date`
**Topic:** word_problems
**Grade scope in spine:** g1–g2 (this is the Grade 1 version)

**What the child should understand:**
A calendar shows days, weeks, and months. We can answer questions about dates by
reading the calendar and counting.

**What a learning page should explain:**
- Days of the week in order (Sunday through Saturday)
- What "yesterday", "today", and "tomorrow" mean on a calendar
- Counting days: "If today is Tuesday and the party is in 3 days, what day is the party?"

**Age-appropriate examples:**
- "Today is Monday. What day will it be in 2 days?" → Monday + 2 = Wednesday
- "The field trip is on Friday. Today is Tuesday. How many days until the trip?" → 3 days
- A small calendar grid with some days circled; answer date questions

**What must NOT appear on this page:**
- Clock reading / telling time (a different skill, not present in Grade 1 spine)
- Month-to-month arithmetic (Grade 2+)
- Year calculations

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "שאלות מילוליות — ימים ותאריכים"

---

### 19. `wp_time_days`
**Full skill ID:** `math:kind:wp_time_days`
**Topic:** word_problems
**Grade scope in spine:** g1–g2 (this is the Grade 1 version)

**What the child should understand:**
We can count forward or backward on the week to answer "how many days" questions.
"Before" and "after" on the calendar are like "left" and "right" on the number line.

**What a learning page should explain:**
- Days of the week as a sequence
- "How many days between Monday and Thursday?" → count the steps
- "3 days before Friday" → count back 3 → Tuesday

**Age-appropriate examples:**
- "How many days are there from Sunday to Wednesday?" → Sunday, Mon, Tue, Wed = 3 steps
- "Grandma arrived 2 days ago and today is Thursday. When did she arrive?" → Tuesday
- A row of day-name cards with arrows showing forward/back movement

**What must NOT appear on this page:**
- Clock arithmetic or hours/minutes
- Month or year calculations
- Numbers of days beyond one week's range (0–7 days)

**Suggested Hebrew title:** `[DRAFT — not owner-approved]`
> "שאלות מילוליות — מרחק בין ימים"

---

## Grade 1 Coverage Summary

| # | skill_id | Topic | Page type | Hebrew title (draft) |
|---|----------|-------|-----------|----------------------|
| 1 | `ns_counting_forward` | number_sense | `visual_intuition` | "ספירה קדימה על ציר המספרים" [DRAFT] |
| 2 | `ns_counting_backward` | number_sense | `visual_intuition` | "ספירה לאחור על ציר המספרים" [DRAFT] |
| 3 | `ns_number_line` | number_sense | `visual_intuition` | "ציר המספרים" [DRAFT] |
| 4 | `ns_place_tens_units` | number_sense | `concept_foundation` | "עשרות ואחדות" [DRAFT] |
| 5 | `ns_neighbors` | number_sense | `visual_intuition` | "שכנים של מספר" [DRAFT] |
| 6 | `ns_even_odd` | number_sense | `concept_foundation` | "זוגי ואי-זוגי" [DRAFT] |
| 7 | `ns_complement10` | number_sense | `visual_intuition` | "זוגות של עשר" [DRAFT] |
| 8 | `add_second_decade` | number_sense | `concept_foundation` + `visual_intuition` | "חיבור בעשרייה השנייה (11–19)" [DRAFT] |
| 9 | `add_tens_only` | number_sense | `visual_intuition` | "חיבור עשרות שלמות" [DRAFT] |
| 10 | `add_two` | number_sense | `visual_intuition` | "חיבור של שני מספרים" [DRAFT] |
| 11 | `sub_two` | number_sense | `visual_intuition` | "חיסור של שני מספרים" [DRAFT] |
| 12 | `eq_add_simple` | number_sense | `concept_foundation` | "משפט חיבור עם נעלם פשוט" [DRAFT] |
| 13 | `eq_sub_simple` | number_sense | `concept_foundation` | "משפט חיסור עם נעלם פשוט" [DRAFT] |
| 14 | `cmp` | number_sense | `visual_intuition` | "השוואת מספרים עם סימני < > =" [DRAFT] |
| 15 | `mul` | multiplication | `visual_intuition` | "כפל — חיבור חוזר (עד 5×4)" [DRAFT] |
| 16 | `wp_coins` | word_problems | `word_problem_strategy` | "שאלות מילוליות — ערך מטבעות" [DRAFT] |
| 17 | `wp_coins_spent` | word_problems | `word_problem_strategy` | "שאלות מילוליות — כמה נשאר / עודף" [DRAFT] |
| 18 | `wp_time_date` | word_problems | `word_problem_strategy` | "שאלות מילוליות — ימים ותאריכים" [DRAFT] |
| 19 | `wp_time_days` | word_problems | `word_problem_strategy` | "שאלות מילוליות — מרחק בין ימים" [DRAFT] |

---

## What Grade 1 Must NOT Introduce

The following topics are commonly associated with "math for young children" but are
explicitly NOT in Grade 1 scope according to the curriculum spine and `math-constants.js`.
They must not appear in any Grade 1 learning page.

| Excluded topic | First appears | Reason for exclusion |
|---------------|---------------|----------------------|
| Carrying / regrouping in addition | Grade 2 (`add_vertical`) | Algorithm not in g1 |
| Borrowing in subtraction | Grade 2 (`sub_vertical`) | Algorithm not in g1 |
| Multiplication table beyond ×5 | Grade 2 (`mul`, medium/hard) | `math-constants.js` limits g1 to ×5 |
| Division | Grade 2 (`div`) | Not in g1 operations list |
| Fractions (halves, quarters) | Grade 2 (`frac_half`, `frac_quarter`) | Not in g1 operations list |
| Sequences / patterns (formal) | Grade 3 (`sequence`) | Not in g1 spine |
| Decimals | Grade 3 (`dec_add`) | Not in g1 operations list |
| Complement of 100 | Grade 3 (`ns_complement100`) | Not in g1 spine |
| Order of operations | Grade 3 (`order_parentheses`) | Not in g1 spine |
| Long division | Grade 4 (`div_long`) | Not in g1–g3 |
| Powers / exponents | Grade 4 (`power_base`) | Not in g1–g3 |
| Percentages | Grade 5 (`perc_part_of`) | Not in g1–g4 |
| Ratio | Grade 6 (`ratio_first`) | Not in g1–g5 |
| Negative numbers | Grade 5 (`allowNegatives: true`) | Explicitly false for g1 |
