import https from "node:https";

/**
 * Reads the game you are playing right now.
 *
 * While a game is running, the League client serves its own state on
 * https://127.0.0.1:2999. It is an official Riot endpoint, it needs no API
 * key, and it has no rate limit - but it only exists on the machine running
 * the game, and it uses a self-signed certificate, which is why this goes
 * through Node's https module with verification switched off rather than
 * plain fetch.
 *
 * Switching verification off is safe *here specifically*: the address is
 * hard-coded to the loopback interface, so the only thing it can ever talk
 * to is the League client on this same computer.
 */

export const dynamic = "force-dynamic";

const LIVE_URL =
  "https://127.0.0.1:2999/liveclientdata/allgamedata";

function fetchLive(): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      LIVE_URL,
      { rejectUnauthorized: false, timeout: 2000 },
      (response) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () =>
          resolve({ status: response.statusCode ?? 0, body }),
        );
      },
    );
    request.on("timeout", () => {
      request.destroy(new Error("timeout"));
    });
    request.on("error", reject);
  });
}

export async function GET() {
  try {
    const { status, body } = await fetchLive();
    if (status !== 200) {
      return Response.json({ inGame: false, reason: `status ${status}` });
    }
    return Response.json({ inGame: true, data: JSON.parse(body) });
  } catch {
    // The overwhelmingly common case: no game is running.
    return Response.json({
      inGame: false,
      reason: "No live game found on this computer.",
    });
  }
}
