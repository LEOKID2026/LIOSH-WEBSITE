/** Chunk helpers for Supabase `.in()` filters — avoid URL/header overflow. */
export const DEFAULT_IN_CHUNK_SIZE = 100;

export function chunkArray(arr, size = DEFAULT_IN_CHUNK_SIZE) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} table
 * @param {string} select
 * @param {string} column
 * @param {string[]} ids
 */
export async function selectByInChunks(serviceRole, table, select, column, ids, chunkSize = DEFAULT_IN_CHUNK_SIZE) {
  const rows = [];
  for (const chunk of chunkArray(ids, chunkSize)) {
    if (!chunk.length) continue;
    const { data, error } = await serviceRole.from(table).select(select).in(column, chunk);
    if (error) throw error;
    if (data?.length) rows.push(...data);
  }
  return rows;
}
