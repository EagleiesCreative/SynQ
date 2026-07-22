
/**
 * Thin client for AiSensy's API-campaign endpoint.
 *
 * AiSensy doesn't take free-form message text — you pre-approve a WhatsApp
 * template, wire it to a campaign, set that campaign Live, then trigger it
 * by name with an ordered list of template parameters.
 *
 * Docs: https://wiki.aisensy.com/en/articles/11501889-api-reference-docs
 */

const AISENSY_ENDPOINT =
  process.env.AISENSY_API_URL || "https://backend.aisensy.com/campaign/t1/api/v2";

export type NotificationKind = "joined" | "almost_up" | "called";

/** The key is server-side config, never per-tenant data. */
export function getAisensyApiKey(): string | null {
  return process.env.AISENSY_API_KEY?.trim() || null;
}

export interface AisensyPayload {
  campaignName: string;
  /** Phone in international format, digits only, no leading +. */
  destination: string;
  userName: string;
  templateParams: string[];
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Normalises a phone number to what AiSensy expects: digits only, country
 * code included. Indonesian local formats (08xx…) are the common case here,
 * so they're promoted to 62 unless another country code is already present.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;

  digits = digits.replace(/\D/g, "");
  // Shortest plausible international number is ~8 digits after the code.
  return digits.length >= 8 ? digits : null;
}

export async function sendAisensyCampaign(
  payload: AisensyPayload
): Promise<SendResult> {
  const apiKey = getAisensyApiKey();
  if (!apiKey) {
    return { ok: false, error: "AISENSY_API_KEY is not set on the server." };
  }

  try {
    const res = await fetch(AISENSY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, apiKey, source: "SynQ" }),
      // Never let a slow provider hold up calling the next number.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `AiSensy responded ${res.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to reach AiSensy.",
    };
  }
}
