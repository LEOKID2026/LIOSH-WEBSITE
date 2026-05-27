/** Shared pagination/chunk helpers for school server queries. */

export function chunkIds(ids, size = 80) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

/**
 * Count rows grouped by a column, paginating past PostgREST default row limits.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} table
 * @param {string} groupColumn
 * @param {string} idColumn
 * @param {string[]} ids
 * @param {(query: import('@supabase/supabase-js').PostgrestFilterBuilder<any, any, any>) => import('@supabase/supabase-js').PostgrestFilterBuilder<any, any, any>} [applyFilters]
 */
export async function countRowsByGroupColumn(serviceRole, table, groupColumn, idColumn, ids, applyFilters) {
  const counts = new Map();
  if (!ids.length) return counts;

  const pageSize = 1000;
  for (const chunk of chunkIds(ids, 40)) {
    let from = 0;
    while (true) {
      let query = serviceRole.from(table).select(groupColumn).in(idColumn, chunk);
      if (typeof applyFilters === "function") {
        query = applyFilters(query);
      }
      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) return { ok: false, error };
      const rows = data || [];
      for (const row of rows) {
        const key = row[groupColumn];
        if (key == null) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      if (rows.length < pageSize) break;
      from += pageSize;
    }
  }

  return { ok: true, counts };
}
