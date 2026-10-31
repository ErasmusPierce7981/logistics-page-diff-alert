import { InfraiClient } from "./infrai_client.ts";
import { WatchRequest, decideChange, diffText, type ExceptionCase, type ProofOfDelivery, type ShipmentEvent } from "./monitor.ts";

export async function watchShipment(raw: unknown, client: InfraiClient): Promise<{ event: ShipmentEvent; exception: ExceptionCase; proof: ProofOfDelivery; messageId?: string }> {
  const request = WatchRequest.parse(raw);
  const page = await client.scrape(request.trackingUrl);
  const state = decideChange({ previousBody: request.previousBody, currentBody: page.content });
  const event: ShipmentEvent = { shipmentId: request.shipmentId, state, observedAt: new Date().toISOString(), diff: diffText(request.previousBody, page.content) };
  const exception: ExceptionCase = { shipmentId: request.shipmentId, reason: state === "changed" ? "page_changed" : "no_change", action: state === "changed" ? "alert" : "record" };
  const proof: ProofOfDelivery = { shipmentId: request.shipmentId, files: [] };
  if (state === "unchanged") return { event, exception, proof };
  const sent = await client.sendAlert(request.recipient, `Shipment ${request.shipmentId} changed`, event.diff);
  return { event, exception, proof, messageId: sent.message_id };
}

if (process.argv[1]?.endsWith("watch.ts")) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const input = { shipmentId: process.env.SHIPMENT_ID ?? "demo-shipment", trackingUrl: process.env.TRACKING_URL ?? "https://example.com/track", recipient: process.env.ALERT_TO ?? "ops@example.com", previousBody: process.env.PREVIOUS_BODY ?? "" };
  const result = await watchShipment(input, new InfraiClient(key));
  console.log(JSON.stringify(result, null, 2));
}
