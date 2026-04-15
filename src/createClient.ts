import { Leap0Client } from "leap0";
import type { Leap0Config } from "leap0";

/**
 * Creates a Leap0 SDK client. When `config` is empty, uses environment variables
 * (`LEAP0_API_KEY`, optional `LEAP0_BASE_URL`, `LEAP0_SANDBOX_DOMAIN`, etc.).
 *
 * @throws If required configuration is missing or invalid (see `leap0` `Leap0Error`).
 */
export function createLeap0Client(config: Leap0Config = {}): Leap0Client {
  return new Leap0Client(config);
}
