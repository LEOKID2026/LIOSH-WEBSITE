/**

 * Worksheet stem — Hebrew RTL prose with isolated LTR math islands.

 */



import { renderLearningMixedHebrewMathText } from "../learning/LearningMixedHebrewMathText.jsx";

import WorksheetMathLtr from "./WorksheetMathLtr.jsx";

import {

  isWorksheetMathLtrExpression,

  worksheetStemHasHebrew,

} from "../../lib/worksheets/worksheet-math-ltr-display.js";



/**

 * @param {{

 *   text?: string,

 *   hasNikud?: boolean,

 *   className?: string,

 * }} props

 */

export default function WorksheetStemText({ text = "", hasNikud = false, className = "worksheet-stem" }) {

  const value = String(text || "").trim();

  if (!value) return null;



  const nikudClass = hasNikud ? " worksheet-hebrew-nikud" : "";



  if (isWorksheetMathLtrExpression(value)) {

    return (

      <p className={`${className}${nikudClass} worksheet-stem-math`}>

        <WorksheetMathLtr block>{value}</WorksheetMathLtr>

      </p>

    );

  }



  if (worksheetStemHasHebrew(value)) {

    return (

      <p className={`${className}${nikudClass}`}>

        {renderLearningMixedHebrewMathText(value, className)}

      </p>

    );

  }



  return <p className={`${className}${nikudClass}`}>{value}</p>;

}
