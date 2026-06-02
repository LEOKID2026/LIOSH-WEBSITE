export const BLANK = "__";

export const LEVELS = {
  easy: {
    name: "קל",
  },
  medium: {
    name: "בינוני",
  },
  hard: {
    name: "קשה",
  },
};

// נושאים למולדת, חברה ואזרחות + גאוגרפיה
export const TOPICS = {
  homeland: { name: "מולדת", description: "היכרות עם ארץ ישראל" },
  community: { name: "קהילה", description: "חיי קהילה ומשפחה" },
  citizenship: { name: "אזרחות", description: "יסודות בחברה ודמוקרטיה" },
  geography: { name: "גאוגרפיה", description: "מפות, נוף, אקלים, יישובים" },
  values: { name: "ערכים", description: "ערכים, שייכות, זהות ישראלית" },
  maps: { name: "מפות", description: "קריאת מפות וניווט" },
  mixed: { name: "ערבוב", description: "שילוב כל הנושאים" },
};

export const GRADE_LEVELS = {
  1: {
    name: "כיתה א׳",
    levels: {
      easy: {
        homeland: { basicConcepts: true, introduction: true },
        community: { family: true, roles: true, classroom: true, school: true },
        citizenship: { behavior: true, cooperation: true },
        geography: { classMap: true, schoolMap: true },
        values: { holidays: true, traditions: true },
        maps: { basicMaps: true, orientation: true },
      },
      medium: {
        homeland: { israelConcepts: true, basicGeography: true },
        community: { neighborhood: true, services: true },
        citizenship: { rules: true, responsibility: true },
        geography: { neighborhoodMap: true, landmarks: true },
        values: { communityValues: true, belonging: true },
        maps: { readingMaps: true, symbols: true },
      },
      hard: {
        homeland: { israelRegions: true, cities: true },
        community: { city: true, services: true, institutions: true },
        citizenship: { decisionMaking: true, participation: true },
        geography: { cityMap: true, regions: true },
        values: { israeliIdentity: true, diversity: true },
        maps: { advancedMaps: true, navigation: true },
      },
    },
  },
  2: {
    name: "כיתה ב׳",
    levels: {
      easy: {
        homeland: { israelBasics: true, concepts: true },
        community: { neighborhood: true, buildings: true, environments: true },
        citizenship: { groupDecisions: true, responsibility: true },
        geography: { neighborhoodMap: true, landmarks: true },
        values: { societyBasics: true, cooperation: true },
        maps: { basicMaps: true, symbols: true },
      },
      medium: {
        homeland: { israelRegions: true, geography: true },
        community: { communityServices: true, library: true, communityCenter: true, transportation: true },
        citizenship: { participation: true, rules: true },
        geography: { regionalMaps: true, landscapeTypes: true },
        values: { communityValues: true, belonging: true },
        maps: { readingMaps: true, scale: true },
      },
      hard: {
        homeland: { israelGeography: true, majorCities: true },
        community: { urbanPlanning: true, services: true },
        citizenship: { activeCitizenship: true, involvement: true },
        geography: { israelMap: true, geographicFeatures: true },
        values: { israeliIdentity: true, culturalDiversity: true },
        maps: { advancedMaps: true, coordinates: true },
      },
    },
  },
  3: {
    name: "כיתה ג׳",
    levels: {
      easy: {
        homeland: { israelMap: true, regions: true, majorCities: true },
        community: { socialIntegration: true, groups: true },
        citizenship: { citizenshipBasics: true, rights: true, duties: true },
        geography: { landscapeTypes: true, desert: true, mountain: true, sea: true },
        values: { israeliIdentity: true, heritage: true },
        maps: { israelMap: true, districts: true, borders: true },
      },
      medium: {
        homeland: { israelGeography: true, regions: true, cities: true },
        community: { socialStructure: true, institutions: true },
        citizenship: { democraticPrinciples: true, participation: true },
        geography: { continents: true, seas: true, waterSources: true, naturalResources: true },
        values: { values: true, belonging: true, identity: true },
        maps: { regionalMaps: true, topographic: true },
      },
      hard: {
        homeland: { israelComprehensive: true, geography: true, history: true },
        community: { complexSociety: true, diversity: true },
        citizenship: { activeCitizenship: true, democracy: true },
        geography: { physicalGeography: true, climate: true, resources: true },
        values: { israeliIdentity: true, pluralism: true, tolerance: true },
        maps: { complexMaps: true, analysis: true },
      },
    },
  },
  4: {
    name: "כיתה ד׳",
    levels: {
      easy: {
        homeland: { settlementTypes: true, city: true, moshav: true, kibbutz: true },
        community: { settlementDevelopment: true, history: true },
        citizenship: { basicGovernance: true, institutions: true },
        geography: { naturalResources: true, water: true, land: true, energy: true },
        values: { settlementValues: true, community: true },
        maps: { scale: true, symbols: true, conventions: true },
      },
      medium: {
        homeland: { israelSettlements: true, development: true, history: true },
        community: { settlementStructure: true, organization: true },
        citizenship: { governance: true, localGovernment: true },
        geography: { resourceManagement: true, conservation: true },
        values: { settlementValues: true, cooperation: true, equality: true },
        maps: { advancedMaps: true, topographic: true, thematic: true },
      },
      hard: {
        homeland: { comprehensiveSettlements: true, planning: true, development: true },
        community: { advancedSociety: true, institutions: true },
        citizenship: { advancedGovernance: true, democracy: true },
        geography: { advancedResources: true, sustainability: true },
        values: { advancedValues: true, israeliIdentity: true, pluralism: true },
        maps: { complexMaps: true, GIS: true, analysis: true },
      },
    },
  },
  5: {
    name: "כיתה ה׳",
    levels: {
      easy: {
        homeland: { israelClimate: true, desert: true, mediterranean: true, mountains: true },
        community: { naturalHazards: true, earthquakes: true, floods: true },
        citizenship: { basicInstitutions: true, government: true },
        geography: { coordinateGrid: true, advancedMaps: true },
        values: { law: true, society: true, rules: true },
        maps: { coordinates: true, grid: true, navigation: true },
      },
      medium: {
        homeland: { israelGeography: true, climate: true, naturalPhenomena: true },
        community: { naturalHazards: true, disasterPrevention: true, safety: true },
        citizenship: { governance: true, institutions: true, democracy: true },
        geography: { resources: true, water: true, land: true, energy: true },
        values: { personalIdentity: true, communityIdentity: true, israeliIdentity: true },
        maps: { advancedCoordinates: true, thematic: true, analysis: true },
      },
      hard: {
        homeland: { comprehensiveGeography: true, climate: true, resources: true },
        community: { comprehensiveHazards: true, prevention: true, adaptation: true },
        citizenship: { comprehensiveGovernance: true, democracy: true, participation: true },
        geography: { comprehensiveResources: true, sustainability: true, conservation: true },
        values: { comprehensiveIdentity: true, pluralism: true, tolerance: true },
        maps: { comprehensiveMaps: true, GIS: true, research: true },
      },
    },
  },
  6: {
    name: "כיתה ו׳",
    levels: {
      easy: {
        homeland: { israelPopulation: true, cultures: true, religions: true, groups: true },
        community: { naturalPhenomena: true, mountains: true, valleys: true, deserts: true },
        citizenship: { democracy: true, equality: true, liberty: true, justice: true },
        geography: { environment: true, nature: true, conservation: true },
        values: { humanEnvironment: true, relationships: true, sustainability: true },
        maps: { advancedMaps: true, analysis: true, research: true },
      },
      medium: {
        homeland: { comprehensivePopulation: true, diversity: true, integration: true },
        community: { comprehensiveGeography: true, phenomena: true, processes: true },
        citizenship: { israelDemocracy: true, institutions: true, knesset: true, government: true, president: true, localAuthorities: true },
        geography: { comprehensiveEnvironment: true, conservation: true, sustainability: true },
        values: { comprehensiveValues: true, israeliIdentity: true, pluralism: true },
        maps: { comprehensiveMaps: true, GIS: true, research: true },
      },
      hard: {
        homeland: { advancedPopulation: true, research: true, analysis: true },
        community: { advancedGeography: true, research: true, science: true },
        citizenship: { advancedDemocracy: true, decisionMaking: true, socialInvolvement: true },
        geography: { advancedEnvironment: true, research: true, conservation: true },
        values: { advancedValues: true, research: true, philosophy: true },
        maps: { advancedMaps: true, GIS: true, remoteSensing: true },
      },
    },
  },
};

export const GRADES = {
  g1: {
    name: "כיתה א׳",
    topics: [],
  },
  g2: {
    name: "כיתה ב׳",
    topics: [
      "homeland",
      "community",
      "citizenship",
      "geography",
      "values",
      "maps",
      "mixed",
    ],
  },
  g3: {
    name: "כיתה ג׳",
    topics: [
      "homeland",
      "community",
      "citizenship",
      "geography",
      "values",
      "maps",
      "mixed",
    ],
  },
  g4: {
    name: "כיתה ד׳",
    topics: [
      "homeland",
      "community",
      "citizenship",
      "geography",
      "values",
      "maps",
      "mixed",
    ],
  },
  g5: {
    name: "כיתה ה׳",
    topics: [
      "homeland",
      "community",
      "citizenship",
      "geography",
      "values",
      "maps",
      "mixed",
    ],
  },
  g6: {
    name: "כיתה ו׳",
    topics: [
      "homeland",
      "community",
      "citizenship",
      "geography",
      "values",
      "maps",
      "mixed",
    ],
  },
};

export const MODES = {
  learning: {
    name: "למידה",
    description: "ללא סיום משחק, תרגול בקצב שלך",
  },
  challenge: {
    name: "אתגר",
    description: "טיימר + חיים, מרוץ ניקוד גבוה",
  },
  speed: {
    name: "מהירות",
    description: "תשובות מהירות = יותר נקודות! ⚡",
  },
  marathon: {
    name: "מרתון",
    description: "כמה שאלות תוכל לפתור? 🏃",
  },
  practice: {
    name: "תרגול",
    description: "התמקד בנושא אחד 📚",
  },
};

export const STORAGE_KEY = "mleo_moledet_geography_master";

// פונקציה עזר לקבלת הגדרות רמה לכיתה
export function getLevelConfig(gradeNumber, level) {
  const gradeLevels = GRADE_LEVELS[gradeNumber];
  if (!gradeLevels) return null;
  return gradeLevels.levels[level] || null;
}

// פונקציה עזר לקבלת רמה לכיתה
export function getLevelForGrade(gradeNumber, topic) {
  // להחזיר את הרמה המתאימה לפי הנושא והכיתה
  return "easy"; // ברירת מחדל - נוכל להתאים בהמשך
}

