import {
  ARCADE_ROOM_FORBIDDEN_MESSAGE,
  ARCADE_ROOM_INACTIVE_MESSAGE,
  clearArcadeActiveRoom,
} from "../../lib/arcade/client/arcadeRoomLifecycle.client.js";

/**
 * @param {{ code?: string, httpStatus?: number, error?: string }} bundle
 */
export function isArcadeRoomAccessDenied(bundle) {
  return bundle.httpStatus === 403 || bundle.code === "forbidden";
}

/**
 * Handle snapshot poll failure — sets user message and marks access lost when polling stops.
 *
 * @param {{ code?: string, httpStatus?: number, error?: string }} b
 * @param {{ ok: boolean, stopped: boolean, bundleLoadedOnceRef: { current: boolean } }} ctx
 * @param {(msg: string) => void} setBundleError
 * @param {(lost: boolean) => void} setRoomAccessLost
 * @param {string|null|undefined} roomId
 * @returns {boolean} true when caller should skip further bundle handling
 */
export function handleArcadePollBundleFailure(b, ctx, setBundleError, setRoomAccessLost, roomId) {
  if (ctx.ok) return false;

  if (ctx.stopped || isArcadeRoomAccessDenied(b)) {
    clearArcadeActiveRoom(roomId);
    setRoomAccessLost(true);
    setBundleError(
      ctx.bundleLoadedOnceRef.current
        ? ARCADE_ROOM_INACTIVE_MESSAGE
        : isArcadeRoomAccessDenied(b)
          ? ARCADE_ROOM_FORBIDDEN_MESSAGE
          : b.error || b.code || "טעינת החדר נכשלה",
    );
    return true;
  }

  if (!ctx.bundleLoadedOnceRef.current) {
    const msg = isArcadeRoomAccessDenied(b)
      ? ARCADE_ROOM_FORBIDDEN_MESSAGE
      : b.error || b.code || "טעינת החדר נכשלה";
    setBundleError(msg);
  }
  return true;
}
