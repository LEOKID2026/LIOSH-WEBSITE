import { getLearningSupabaseServerClient } from "../../../lib/learning-supabase/server";

import { isProductionRuntime } from "../../../lib/security/production-guard.js";

import {

  buildLearningSupabaseHealthBody,

  buildLearningSupabaseHealthErrorBody,

} from "../../../lib/security/learning-supabase-health-response.js";



const REQUIRED_TABLES = [

  "parent_profiles",

  "students",

  "student_access_codes",

  "student_sessions",

  "learning_sessions",

  "answers",

  "parent_reports",

  "student_coin_balances",

  "coin_transactions",

  "coin_reward_rules",

  "coin_spend_rules",

  "shop_items",

  "student_inventory",

];



const DEV_PROJECT_HOST = "ajxwmlwbzxwffrtlfuoe.supabase.co";



export default async function handler(req, res) {

  if (req.method !== "GET") {

    return res.status(405).json({ ok: false, error: "Method not allowed" });

  }



  const maskInternals = isProductionRuntime();

  const checkedAt = new Date().toISOString();



  try {

    const supabase = getLearningSupabaseServerClient();

    const tableChecks = [];



    for (const tableName of REQUIRED_TABLES) {

      const { error } = await supabase.from(tableName).select("*", { head: true, count: "exact" }).limit(1);

      tableChecks.push({

        table: tableName,

        ok: !error,

        errorCode: error?.code || null,

      });

    }



    const body = buildLearningSupabaseHealthBody(tableChecks, {

      maskInternals,

      projectHost: DEV_PROJECT_HOST,

      checkedAt,

    });



    return res.status(body.ok ? 200 : 503).json(body);

  } catch (_error) {

    return res.status(503).json(

      buildLearningSupabaseHealthErrorBody({

        maskInternals,

        projectHost: DEV_PROJECT_HOST,

        checkedAt,

      })

    );

  }

}


