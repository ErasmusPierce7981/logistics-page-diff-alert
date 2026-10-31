import { z } from "./zod.ts";

export const WatchRequest = z.object({
  shipmentId: z.string().min(1),
  trackingUrl: z.string().url(),
  recipient: z.string().email(),
  previousBody: z.string().default("")
});

export type WatchRequest = { shipmentId: string; trackingUrl: string; recipient: string; previousBody: string };

export type ShipmentEvent = {
  shipmentId: string;
  state: "changed" | "unchanged";
  observedAt: string;
  diff: string;
};

export type ProofOfDelivery = {
  shipmentId: string;
  files: string[];
};

export type ExceptionCase = {
  shipmentId: string;
  reason: "page_changed" | "no_change";
  action: "alert" | "record";
};

export function decideChange(input: { previousBody: string; currentBody: string }): ShipmentEvent["state"] {
  return input.previousBody === input.currentBody ? "unchanged" : "changed";
}

export function diffText(previousBody: string, currentBody: string): string {
  if (previousBody === currentBody) return "";
  return `previous=${previousBody.length} chars; current=${currentBody.length} chars`;
}
