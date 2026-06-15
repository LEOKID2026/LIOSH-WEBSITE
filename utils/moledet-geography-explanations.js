export function getHint(question, topic, gradeKey) {
  if (!question || !question.params) return "";

  const p = question.params;

  switch (topic) {
    case "homeland":
      return "חשוב על הידע שלך על ארץ ישראל: ערים, נהרות, ימים, אזורים.";
    case "community":
      return "חשוב על חיי הקהילה והמשפחה. מה תפקידם של מקומות ציבוריים?";
    case "citizenship":
      return "חשוב על זכויות וחובות של אזרחים. מה היא דמוקרטיה?";
    case "geography":
      return "חשוב על מושגים גאוגרפיים: נופים, אקלים, תופעות טבע.";
    case "values":
      return "חשוב על ערכים חשובים בחברה: כבוד, שיתוף פעולה, אחריות.";
    case "maps":
      return "חשוב על קריאת מפות: כיוונים, קנה מידה, סמלים.";
    default:
      return "קרא היטב את השאלה וחשוב על התשובה הנכונה.";
  }
}

export function getSolutionSteps(question, topic, gradeKey) {
  if (!question) return [];

  const steps = [];
  
  switch (topic) {
    case "homeland":
      steps.push("נסה להיזכר בידע שלך על ארץ ישראל");
      steps.push("חשוב על הערים, האזורים והגבולות");
      steps.push("בחר את התשובה הנכונה");
      break;
    case "community":
      steps.push("חשוב על חיי הקהילה והמשפחה");
      steps.push("הבן את התפקיד של מקומות ציבוריים");
      steps.push("בחר את התשובה הנכונה");
      break;
    case "citizenship":
      steps.push("חשוב על זכויות וחובות של אזרחים");
      steps.push("הבן את משמעות הדמוקרטיה");
      steps.push("בחר את התשובה הנכונה");
      break;
    case "geography":
      steps.push("חשוב על מושגים גאוגרפיים");
      steps.push("הבן את המשמעות של נופים ואקלים");
      steps.push("בחר את התשובה הנכונה");
      break;
    case "values":
      steps.push("חשוב על ערכים חשובים בחברה");
      steps.push("הבן את המשמעות של כל ערך");
      steps.push("בחר את התשובה הנכונה");
      break;
    case "maps":
      steps.push("חשוב על קריאת מפות");
      steps.push("הבן את המשמעות של כיוונים וסמלים");
      steps.push("בחר את התשובה הנכונה");
      break;
    default:
      steps.push("קרא את השאלה");
      steps.push("חשוב על התשובה");
      steps.push("בחר את התשובה הנכונה");
  }

  return steps;
}

export function getErrorExplanation(question, topic, wrongAnswer, gradeKey, opts = {}) {
  if (!question) return "";

  const correctAnswer = question.correctAnswer;
  const learning = opts.mode === "learning";

  switch (topic) {
    case "homeland":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". נסה להיזכר בידע שלך על ארץ ישראל.`
        : "נסה להיזכר בידע שלך על ארץ ישראל לפני שבוחרים שוב.";
    case "community":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". חשוב על חיי הקהילה והמשפחה.`
        : "חשוב על חיי הקהילה והמשפחה לפי מה שלמדנו.";
    case "citizenship":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". הבן את זכויות וחובות האזרחים.`
        : "הבן את זכויות וחובות האזרחים לפי מה שלמדנו.";
    case "geography":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". חשוב על מושגים גאוגרפיים.`
        : "חשוב על מושגים גאוגרפיים והקשר שלהם לשאלה.";
    case "values":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". הבן את משמעות הערכים.`
        : "הבן את משמעות הערכים לפי ההקשר.";
    case "maps":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". הבן את קריאת המפות.`
        : "הבן את קריאת המפות לפי הסמלים והכיוונים.";
    default:
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}".`
        : "קרא את השאלה שוב ובחר תשובה לפי מה שלמדנו.";
  }
}

export function buildStepExplanation(question) {
  if (!question) return null;

  const topic = question.topic || question.operation;
  const steps = getSolutionSteps(question, topic, question.params?.grade);

  return {
    exercise: question.question || question.exerciseText,
    steps: steps,
    vertical: null,
  };
}
