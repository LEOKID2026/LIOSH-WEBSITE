/**
 * Phase 3 expansion: deeper items for environment, experiments, earth_space
 * (emphasis g5/g6, mostly hard band). Concatenated in science-questions.js.
 * Metadata enrichment applied in same pass as science-questions.js (safe fields only).
 */
export const SCIENCE_QUESTIONS_PHASE3 = [
  {
    "id": "sci_phb_g1_materials_med_04",
    "topic": "materials",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "ממה עשוי כוס פלסטיק לרוב?",
    "options": [
      "חומר סינתטי",
      "עץ מלא בדרך כלל",
      "ברזל כבד",
      "זכוכית שקופה"
    ],
    "correctIndex": 0,
    "explanation": "פלסטיק הוא חומר מלאכותי קל.",
    "params": {
      "patternFamily": "sci_phb_materials_g1_medium_g1_materials_plastic",
      "subtype": "sci_materials_general",
      "conceptTag": "g1_materials_plastic",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g1",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g1_materials_hard_01",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה אבן וספוג שונים במגע?",
    "options": [
      "תכונות קשיחות",
      "צבע בלבד",
      "גודל בלבד",
      "ריח בלבד"
    ],
    "correctIndex": 0,
    "explanation": "קשיחות ורכות הן תכונות חומר.",
    "params": {
      "patternFamily": "sci_phb_materials_g1_hard_g1_materials_hardness_compare",
      "subtype": "sci_materials_general",
      "conceptTag": "g1_materials_hardness_compare",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g1",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g1_materials_hard_02",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה קורה כשלוחצים על ספוג?",
    "options": [
      "משתנה צורה",
      "נשבר לרסיסים",
      "הופך למתכת",
      "נעלם בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "חומר רך מתעצב וחוזר.",
    "params": {
      "patternFamily": "sci_phb_materials_g1_hard_g1_materials_sponge_press",
      "subtype": "sci_materials_general",
      "conceptTag": "g1_materials_sponge_press",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g1",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g1_materials_hard_03",
    "topic": "materials",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "איך בודקים אם חומר מחוספס?",
    "options": [
      "מרגישים חיכוך",
      "שוקלים אותו",
      "מקשיבים לו",
      "מריחים בלבד"
    ],
    "correctIndex": 0,
    "explanation": "מחוספס יוצר חיכוך במגע.",
    "params": {
      "patternFamily": "sci_phb_materials_g1_hard_g1_materials_rough_test",
      "subtype": "sci_materials_general",
      "conceptTag": "g1_materials_rough_test",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g1",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g1_materials_hard_04",
    "topic": "materials",
    "grades": [
      "g1"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה חומרים שונים זה מזה?",
    "options": [
      "לכל חומר תכונות",
      "כולם זהים תמיד",
      "רק הצבע משנה",
      "אין הבדל בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "תכונות כמו קשיחות ורכות משתנות.",
    "params": {
      "patternFamily": "sci_phb_materials_g1_hard_g1_materials_different_props",
      "subtype": "sci_materials_general",
      "conceptTag": "g1_materials_different_props",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g1",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g1_earth_space_med_01",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מתי רואים שמש ביום?",
    "options": [
      "כשהשמיים בהירים",
      "אזור עם הרבה אנשים",
      "מקום עם מים",
      "אזור בטבע בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "ביום השמש מאירה את השמיים.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g1_medium_g1_earth_sun_day",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g1_earth_sun_day",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g1_earth_space_med_02",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה יוצר צל בחצוץ?",
    "options": [
      "גוף חוסם אור",
      "הירח בלבד",
      "גשם כבד בדרך כלל",
      "רוח חזקה"
    ],
    "correctIndex": 0,
    "explanation": "צל נוצר כשאור נחסם.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g1_medium_g1_earth_shadow",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g1_earth_shadow",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g1_earth_space_med_03",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מתי קר יותר לרוב בישראל?",
    "options": [
      "בעונת החורף",
      "באמצע הקיץ",
      "בלילה בלבד",
      "תמיד אותו דבר"
    ],
    "correctIndex": 0,
    "explanation": "בחורף הטמפרטורה נמוכה יותר.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g1_medium_g1_earth_winter_cold",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g1_earth_winter_cold",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g1_earth_space_med_04",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה רואים בלילה בשמיים?",
    "options": [
      "ירח וכוכבים",
      "שמש בוהקת",
      "קשת בענן",
      "עננים בלבד"
    ],
    "correctIndex": 0,
    "explanation": "בלילה השמש מוסתרת מאיתנו.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g1_medium_g1_earth_night_sky",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g1_earth_night_sky",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g1_earth_space_hard_01",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה יום ולילה מתחלפים?",
    "options": [
      "כדור הארץ מסתובב",
      "הירח נעלם בדרך כלל",
      "השמש נכבית",
      "העננים נעלמים"
    ],
    "correctIndex": 0,
    "explanation": "סיבוב כדור הארץ יוצר מחזור יום-לילה.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g1_hard_g1_earth_day_night_spin",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g1_earth_day_night_spin",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g1_earth_space_hard_02",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה קורה כשענן מכסה שמש?",
    "options": [
      "פחות אור ופחות",
      "הלילה מגיע מיד",
      "הירח גדל בדרך כלל",
      "הים נעלם בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "ענן מפזר ומסתיר קרינה.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g1_hard_g1_earth_cloud_cover",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g1_earth_cloud_cover",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g1_earth_space_hard_03",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה בקיץ חם יותר לרוב?",
    "options": [
      "שעות אור ארוכות",
      "אין שמש בקיץ",
      "הירח מחמם בדרך כלל",
      "הגשם תמיד בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "בקיץ יש יותר קרינת שמש.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g1_hard_g1_earth_summer_heat",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g1_earth_summer_heat",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g1_earth_space_hard_04",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה לובשים מעיל בגשם?",
    "options": [
      "מגן ממים ומרוח",
      "כדי לראות ירח",
      "כדי להאיץ סיבוב כדור הארץ",
      "כדי לעשות צל"
    ],
    "correctIndex": 0,
    "explanation": "בגדים שומרים על גוף יבש.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g1_hard_g1_earth_rain_coat",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g1_earth_rain_coat",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g1_environment_med_01",
    "topic": "environment",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה זורקים פח לפח אשפה?",
    "options": [
      "שומרים על ניקיון",
      "מגדילים זבל",
      "מונעים מים",
      "סוגרים שמש"
    ],
    "correctIndex": 0,
    "explanation": "פח נכון מונע לכלוך.",
    "params": {
      "patternFamily": "sci_phb_environment_g1_medium_g1_env_trash_bin",
      "subtype": "sci_environment_general",
      "conceptTag": "g1_env_trash_bin",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g1_environment_med_02",
    "topic": "environment",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה עוזר לצמחים בגינה?",
    "options": [
      "מים ואור שמש",
      "אזור עם הרבה אנשים",
      "מקום עם מים",
      "אזור בטבע"
    ],
    "correctIndex": 0,
    "explanation": "צמחים זקוקים למים ולאור.",
    "params": {
      "patternFamily": "sci_phb_environment_g1_medium_g1_env_plants_needs",
      "subtype": "sci_environment_general",
      "conceptTag": "g1_env_plants_needs",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g1_environment_med_03",
    "topic": "environment",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה לא רוצים בוץ בכיתה?",
    "options": [
      "עלול להיות מלכלך",
      "זה מחזק עצים",
      "זה מייצר כוכבים",
      "אין סיבה בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "בוץ מלכלך ועלול להחליק.",
    "params": {
      "patternFamily": "sci_phb_environment_g1_medium_g1_env_mud_class",
      "subtype": "sci_environment_general",
      "conceptTag": "g1_env_mud_class",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g1_environment_med_04",
    "topic": "environment",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה חשוב לחיות בטבע?",
    "options": [
      "מקום מחיה ומזון",
      "אזור עם הרבה אנשים",
      "מקום עם מים",
      "אזור בטבע בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "בעלי חיים זקוקים למזון ומחסה.",
    "params": {
      "patternFamily": "sci_phb_environment_g1_medium_g1_env_habitat_needs",
      "subtype": "sci_environment_general",
      "conceptTag": "g1_env_habitat_needs",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g1_environment_hard_01",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה חשוב לחסוך מים?",
    "options": [
      "מים מוגבלים לכולם",
      "מים לא נחוצים",
      "מים מחליפים שמש",
      "אין צורך במים"
    ],
    "correctIndex": 0,
    "explanation": "מים יקרים וצריך לחסוך.",
    "params": {
      "patternFamily": "sci_phb_environment_g1_hard_g1_env_save_water",
      "subtype": "sci_environment_general",
      "conceptTag": "g1_env_save_water",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g1_environment_hard_02",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה קורה אם זורקים זבל בים?",
    "options": [
      "מזהם מים ומזיק",
      "מנקה את הים",
      "מגדיל דגים",
      "אין השפעה"
    ],
    "correctIndex": 0,
    "explanation": "זבל פוגע בחיים ימיים.",
    "params": {
      "patternFamily": "sci_phb_environment_g1_hard_g1_env_sea_litter",
      "subtype": "sci_environment_general",
      "conceptTag": "g1_env_sea_litter",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g1_environment_hard_03",
    "topic": "environment",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה שומרים על עצים בפארק?",
    "options": [
      "נותנים צל וחמצן",
      "מונעים גשם",
      "אוכלים בעלי חיים",
      "מייצרים דלק"
    ],
    "correctIndex": 0,
    "explanation": "עצים תורמים לאוויר ולצל.",
    "params": {
      "patternFamily": "sci_phb_environment_g1_hard_g1_env_park_trees",
      "subtype": "sci_environment_general",
      "conceptTag": "g1_env_park_trees",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g1_environment_hard_04",
    "topic": "environment",
    "grades": [
      "g1"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה דואגים לטבע בביקור?",
    "options": [
      "לא לקטוף ולזרוק",
      "לשרוף עלים",
      "לשבור ענפים",
      "להשאיר זבל"
    ],
    "correctIndex": 0,
    "explanation": "התנהגות זהירה שומרת על הטבע.",
    "params": {
      "patternFamily": "sci_phb_environment_g1_hard_g1_env_visit_care",
      "subtype": "sci_environment_general",
      "conceptTag": "g1_env_visit_care",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g2_materials_hard_01",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה שונה במגע בין מתכת לעץ?",
    "options": [
      "מתכת קשה וקרה",
      "עץ תמיד שקוף",
      "מתכת תמיד רכה",
      "אין הבדל"
    ],
    "correctIndex": 0,
    "explanation": "מתכות קשיחות ומוליכות חום.",
    "params": {
      "patternFamily": "sci_phb_materials_g2_hard_g2_materials_metal_wood",
      "subtype": "sci_materials_general",
      "conceptTag": "g2_materials_metal_wood",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g1",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g2_materials_hard_02",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "איך בודקים אם חומר שקוף?",
    "options": [
      "רואים דרכו צורה או אור",
      "שוקלים אותו בלבד",
      "מריחים אותו בדרך כלל",
      "שומעים צליל בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "שקיפות מאפשרת מעבר אור.",
    "params": {
      "patternFamily": "sci_phb_materials_g2_hard_g2_materials_transparent",
      "subtype": "sci_materials_general",
      "conceptTag": "g2_materials_transparent",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g1",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g2_materials_hard_03",
    "topic": "materials",
    "grades": [
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה פלסטיק קל לרוב?",
    "options": [
      "צפיפות נמוכה יחסית",
      "הוא עשוי מברזל",
      "הוא תמיד כבד",
      "אין לו מסה בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "חומר קל שוקל פחות.",
    "params": {
      "patternFamily": "sci_phb_materials_g2_hard_g2_materials_plastic_light",
      "subtype": "sci_materials_general",
      "conceptTag": "g2_materials_plastic_light",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g2",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g2_materials_hard_04",
    "topic": "materials",
    "grades": [
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה קורה לשעווה ליד מקור חום?",
    "options": [
      "נוטה להימס",
      "הופכת לאבן",
      "נעלמת בדרך כלל",
      "מקפיאה מים"
    ],
    "correctIndex": 0,
    "explanation": "חום מעביר שעווה למצב נוזלי.",
    "params": {
      "patternFamily": "sci_phb_materials_g2_hard_g2_materials_wax_melt",
      "subtype": "sci_materials_general",
      "conceptTag": "g2_materials_wax_melt",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g2",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g2_earth_space_med_01",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה סימן של יום גשום?",
    "options": [
      "עננים וטיפות מים",
      "ירח מלא בלבד",
      "שמש חזקה בדרך כלל",
      "כוכבים בלבד"
    ],
    "correctIndex": 0,
    "explanation": "גשם מלווה עננים ומים.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g2_medium_g2_earth_rain_signs",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g2_earth_rain_signs",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "medium",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g2_earth_space_med_02",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה גורם לרוח לעיתים?",
    "options": [
      "תנועת אוויר בין",
      "סיבוב הירח בלבד",
      "צבע העננים",
      "גובה עצים בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "הבדלי לחץ מניעים רוח.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g2_medium_g2_earth_wind_cause",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g2_earth_wind_cause",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "medium",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g2_earth_space_hard_01",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה יש עונות שונות בשנה?",
    "options": [
      "מיקום השמש",
      "הירח נעלם",
      "הים נסגר",
      "אין שמש בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "זווית השמש משנה עונות.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g2_hard_g2_earth_seasons",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g2_earth_seasons",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g2_earth_space_hard_02",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה קורה במחזור המים כשחם?",
    "options": [
      "אידוי ממים גדל",
      "המים נעלמים לנצח",
      "אין אידוי",
      "השמש נכבית"
    ],
    "correctIndex": 0,
    "explanation": "חום מגביר אידוי.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g2_hard_g2_earth_evaporation_heat",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g2_earth_evaporation_heat",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g1",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g2_earth_space_hard_03",
    "topic": "earth_space",
    "grades": [
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה יש מלח בים המלח?",
    "options": [
      "אידוי גדול והמלח נשאר",
      "אין מים בים בדרך כלל",
      "גשם ממיס מלח בדרך כלל",
      "הירח מוסיף מלח"
    ],
    "correctIndex": 0,
    "explanation": "אידוי מרוכז מלחים.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g2_hard_g2_earth_dead_sea_salt",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g2_earth_dead_sea_salt",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g2",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g2_earth_space_hard_04",
    "topic": "earth_space",
    "grades": [
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה תפקיד הענן במזג אוויר?",
    "options": [
      "נושא אדי מים ומצל",
      "מייצר כוכבים",
      "סוגר את הלילה",
      "מחליף את השמש"
    ],
    "correctIndex": 0,
    "explanation": "עננים חלק ממחזור המים.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g2_hard_g2_earth_cloud_role",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g2_earth_cloud_role",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g2",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g2_environment_med_01",
    "topic": "environment",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה ממחזרים בקבוקים?",
    "options": [
      "מפחיתים זבל וחוסכים",
      "מגדילים פסולת",
      "מונעים מים בדרך כלל",
      "סוגרים שמש בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "מיחזור חוסך חומרים.",
    "params": {
      "patternFamily": "sci_phb_environment_g2_medium_g2_env_recycle_bottles",
      "subtype": "sci_environment_general",
      "conceptTag": "g2_env_recycle_bottles",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "medium",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g2_environment_hard_01",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה לא שורפים פסולת בחוץ?",
    "options": [
      "מזהם אוויר",
      "מחזק עצים",
      "מייצר מים",
      "אין סיכון"
    ],
    "correctIndex": 0,
    "explanation": "שריפה פולטת עשן מזיק.",
    "params": {
      "patternFamily": "sci_phb_environment_g2_hard_g2_env_no_burning",
      "subtype": "sci_environment_general",
      "conceptTag": "g2_env_no_burning",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g2_environment_hard_02",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה קורה כשמזהמים נחל?",
    "options": [
      "מזיק לדגים ולצמחים",
      "מנקה את המים",
      "מגדיל דגים בדרך כלל",
      "אין השפעה בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "זיהום פוגע בחיים.",
    "params": {
      "patternFamily": "sci_phb_environment_g2_hard_g2_env_stream_pollution",
      "subtype": "sci_environment_general",
      "conceptTag": "g2_env_stream_pollution",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g1",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g2_environment_hard_03",
    "topic": "environment",
    "grades": [
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה שותלים עצים בשכונה?",
    "options": [
      "מייצרים חמצן וצל",
      "מונעים גשם לנצח",
      "אוכלים בעלי חיים",
      "מייצרים פלסטיק"
    ],
    "correctIndex": 0,
    "explanation": "עצים משפרים אוויר וצל.",
    "params": {
      "patternFamily": "sci_phb_environment_g2_hard_g2_env_plant_trees",
      "subtype": "sci_environment_general",
      "conceptTag": "g2_env_plant_trees",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g2",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g2_environment_hard_04",
    "topic": "environment",
    "grades": [
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה התנהגות ידידותית לטבע?",
    "options": [
      "הליכה על שבילים",
      "קטיפת כל הפרחים",
      "השארת זבל בדרך כלל",
      "שבירת ענפים"
    ],
    "correctIndex": 0,
    "explanation": "שבילים שומרים על בית גידול.",
    "params": {
      "patternFamily": "sci_phb_environment_g2_hard_g2_env_trail_behavior",
      "subtype": "sci_environment_general",
      "conceptTag": "g2_env_trail_behavior",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g2",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g3_materials_eas_01",
    "topic": "materials",
    "grades": [
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה חומר מוליך חשמל טוב?",
    "options": [
      "נחושת",
      "פלסטיק",
      "עץ יבש",
      "זכוכית"
    ],
    "correctIndex": 0,
    "explanation": "מתכות מוליכות זרם.",
    "params": {
      "patternFamily": "sci_phb_materials_g3_easy_g3_materials_conductor",
      "subtype": "sci_materials_general",
      "conceptTag": "g3_materials_conductor",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g3",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g3_materials_eas_02",
    "topic": "materials",
    "grades": [
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה מצב הצבירה של מים בחדר?",
    "options": [
      "נוזל",
      "מוצק",
      "גז בלבד",
      "פלסמה"
    ],
    "correctIndex": 0,
    "explanation": "בטמפרטורת חדר מים נוזלים.",
    "params": {
      "patternFamily": "sci_phb_materials_g3_easy_g3_materials_water_liquid",
      "subtype": "sci_materials_general",
      "conceptTag": "g3_materials_water_liquid",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g3",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g3_materials_hard_01",
    "topic": "materials",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה משפיע על מהירות התכת קרח?",
    "options": [
      "טמפרטורה סביב",
      "צבע הקיר",
      "שם הילד בדרך כלל",
      "גובה כיסא"
    ],
    "correctIndex": 0,
    "explanation": "חום ושטח משפיעים על התכה.",
    "params": {
      "patternFamily": "sci_phb_materials_g3_hard_g3_materials_ice_melt_rate",
      "subtype": "sci_materials_general",
      "conceptTag": "g3_materials_ice_melt_rate",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g3",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g3_materials_hard_02",
    "topic": "materials",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה הבדל בין שינוי פיזיקלי לכימי?",
    "options": [
      "פיזיקלי אותו חומר,",
      "אין הבדל בדרך כלל",
      "כימי תמיד צבע",
      "פיזיקלי תמיד אש"
    ],
    "correctIndex": 0,
    "explanation": "בכימי נוצר חומר אחר.",
    "params": {
      "patternFamily": "sci_phb_materials_g3_hard_g3_materials_phys_vs_chem",
      "subtype": "sci_materials_general",
      "conceptTag": "g3_materials_phys_vs_chem",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g3",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g3_earth_space_eas_01",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה גורם ליום ולילה?",
    "options": [
      "סיבוב כדור",
      "הירח נעלם",
      "השמש נכבית",
      "הגשם בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "סיבוב יוצר מחזור אור-חושך.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g3_easy_g3_earth_day_night",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g3_earth_day_night",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g3",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g3_earth_space_eas_02",
    "topic": "earth_space",
    "grades": [
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מאיפה האור שאנו רואים מהירח?",
    "options": [
      "מאור השמש",
      "מהירח עצמו",
      "מהים",
      "מהעננים בלבד"
    ],
    "correctIndex": 0,
    "explanation": "הירח מחזיר אור שמש.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g3_easy_g3_earth_moon_light",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g3_earth_moon_light",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g3",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g3_earth_space_hard_01",
    "topic": "earth_space",
    "grades": [
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה בישראל חם בקיץ וגשום בחורף?",
    "options": [
      "אקלים ים תיכוני",
      "אין עונות בדרך כלל",
      "הירח קובע גשם",
      "הים נעלם בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "אקלים מקומי קובע עונות.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g3_hard_g3_earth_med_climate",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g3_earth_med_climate",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g3",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g3_earth_space_hard_02",
    "topic": "earth_space",
    "grades": [
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה שלב אחרי אידוי במחזור המים?",
    "options": [
      "התעבות לעננים",
      "הצטברות באוקיינוס בלבד",
      "היעלמות מים",
      "הפסקת שמש"
    ],
    "correctIndex": 0,
    "explanation": "אדים מתעבים לטיפות.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g3_hard_g3_earth_condensation",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g3_earth_condensation",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g3",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g3_environment_eas_01",
    "topic": "environment",
    "grades": [
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מי בתחילת שרשרת מזון?",
    "options": [
      "צמחים",
      "נמר",
      "עכבר",
      "עורב"
    ],
    "correctIndex": 0,
    "explanation": "צמחים מייצרים מזון מאור.",
    "params": {
      "patternFamily": "sci_phb_environment_g3_easy_g3_env_food_chain_start",
      "subtype": "sci_environment_general",
      "conceptTag": "g3_env_food_chain_start",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g3",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g3_environment_eas_02",
    "topic": "environment",
    "grades": [
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "למה ממחזרים נייר?",
    "options": [
      "חוסך עצים",
      "מגדיל זבל",
      "מונע מים",
      "סוגר שמש"
    ],
    "correctIndex": 0,
    "explanation": "נייר ממוחזר חוסך עצים.",
    "params": {
      "patternFamily": "sci_phb_environment_g3_easy_g3_env_paper_recycle",
      "subtype": "sci_environment_general",
      "conceptTag": "g3_env_paper_recycle",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g3",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g3_environment_hard_01",
    "topic": "environment",
    "grades": [
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה קורה כשמכריתים יער?",
    "options": [
      "פוגעים בבתי גידול",
      "מגדילים מינים",
      "מייצרים יותר חמצן",
      "אין השפעה בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "כריתה מצמצמת מחיה.",
    "params": {
      "patternFamily": "sci_phb_environment_g3_hard_g3_env_deforestation",
      "subtype": "sci_environment_general",
      "conceptTag": "g3_env_deforestation",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g3",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g3_environment_hard_02",
    "topic": "environment",
    "grades": [
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה זיהום אוויר מזיק?",
    "options": [
      "מקשה על נשימה",
      "מחזק צמחים",
      "מייצר מים",
      "אין השפעה"
    ],
    "correctIndex": 0,
    "explanation": "חומרים באוויר פוגעים בריאות.",
    "params": {
      "patternFamily": "sci_phb_environment_g3_hard_g3_env_air_pollution",
      "subtype": "sci_environment_general",
      "conceptTag": "g3_env_air_pollution",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g3",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "hard",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g4_materials_eas_01",
    "topic": "materials",
    "grades": [
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איך מפרידים חול ממים בכלי?",
    "options": [
      "סינון או",
      "בישול בלבד",
      "צביעה",
      "הקפאה"
    ],
    "correctIndex": 0,
    "explanation": "הפרדה פיזית לפי גודל וצפיפות.",
    "params": {
      "patternFamily": "sci_phb_materials_g4_easy_g4_materials_sand_water_sep",
      "subtype": "sci_materials_general",
      "conceptTag": "g4_materials_sand_water_sep",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g4",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g4_materials_eas_02",
    "topic": "materials",
    "grades": [
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תכונה של נוזל?",
    "options": [
      "לוקח את צורת",
      "תמיד קשיח",
      "לא זז בדרך כלל",
      "תמיד שקוף"
    ],
    "correctIndex": 0,
    "explanation": "נוזלים נזילים.",
    "params": {
      "patternFamily": "sci_phb_materials_g4_easy_g4_materials_liquid_shape",
      "subtype": "sci_materials_general",
      "conceptTag": "g4_materials_liquid_shape",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g4",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g4_earth_space_eas_01",
    "topic": "earth_space",
    "grades": [
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה גורם לסירוגין של יום ולילה על כדור הארץ?",
    "options": [
      "סיבוב כדור",
      "הירח נעלם",
      "השמש נכבית",
      "רק גשם בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "סיבוב יוצר מחזור יום-לילה.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g4_easy_g4_earth_rotation_day",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g4_earth_rotation_day",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g4",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g4_earth_space_eas_02",
    "topic": "earth_space",
    "grades": [
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה השלב הראשון במחזור המים?",
    "options": [
      "אידוי",
      "גשם",
      "התעבות",
      "שקיעה"
    ],
    "correctIndex": 0,
    "explanation": "חום מגביר אידוי.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g4_easy_g4_earth_water_cycle_start",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g4_earth_water_cycle_start",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g4",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g4_environment_eas_01",
    "topic": "environment",
    "grades": [
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מהו בית גידול?",
    "options": [
      "מקום שבו בעל חיים",
      "סוג מזון בלבד",
      "שם של פרח בדרך כלל",
      "כלי בית ספר"
    ],
    "correctIndex": 0,
    "explanation": "בית גידול כולל תנאים לחיים.",
    "params": {
      "patternFamily": "sci_phb_environment_g4_easy_g4_env_habitat_def",
      "subtype": "sci_environment_general",
      "conceptTag": "g4_env_habitat_def",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g4",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g4_environment_eas_02",
    "topic": "environment",
    "grades": [
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה מקור האנרגיה בשרשרת מזון?",
    "options": [
      "השמש",
      "הירח",
      "האדמה בלבד",
      "הרוח בלבד"
    ],
    "correctIndex": 0,
    "explanation": "אור השמש מזין יצרנים.",
    "params": {
      "patternFamily": "sci_phb_environment_g4_easy_g4_env_sun_energy_chain",
      "subtype": "sci_environment_general",
      "conceptTag": "g4_env_sun_energy_chain",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g4",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g5_materials_eas_01",
    "topic": "materials",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה חומר מבודד חשמל טוב?",
    "options": [
      "גומי",
      "נחושת",
      "אלומיניום",
      "ברזל"
    ],
    "correctIndex": 0,
    "explanation": "גומי עוצר זרימת זרם.",
    "params": {
      "patternFamily": "sci_phb_materials_g5_easy_g5_materials_insulator",
      "subtype": "sci_materials_general",
      "conceptTag": "g5_materials_insulator",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g5",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g5_materials_eas_02",
    "topic": "materials",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה דוגמה לשינוי פיזיקלי?",
    "options": [
      "התכת קרח",
      "בעירת נייר",
      "חמצון ברז",
      "הפקת אור"
    ],
    "correctIndex": 0,
    "explanation": "התכה שומרת על מים.",
    "params": {
      "patternFamily": "sci_phb_materials_g5_easy_g5_materials_physical_change",
      "subtype": "sci_materials_general",
      "conceptTag": "g5_materials_physical_change",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g5",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g5_materials_eas_03",
    "topic": "materials",
    "grades": [
      "g5"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תכונה אופיינית של מתכת?",
    "options": [
      "מוליכה וגמישה",
      "תמיד שקופה",
      "תמיד רכה",
      "לא מוליכה"
    ],
    "correctIndex": 0,
    "explanation": "מתכות מוליכות וניתנות לעיצוב.",
    "params": {
      "patternFamily": "sci_phb_materials_g5_easy_g5_materials_metal_props",
      "subtype": "sci_materials_general",
      "conceptTag": "g5_materials_metal_props",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g5",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g5_materials_med_01",
    "topic": "materials",
    "grades": [
      "g5"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה משפיע על מהירות התמוססות מלח?",
    "options": [
      "ערבוב וטמפרטורה",
      "צבע הקערה בדרך כלל",
      "גובה החדר בדרך כלל",
      "שם המלח בלבד"
    ],
    "correctIndex": 0,
    "explanation": "חום וערבוב משנים קצב.",
    "params": {
      "patternFamily": "sci_phb_materials_g5_medium_g5_materials_dissolve_rate",
      "subtype": "sci_materials_general",
      "conceptTag": "g5_materials_dissolve_rate",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g5",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "medium",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g5_materials_med_02",
    "topic": "materials",
    "grades": [
      "g5"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה הבדל בין תערובת לתרכוב?",
    "options": [
      "תערובת ניתנת להפרדה",
      "אין הבדל בדרך כלל",
      "תרכוב תמיד גז",
      "תערובת תמיד אטום"
    ],
    "correctIndex": 0,
    "explanation": "בתרכוב חומרים משולבים כימית.",
    "params": {
      "patternFamily": "sci_phb_materials_g5_medium_g5_materials_mixture_compound",
      "subtype": "sci_materials_general",
      "conceptTag": "g5_materials_mixture_compound",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g5",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "medium",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g5_earth_space_eas_01",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה משפיע על מזג אוויר יומי?",
    "options": [
      "טמפרטורה, לחות",
      "צבע הבגד בדרך כלל",
      "גובה הכיסא",
      "שם העיר בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "גורמים מטאורולוגיים קובעים מזג.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g5_easy_g5_earth_daily_weather",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g5_earth_daily_weather",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g5",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g5_earth_space_eas_02",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "למה נוצרת רוח?",
    "options": [
      "תנועת אוויר בין",
      "סיבוב ירח בלבד",
      "צבע עננים בדרך כלל",
      "גובה עצים בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "הבדלי לחץ מניעים רוח.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g5_easy_g5_earth_wind_pressure",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g5_earth_wind_pressure",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g5",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g5_environment_eas_01",
    "topic": "environment",
    "grades": [
      "g5"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה משמעות שימור טבע?",
    "options": [
      "הגנה על מינים",
      "ציד חופשי",
      "כריתת יער",
      "זריקת זבל"
    ],
    "correctIndex": 0,
    "explanation": "שימור שומר על מערכות חיות.",
    "params": {
      "patternFamily": "sci_phb_environment_g5_easy_g5_env_conservation",
      "subtype": "sci_environment_general",
      "conceptTag": "g5_env_conservation",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g5",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g5_environment_eas_02",
    "topic": "environment",
    "grades": [
      "g5"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "למה מיחזור חשוב?",
    "options": [
      "מפחית פסולת",
      "מגדיל זבל",
      "מונע מים",
      "סוגר שמש"
    ],
    "correctIndex": 0,
    "explanation": "מיחזור חוסך חומרים.",
    "params": {
      "patternFamily": "sci_phb_environment_g5_easy_g5_env_recycle_importance",
      "subtype": "sci_environment_general",
      "conceptTag": "g5_env_recycle_importance",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g5",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g6_materials_eas_01",
    "topic": "materials",
    "grades": [
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה דוגמה לשינוי כימי?",
    "options": [
      "חלודה על ברז",
      "התכת קרח",
      "שבירת זכוכית",
      "קיפיאון מים"
    ],
    "correctIndex": 0,
    "explanation": "חמצון יוצר חומר חדש.",
    "params": {
      "patternFamily": "sci_phb_materials_g6_easy_g6_materials_chemical_change",
      "subtype": "sci_materials_general",
      "conceptTag": "g6_materials_chemical_change",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g6",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g6_materials_eas_02",
    "topic": "materials",
    "grades": [
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה חומר מבודד חשמל?",
    "options": [
      "פלסטיק עבה",
      "נחושת בדרך כלל",
      "אלומיניום",
      "ברזל בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "פלסטיק עוצר זרם.",
    "params": {
      "patternFamily": "sci_phb_materials_g6_easy_g6_materials_insulator_plastic",
      "subtype": "sci_materials_general",
      "conceptTag": "g6_materials_insulator_plastic",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g6",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g6_materials_eas_03",
    "topic": "materials",
    "grades": [
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה מצבי הצבירה של מים?",
    "options": [
      "מוצק, נוזל וגז",
      "אזור עם הרבה אנשים",
      "מקום עם מים",
      "אזור בטבע"
    ],
    "correctIndex": 0,
    "explanation": "מים יכולים בכל שלושת המצבים.",
    "params": {
      "patternFamily": "sci_phb_materials_g6_easy_g6_materials_water_states",
      "subtype": "sci_materials_general",
      "conceptTag": "g6_materials_water_states",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g6",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g6_materials_med_01",
    "topic": "materials",
    "grades": [
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה דוגמה לשינוי פיזיקלי שקורה במים?",
    "options": [
      "קיפיאון והתכה",
      "בעירה לגז הליום",
      "חמצון לחלודה",
      "הפקת אור"
    ],
    "correctIndex": 0,
    "explanation": "מעבר מצב צבירה הוא פיזיקלי.",
    "params": {
      "patternFamily": "sci_phb_materials_g6_medium_g6_materials_phase_change",
      "subtype": "sci_materials_general",
      "conceptTag": "g6_materials_phase_change",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g6",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "medium",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g6_materials_med_02",
    "topic": "materials",
    "grades": [
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה משפיע על קצב התמוססות?",
    "options": [
      "טמפרטורה וגודל",
      "צבע הקערה",
      "שם החומר בלבד",
      "גובה השולחן"
    ],
    "correctIndex": 0,
    "explanation": "חום ושטח פנים משנים קצב.",
    "params": {
      "patternFamily": "sci_phb_materials_g6_medium_g6_materials_dissolution_factors",
      "subtype": "sci_materials_general",
      "conceptTag": "g6_materials_dissolution_factors",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "expectedErrorTags": [
        "concept_confusion",
        "misconception",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_materials_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "materials",
        "grade": "g6",
        "skillId": "sci_materials_general",
        "subSkill": "sci_materials_general",
        "questionType": "technical",
        "problemClass": "mixed",
        "difficulty": "medium",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "concept_confusion",
          "misconception",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_materials_general",
    "skillId": "sci_materials_general"
  },
  {
    "id": "sci_phb_g6_earth_space_eas_01",
    "topic": "earth_space",
    "grades": [
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה קשור לעונות בחצי כדור?",
    "options": [
      "נטיית ציר",
      "סיבוב ירח",
      "גובה עננים",
      "צבע ים"
    ],
    "correctIndex": 0,
    "explanation": "זווית השמש ומסלול קובעים עונות.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g6_easy_g6_earth_seasons_tilt",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g6_earth_seasons_tilt",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g6",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g6_earth_space_eas_02",
    "topic": "earth_space",
    "grades": [
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד השמש במחזור המים?",
    "options": [
      "מספקת אנרגיה לאידוי",
      "מונעת גשם בדרך כלל",
      "סוגרת עננים בדרך כלל",
      "מחליפה את הירח"
    ],
    "correctIndex": 0,
    "explanation": "חום השמש מאיץ אידוי.",
    "params": {
      "patternFamily": "sci_phb_earth_space_g6_easy_g6_earth_sun_water_cycle",
      "subtype": "sci_earth_space_general",
      "conceptTag": "g6_earth_sun_water_cycle",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_earth_space_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "earth_space",
        "grade": "g6",
        "skillId": "sci_earth_space_general",
        "subSkill": "sci_earth_space_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_earth_space_general",
    "skillId": "sci_earth_space_general"
  },
  {
    "id": "sci_phb_g6_environment_eas_01",
    "topic": "environment",
    "grades": [
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מהו גיוון ביולוגי?",
    "options": [
      "מגוון מינים",
      "צבע עננים",
      "גובה הר בדרך כלל",
      "סוג בגד בדרך כלל"
    ],
    "correctIndex": 0,
    "explanation": "גיוון = הרבה מינים שונים.",
    "params": {
      "patternFamily": "sci_phb_environment_g6_easy_g6_env_biodiversity",
      "subtype": "sci_environment_general",
      "conceptTag": "g6_env_biodiversity",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion",
        "careless_error"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g6",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "recall",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "fact_recall_gap",
          "concept_confusion",
          "careless_error"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  },
  {
    "id": "sci_phb_g6_environment_eas_02",
    "topic": "environment",
    "grades": [
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "למה זיהום מים מסוכן?",
    "options": [
      "פוגע בבריאות",
      "מחזק דגים",
      "מייצר חמצן",
      "אין השפעה"
    ],
    "correctIndex": 0,
    "explanation": "זיהום מזיק לחיים במים.",
    "params": {
      "patternFamily": "sci_phb_environment_g6_easy_g6_env_water_pollution",
      "subtype": "sci_environment_general",
      "conceptTag": "g6_env_water_pollution",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "kind": "phase_b",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "expectedErrorTags": [
        "misconception",
        "concept_confusion",
        "fact_recall_gap"
      ],
      "diagnosticSkillId": "sci_environment_general",
      "canonicalMetadata": {
        "contractVersion": "question-metadata-contract-v1",
        "subject": "science",
        "topic": "environment",
        "grade": "g6",
        "skillId": "sci_environment_general",
        "subSkill": "sci_environment_general",
        "questionType": "technical",
        "problemClass": "conceptual",
        "difficulty": "basic",
        "difficultyDepth": "simple_application",
        "requiresVisual": false,
        "requiresAudio": false,
        "answerFormat": "mcq",
        "metadataConfidence": "high",
        "diagnosticEligibleByMetadata": true,
        "possibleErrorPatterns": [
          "misconception",
          "concept_confusion",
          "fact_recall_gap"
        ],
        "notes": null
      }
    },
    "subSkill": "sci_environment_general",
    "skillId": "sci_environment_general"
  }
];
