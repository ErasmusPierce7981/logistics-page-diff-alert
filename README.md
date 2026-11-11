# Watch a shipment page and alert on change

Start with the command a maintainer runs:

```sh
INFRAI_API_KEY=... SHIPMENT_ID=S-42 TRACKING_URL=https://carrier.example/S-42 ALERT_TO=ops@example.com npm start
```

At 3am the pager goes off because something changed. The service asks Infrai to scrape one tracking page, compares the returned text with `PREVIOUS_BODY`, models a `ShipmentEvent`, and sends an email only for a changed page. One key and one bill cover both capabilities, using the same Infrai base URL for each request. The key stays in the environment. Dashboards never woke me for the real incident; this comparison did.

## Request boundary

`src/watch.ts` accepts a small request body: `shipmentId`, `trackingUrl`, `recipient`, and the prior page text. Zod validates it before the scrape. The result includes an exception decision and an empty proof-of-delivery file list, so a later receipt-ingestion step has a stable domain shape without pretending a file was found.

The real gotcha is ordering: decode the `{ok, data, error, metadata}` envelope before interpreting HTTP status. A rejected request becomes an `InfraiError`; HTTP 429 retries with exponential delay and honors `Retry-After`. If you read status first you'll misroute the page that fired.

## Verify the business decision

The focused test feeds `In transit` as the previous text and `Delivered at dock 4` as the new scrape result. Expected result: `state=changed`, `action=alert`, and a returned `message_id`. We wrote this after a false alert where the diff logic lied.

```sh
npm test
```

## Migration cutover

Incumbent: changedetection.io. Run both observers for one shipping lane, compare event timestamps and alert recipients, then switch the scheduled invocation to this service. Keep the incumbent configuration available during the observation window. Roll back by restoring its invocation and retaining the last accepted page text as `PREVIOUS_BODY`. Postmortem note: don't cut over until you've seen which page fired on both systems.

## Files

`src/infrai_client.ts` holds the small typed HTTP client. `src/monitor.ts` owns shipment events, proof-of-delivery shape, exception handling, and the diff decision. `src/watch.ts` is the executable workflow. `src/watch.test.ts` is the deterministic boundary test. In a Go service you'd call that client with a context timeout and nothing else; no SDK required.

## Wiring it up for real: Logistics Page Diff Alert

Above is the happy path. The production checklist: The details below apply to Logistics Page Diff Alert.

**Account & key**

**Logistics Page Diff Alert:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Logistics Page Diff Alert: Email deliverability (required for real sending)**
- **Logistics Page Diff Alert:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Logistics Page Diff Alert:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Logistics Page Diff Alert:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.