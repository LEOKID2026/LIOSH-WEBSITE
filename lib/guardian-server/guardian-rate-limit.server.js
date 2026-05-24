import { consumeRateLimit } from "../security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../security/production-guard.js";

/**
 * Guardian login rate limits (production only).
 * @param {{ ip: string, usernameNormalized: string|null }}
 */
export function consumeGuardianLoginRateLimit({ ip, usernameNormalized }) {
  if (!isProductionRuntime()) {
    return { allowed: true };
  }

  const keys = [`ip:${ip}`];
  if (usernameNormalized) {
    keys.push(`user:${usernameNormalized}`);
  }

  const ipLimit = consumeRateLimit({
    namespace: "guardian_login_ip",
    keys: [`ip:${ip}`],
    maxAttempts: 5,
    windowMs: 60_000,
  });
  if (!ipLimit.allowed) return ipLimit;

  const ipHour = consumeRateLimit({
    namespace: "guardian_login_ip_hour",
    keys: [`ip:${ip}`],
    maxAttempts: 20,
    windowMs: 3_600_000,
  });
  if (!ipHour.allowed) return ipHour;

  if (usernameNormalized) {
    const userLimit = consumeRateLimit({
      namespace: "guardian_login_user",
      keys: [`user:${usernameNormalized}`],
      maxAttempts: 5,
      windowMs: 60_000,
    });
    if (!userLimit.allowed) return userLimit;

    const userHour = consumeRateLimit({
      namespace: "guardian_login_user_hour",
      keys: [`user:${usernameNormalized}`],
      maxAttempts: 15,
      windowMs: 3_600_000,
    });
    if (!userHour.allowed) return userHour;
  }

  return { allowed: true };
}
