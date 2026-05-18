/**
 * API-shaped body for Playwright parent-report load (matches report-data GET shape).
 */
export function buildParentReportApiBodyE2e() {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 6);
  const from = fromDate.toISOString().slice(0, 10);

  return {
    ok: true,
    student: {
      id: "74c30e48-895b-4f4c-a65a-888f656f54f6",
      full_name: "E2E Student",
      grade_level: "g4",
      is_active: true,
    },
    range: { from, to },
    summary: {
      totalSessions: 8,
      completedSessions: 8,
      totalAnswers: 120,
      correctAnswers: 96,
      wrongAnswers: 24,
      accuracy: 80,
      totalDurationSeconds: 2400,
    },
    subjects: {
      math: {
        sessions: 8,
        answers: 120,
        correct: 96,
        wrong: 24,
        accuracy: 80,
        durationSeconds: 2400,
        topics: {
          fractions: {
            answers: 90,
            correct: 72,
            wrong: 18,
            accuracy: 80,
            durationSeconds: 1800,
          },
          subtraction: {
            answers: 30,
            correct: 24,
            wrong: 6,
            accuracy: 80,
            durationSeconds: 600,
          },
        },
      },
      geometry: { sessions: 0, answers: 0, correct: 0, wrong: 0, accuracy: 0, durationSeconds: 0, topics: {} },
      english: { sessions: 0, answers: 0, correct: 0, wrong: 0, accuracy: 0, durationSeconds: 0, topics: {} },
      hebrew: { sessions: 0, answers: 0, correct: 0, wrong: 0, accuracy: 0, durationSeconds: 0, topics: {} },
      science: { sessions: 0, answers: 0, correct: 0, wrong: 0, accuracy: 0, durationSeconds: 0, topics: {} },
      moledet_geography: { sessions: 0, answers: 0, correct: 0, wrong: 0, accuracy: 0, durationSeconds: 0, topics: {} },
    },
    dailyActivity: [],
    recentMistakes: [],
    meta: { source: "playwright-e2e" },
  };
}

export default { buildParentReportApiBodyE2e };
