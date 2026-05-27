import { useState } from "react";
import {
  SC_CREDENTIAL_BOX_HEADING,
  SC_CREDENTIAL_BOX_WARNING,
  SC_CREDENTIAL_BTN_DISMISS,
  SC_CREDENTIAL_COPIED,
  SC_CREDENTIAL_LABEL_PIN,
  SC_CREDENTIAL_LABEL_USERNAME,
  SC_BTN_COPY_CREDENTIALS,
} from "../../lib/school-portal/school-communication.he";
import { SCHOOL_PORTAL_BTN_CURSOR } from "./SchoolPortalUi";

export default function SchoolCredentialShownOnceBox({ credentials, onDismiss }) {
  const [copied, setCopied] = useState(false);
  if (!credentials?.loginUsername || !credentials?.loginPinOnce) return null;

  const copyAll = async () => {
    const text = `${SC_CREDENTIAL_LABEL_USERNAME}: ${credentials.loginUsername}\n${SC_CREDENTIAL_LABEL_PIN}: ${credentials.loginPinOnce}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-right space-y-3"
      data-testid="school-credential-once-box"
    >
      <p className="font-semibold text-amber-200">{SC_CREDENTIAL_BOX_HEADING}</p>
      <p className="text-xs text-amber-100/90">{SC_CREDENTIAL_BOX_WARNING}</p>
      <dl className="text-sm space-y-2 font-mono">
        <div>
          <dt className="text-white/50 text-xs">{SC_CREDENTIAL_LABEL_USERNAME}</dt>
          <dd className="text-white">{credentials.loginUsername}</dd>
        </div>
        <div>
          <dt className="text-white/50 text-xs">{SC_CREDENTIAL_LABEL_PIN}</dt>
          <dd className="text-white">{credentials.loginPinOnce}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={() => void copyAll()}
          className={`rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-semibold ${SCHOOL_PORTAL_BTN_CURSOR}`}
        >
          {copied ? SC_CREDENTIAL_COPIED : SC_BTN_COPY_CREDENTIALS}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className={`rounded-lg bg-amber-500 text-black px-3 py-1.5 text-sm font-semibold ${SCHOOL_PORTAL_BTN_CURSOR}`}
        >
          {SC_CREDENTIAL_BTN_DISMISS}
        </button>
      </div>
    </div>
  );
}
