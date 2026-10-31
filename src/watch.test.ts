import assert from "node:assert/strict";
import { watchShipment } from "./watch.ts";

const client = {
  scrape: async () => ({ content: "Delivered at dock 4" }),
  sendAlert: async () => ({ message_id: "message-1" })
} as never;

const result = await watchShipment({ shipmentId: "S-42", trackingUrl: "https://carrier.example/S-42", recipient: "ops@example.com", previousBody: "In transit" }, client);
assert.equal(result.event.state, "changed");
assert.equal(result.exception.action, "alert");
assert.equal(result.messageId, "message-1");
console.log("change decision: alert sent");
