// QuickBooks Online OAuth2 + API helpers.
// Env: QBO_CLIENT_ID, QBO_CLIENT_SECRET, optional QBO_ENV=sandbox|production.

const AUTH_BASE = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export function qboConfigured() {
  return Boolean(clientId() && clientSecret());
}
export const clientId = () =>
  process.env.QBO_CLIENT_ID || process.env.qbo_client_id;
export const clientSecret = () =>
  process.env.QBO_CLIENT_SECRET || process.env.qbo_client_secret;

export const REDIRECT_URI =
  "https://www.fieldstacksolutions.com/api/quickbooks/callback";

export function apiBase() {
  return (process.env.QBO_ENV || "production") === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

export function authorizeUrl(state: string) {
  const p = new URLSearchParams({
    client_id: clientId()!,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: REDIRECT_URI,
    state,
  });
  return `${AUTH_BASE}?${p}`;
}

function basicAuth() {
  return "Basic " + Buffer.from(`${clientId()}:${clientSecret()}`).toString("base64");
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export async function refreshTokens(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export async function qboRequest(
  realmId: string,
  accessToken: string,
  path: string,
  init?: RequestInit
) {
  const res = await fetch(
    `${apiBase()}/v3/company/${realmId}${path}${path.includes("?") ? "&" : "?"}minorversion=73`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(
      `QBO ${path} failed: ${res.status} ${JSON.stringify(body).slice(0, 300)}`
    );
  return body;
}
