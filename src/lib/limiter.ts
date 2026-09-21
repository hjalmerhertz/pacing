import "server-only";

/**
 * Keeps us inside Riot's rate limits.
 *
 * A free development key allows 20 requests per second AND 100 requests per
 * two minutes. Go over either and Riot starts rejecting everything for a
 * while, so instead of firing requests as fast as we can, every request asks
 * this object for permission first and waits its turn if necessary.
 */

const PER_SECOND = 20;
const PER_TWO_MINUTES = 100;

// A little headroom, because our clock and Riot's are never exactly in step.
const SAFETY_MARGIN_MS = 250;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

class RateLimiter {
  /** When each recent request was sent, oldest first. */
  private sent: number[] = [];

  /**
   * Requests queue up behind each other on this promise. Without it, ten
   * requests could all check the limit at the same moment, all see room,
   * and all go at once.
   */
  private queue: Promise<void> = Promise.resolve();

  /** Resolves once it is safe to send another request. */
  async acquire(): Promise<void> {
    const myTurn = this.queue.then(() => this.waitForRoom());
    // Swallow errors so one failure does not block everyone behind it.
    this.queue = myTurn.catch(() => {});
    return myTurn;
  }

  private async waitForRoom(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.sent = this.sent.filter((at) => now - at < 120_000);

      const lastSecond = this.sent.filter((at) => now - at < 1_000).length;
      const lastTwoMinutes = this.sent.length;

      if (lastSecond < PER_SECOND && lastTwoMinutes < PER_TWO_MINUTES) {
        this.sent.push(now);
        return;
      }

      // Work out how long until the oldest relevant request ages out.
      let waitMs = 50;
      if (lastSecond >= PER_SECOND) {
        const oldestInSecond = this.sent.find((at) => now - at < 1_000)!;
        waitMs = Math.max(waitMs, 1_000 - (now - oldestInSecond));
      }
      if (lastTwoMinutes >= PER_TWO_MINUTES) {
        waitMs = Math.max(waitMs, 120_000 - (now - this.sent[0]));
      }
      await sleep(waitMs + SAFETY_MARGIN_MS);
    }
  }

  /**
   * Called when Riot returns 429 anyway. Riot tells us how long to wait in
   * the Retry-After header; we block every queued request for that long.
   */
  async backOff(seconds: number): Promise<void> {
    const until = Date.now() + seconds * 1000;
    // Pretend we have used up the whole budget until the penalty is over.
    this.sent = new Array(PER_TWO_MINUTES).fill(until - 120_000 + 1);
    await sleep(seconds * 1000 + SAFETY_MARGIN_MS);
  }

  /** Roughly how many requests we could still make right now. */
  remainingInWindow(): number {
    const now = Date.now();
    const recent = this.sent.filter((at) => now - at < 120_000).length;
    return Math.max(PER_TWO_MINUTES - recent, 0);
  }
}

/**
 * One shared limiter for the whole server. Every Riot request goes through
 * this same object, otherwise the counting would not mean anything.
 */
export const riotLimiter = new RateLimiter();
