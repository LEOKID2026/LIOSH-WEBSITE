import { useCallback, useState } from "react";

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * @param {{ disabled?: boolean, fileRole?: string, onUploaded?: (result: { fileId: string, originalFilename: string }) => void, uploadFn: (file: File) => Promise<{ ok: boolean, error?: string, fileId?: string, originalFilename?: string }> }} props
 */
export default function PdfUploader({ disabled, fileRole = "worksheet", onUploaded, uploadFn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastName, setLastName] = useState("");

  const handleFile = useCallback(
    async (file) => {
      setError("");
      if (!file) return;
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("ניתן להעלות קבצי PDF בלבד");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("הקובץ גדול מדי. גודל מקסימלי: 20MB");
        return;
      }
      setBusy(true);
      try {
        const result = await uploadFn(file);
        if (!result.ok) {
          setError(result.error || "העלאה נכשלה");
          return;
        }
        setLastName(result.originalFilename || file.name);
        onUploaded?.({ fileId: result.fileId, originalFilename: result.originalFilename || file.name });
      } catch {
        setError("שגיאת רשת");
      } finally {
        setBusy(false);
      }
    },
    [onUploaded, uploadFn]
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-right">
      <p className="text-sm text-white/80 mb-2">
        {fileRole === "answer_key" ? "העלאת מחוון PDF (למורה בלבד)" : "העלאת דף עבודה PDF"}
      </p>
      <input
        type="file"
        accept="application/pdf,.pdf"
        disabled={disabled || busy}
        className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-500/90 file:text-black file:font-semibold"
        onChange={(e) => {
          const f = e.target.files?.[0];
          void handleFile(f);
          e.target.value = "";
        }}
      />
      {lastName ? <p className="text-xs text-emerald-300/90 mt-2">✓ {lastName}</p> : null}
      {error ? <p className="text-xs text-red-300 mt-2">{error}</p> : null}
      {busy ? <p className="text-xs text-white/50 mt-2">מעלה…</p> : null}
    </div>
  );
}
