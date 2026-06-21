import { withStudentCardsApi } from "../../../../../lib/rewards/server/student-cards-api-auth.server.js";
import { getStudentCardsSeriesView } from "../../../../../lib/rewards/server/reward-cards.server.js";

export default async function handler(req, res) {
  await withStudentCardsApi(req, res, async ({ supabase, studentId }) => {
    const view = await getStudentCardsSeriesView(supabase, studentId);
    return res.status(200).json({ ok: true, ...view });
  });
}
