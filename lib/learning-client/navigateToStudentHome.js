/** Explicit exit from learning subject pages back to the student portal. */

export const STUDENT_HOME_PATH = "/student/home";

/**
 * @param {{ push: (path: string) => void }} router - Next.js router instance
 */
export function navigateToStudentHome(router) {
  router.push(STUDENT_HOME_PATH);
}
