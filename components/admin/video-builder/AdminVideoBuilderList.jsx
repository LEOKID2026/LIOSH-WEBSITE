import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import AdminSectionCard from "../AdminSectionCard.jsx";
import {
  VB_ARCHIVE,
  VB_COL_ACTIONS,
  VB_COL_NAME,
  VB_COL_STATUS,
  VB_COL_UPDATED,
  VB_DELETE,
  VB_DELETE_CONFIRM,
  VB_DOWNLOAD,
  VB_EDIT,
  VB_HIDE_ARCHIVED,
  VB_LIST_ACTIVE_HINT,
  VB_LOAD_ERROR,
  VB_NEW_VIDEO,
  VB_NO_VIDEOS,
  VB_SHOW_ARCHIVED,
  VB_STATUS_ARCHIVED,
  VB_STATUS_DRAFT,
  VB_STATUS_EXPORTED,
  VB_UNARCHIVE,
  VB_VIEW,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("he-IL");
  } catch {
    return iso;
  }
}

function statusLabel(project) {
  if (project.archived) return VB_STATUS_ARCHIVED;
  return project.status === "exported" ? VB_STATUS_EXPORTED : VB_STATUS_DRAFT;
}

function statusClass(project) {
  if (project.archived) return "text-white/45";
  return project.status === "exported" ? "text-emerald-300" : "text-amber-200/90";
}

/**
 * @param {{ accessToken: string }} props
 */
export default function AdminVideoBuilderList({ accessToken }) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = showArchived ? "?includeArchived=1" : "";
      const res = await adminAuthFetch(accessToken, `/api/admin/video-builder${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || VB_LOAD_ERROR);
      setProjects(json?.data?.projects || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : VB_LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [accessToken, showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setBusyId("new");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/video-builder", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || VB_LOAD_ERROR);
      const id = json?.data?.project?.id;
      if (id) await router.push(`/admin/video-builder/${id}`);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : VB_LOAD_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(VB_DELETE_CONFIRM)) return;
    setBusyId(id);
    try {
      const res = await adminAuthFetch(accessToken, `/api/admin/video-builder/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message || VB_LOAD_ERROR);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : VB_LOAD_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchiveToggle(id, archived) {
    setBusyId(id);
    try {
      const res = await adminAuthFetch(accessToken, `/api/admin/video-builder/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || VB_LOAD_ERROR);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : VB_LOAD_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-white/60">טיוטות וסרטונים שיוצאו</p>
          {!showArchived ? (
            <p className="text-xs text-white/40">{VB_LIST_ACTIVE_HINT}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
          >
            {showArchived ? VB_HIDE_ARCHIVED : VB_SHOW_ARCHIVED}
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={busyId === "new"}
            className="rounded-lg bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busyId === "new" ? "…" : VB_NEW_VIDEO}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-300 text-right">{error}</p> : null}

      <AdminSectionCard title="">
        {loading ? (
          <p className="text-sm text-white/60 text-right">טוען…</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-white/60 text-right">{VB_NO_VIDEOS}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="py-2 px-2 font-medium">{VB_COL_NAME}</th>
                  <th className="py-2 px-2 font-medium">{VB_COL_UPDATED}</th>
                  <th className="py-2 px-2 font-medium">{VB_COL_STATUS}</th>
                  <th className="py-2 px-2 font-medium">{VB_COL_ACTIONS}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-white/5 hover:bg-white/5 ${p.archived ? "opacity-70" : ""}`}
                  >
                    <td className="py-2 px-2 font-medium">{p.name}</td>
                    <td className="py-2 px-2 text-white/70 tabular-nums">{formatDate(p.updatedAt)}</td>
                    <td className="py-2 px-2">
                      <span className={statusClass(p)}>{statusLabel(p)}</span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Link
                          href={`/admin/video-builder/${p.id}`}
                          className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                        >
                          {VB_EDIT}
                        </Link>
                        {p.outputMp4Path ? (
                          <>
                            <a
                              href={p.outputMp4Path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded border border-emerald-400/30 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10"
                            >
                              {VB_VIEW}
                            </a>
                            <a
                              href={p.outputMp4Path}
                              download
                              className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                            >
                              {VB_DOWNLOAD}
                            </a>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleArchiveToggle(p.id, !p.archived)}
                          disabled={busyId === p.id}
                          className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-50"
                        >
                          {p.archived ? VB_UNARCHIVE : VB_ARCHIVE}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(p.id)}
                          disabled={busyId === p.id}
                          className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {VB_DELETE}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}
