import { useCallback, useEffect, useState } from "react";



/** @param {{ gh: Record<string, string>, className?: string }} props */

export default function ArcadeClubEventsPanel({ gh, className = "" }) {

  const [event, setEvent] = useState(null);

  const [tournament, setTournament] = useState(null);

  const [message, setMessage] = useState("");

  const [busy, setBusy] = useState(false);



  const load = useCallback(async () => {

    const [eRes, tRes] = await Promise.all([

      fetch("/api/arcade/events"),

      fetch("/api/arcade/events?resource=tournament"),

    ]);

    const eJson = await eRes.json().catch(() => ({}));

    const tJson = await tRes.json().catch(() => ({}));

    if (eJson?.ok) setEvent(eJson.event || null);

    if (tJson?.ok) setTournament(tJson.tournament || null);

  }, []);



  useEffect(() => {

    void load();

  }, [load]);



  const claimEvent = async () => {

    if (!event?.id || !event.canClaim) return;

    setBusy(true);

    setMessage("");

    try {

      const res = await fetch("/api/arcade/events", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ action: "claim_event", eventId: event.id }),

      });

      const json = await res.json().catch(() => ({}));

      setMessage(json.ok ? "פרס נאסף!" : json.message || json.error || "שגיאה");

      if (json.ok) await load();

    } finally {

      setBusy(false);

    }

  };



  const registerTournament = async () => {

    if (!tournament?.id || !tournament.registrationOpen || tournament.registered) return;

    setBusy(true);

    try {

      const res = await fetch("/api/arcade/events", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ action: "register_tournament", tournamentId: tournament.id }),

      });

      const json = await res.json().catch(() => ({}));

      setMessage(json.ok ? "נרשמת לטורניר!" : json.message || json.error || "שגיאה");

      if (json.ok) await load();

    } finally {

      setBusy(false);

    }

  };



  if (!event && !tournament) return null;



  return (

    <div className={`${gh.arcadePanelEvents || gh.card} space-y-3 p-4 text-right ${className}`} dir="rtl">

      {event ? (

        <div>

          <p className={`text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>אירוע יומי</p>

          <p className={`font-bold ${gh.arcadePanelTitle || gh.cardTitle}`}>{event.titleHe || "אתגר היום"}</p>

          <p className={`text-sm ${gh.arcadePanelBlurb || gh.cardBlurb}`}>+{event.rewardCoins || 0} מטבעות</p>

          {event.claimed ? (

            <p className="mt-1 text-xs font-semibold text-emerald-700">נאסף ✓</p>

          ) : event.canClaim ? (

            <button type="button" disabled={busy} onClick={() => void claimEvent()} className={`mt-2 ${gh.btnJoinRoom}`}>

              אסוף פרס

            </button>

          ) : (

            <p className={`mt-1 text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>שחק משחק ארקייד כדי להשלים את האתגר</p>

          )}

        </div>

      ) : null}

      {tournament ? (

        <div className="border-t border-violet-200 pt-3">

          <p className={`text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>טורניר</p>

          <p className={`font-bold ${gh.arcadePanelTitle || gh.cardTitle}`}>{tournament.titleHe}</p>

          {tournament.registered ? (

            <p className="mt-1 text-xs font-semibold text-emerald-700">רשום ✓</p>

          ) : tournament.registrationOpen ? (

            <button type="button" disabled={busy} onClick={() => void registerTournament()} className={`mt-2 ${gh.btnSecondary}`}>

              הרשמה

            </button>

          ) : (

            <p className={`mt-1 text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>ההרשמה סגורה</p>

          )}

        </div>

      ) : null}

      {message ? <p className={`text-sm ${gh.userMessage}`}>{message}</p> : null}

    </div>

  );

}

