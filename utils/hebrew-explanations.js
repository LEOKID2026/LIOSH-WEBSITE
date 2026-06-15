export function getHint(question, topic, gradeKey) {
  if (!question || !question.params) return "";

  const p = question.params;

  switch (topic) {
    case "reading":
      return "קרא את המילה בעיון. נסה לזהות את האותיות והצלילים.";
    case "comprehension":
      return "קרא את הטקסט בעיון והבין את המשמעות. נסה להבין את ההקשר.";
    case "writing":
      return "בדוק את כללי הכתיבה והדקדוק. זכור את כללי הכתיב הנכון.";
    case "grammar":
      return "חשוב על חלקי הדיבר: שם עצם, פועל, תואר. כל מילה שייכת לחלק דיבר מסוים.";
    case "vocabulary":
      return "חשוב על המשמעות של המילה בהקשר. נסה להיזכר במילים דומות.";
    case "speaking":
      return "חשוב על איך אומרים את המילה או המשפט. זכור את כללי השיח.";
    default:
      return "קרא היטב את השאלה וחשוב על התשובה הנכונה.";
  }
}

export function getSolutionSteps(question, topic, gradeKey) {
  if (!question) return [];

  const steps = [];
  
  switch (topic) {
    case "reading":
      steps.push("קרא את המילה בזהירות");
      steps.push("זהה את האותיות והצלילים");
      steps.push("חבר את האותיות למילה שלמה");
      break;
    case "comprehension":
      steps.push("קרא את הטקסט בעיון");
      steps.push("הבן את המשמעות וההקשר");
      steps.push("זהה את התשובה הנכונה לפי הטקסט");
      break;
    case "writing":
      steps.push("בדוק את כללי הכתיב");
      steps.push("בדוק את כללי הדקדוק");
      steps.push("ודא שהמשפט נכון ומלא");
      break;
    case "grammar":
      steps.push("זהה את חלק הדיבר");
      steps.push("בדוק את התפקיד במשפט");
      steps.push("בחר את התשובה הנכונה");
      break;
    case "vocabulary":
      steps.push("הבן את המשמעות של המילה");
      steps.push("חשוב על ההקשר");
      steps.push("בחר את התשובה הנכונה");
      break;
    case "speaking":
      steps.push("חשוב על איך אומרים את המילה");
      steps.push("בדוק את כללי השיח");
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
    case "reading":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". קרא את המילה בעיון וזהה את האותיות הנכונות.`
        : "קרא את המילה בעיון וזהה את האותיות לפי מה שלמדנו.";
    case "comprehension":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". קרא את הטקסט בעיון והבין את המשמעות.`
        : "קרא את הטקסט בעיון והבין את המשמעות לפני שבוחרים תשובה.";
    case "writing":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". בדוק את כללי הכתיב והדקדוק.`
        : "בדוק שוב את כללי הכתיב והדקדוק לפי מה שלמדנו.";
    case "grammar":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". חשוב על חלקי הדיבר השונים.`
        : "חשוב על חלקי הדיבר ועל המשמעות של המשפט.";
    case "vocabulary":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". הבן את המשמעות של המילה.`
        : "הבן את המשמעות של המילה לפי ההקשר.";
    case "speaking":
      return learning
        ? `התשובה הנכונה היא "${correctAnswer}". זכור את כללי השיח והביטוי.`
        : "זכור את כללי השיח והביטוי שתרגלנו.";
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

