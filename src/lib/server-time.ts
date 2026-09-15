import { database } from "./firebase";
import { ref, onValue } from "firebase/database";

/**
 * Real (server) time helper.
 *
 * Device clocks are often wrong, so subscription expiry and "new content"
 * checks must not trust `Date.now()`. Firebase publishes the difference
 * between the server clock and this device at `.info/serverTimeOffset`;
 * we keep that offset live and apply it everywhere time matters.
 */
let offsetMs = 0;
let started = false;

function start() {
  if (started) return;
  started = true;
  try {
    onValue(ref(database, ".info/serverTimeOffset"), (snap) => {
      const val = Number(snap.val());
      if (Number.isFinite(val)) offsetMs = val;
    });
  } catch (e) {
    console.error("Could not sync with server time:", e);
  }
}

start();

/** Current real time in milliseconds, corrected for a wrong device clock. */
export function serverNow(): number {
  start();
  return Date.now() + offsetMs;
}

/** Current real time as a Date. */
export function serverDate(): Date {
  return new Date(serverNow());
}

/** Current real time as an ISO string — use for every timestamp written to the database. */
export function serverIso(): string {
  return serverDate().toISOString();
}

/** How far this device's clock is from real time, in milliseconds. */
export function serverClockOffset(): number {
  return offsetMs;
}
