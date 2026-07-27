# Charter operations and derby

The revenue lives here. The sport angler is the acquisition channel.

## Charter

Once you are in a charter's daily workflow, the adjacent jobs are obvious and unserved.

**Multi-boat and crew.** Org owns boats; boats have assigned crew; a deckhand logs on the
boat's device without access to org billing. Role model: `owner`, `captain`, `crew`,
`viewer`.

**Guest catch reports.** At trip close, generate a shareable page per guest: their fish,
photos, conditions, the boat and captain. Emailed automatically. This is the marketing
asset the operator currently makes by hand or not at all, and it is the feature that sells
the product in a demo.

**The processor handoff.** This is the actually painful problem in Ketchikan. A guest's
fish goes boat → processor → box in Ohio, and it currently runs on handwritten tags and
phone calls. Model it properly:

```
Catch -> FishTag (unique, QR/label printable at the dock)
      -> ProcessingManifest (boat, date, processor, guest, species, count, weight)
      -> ShippingRecord (carrier, tracking, destination, guest contact)
```

Give the guest a status page from their tag. Give the operator a manifest the processor
will actually accept. Solve this and the product stops being a fishing app and becomes the
operating system for the fleet.

**Also needed, in rough order:** bookings and deposits via Stripe, waivers with signature
capture, crew scheduling, weather cancellation handling with a rebooking flow.

## Pricing

Per-boat per-month, seasonal billing acknowledged in the plan structure — a Ketchikan
operator will not pay a flat monthly for a boat that is on the hard from October to April.
Offer a season pass. $50–150/boat/month is defensible; $5/month consumer is a grind.

## Derby

Local derbies run on paper and spreadsheets in most towns. Stripe is already wired.

- Public `/derbies/:slug` leaderboard, no login to view
- Registration with Stripe checkout, ticket issuance, waiver
- Weigh-in stations: an operator role that records entries against a registered ticket,
  offline-capable because the weigh station is often on a dock
- Prize verification: entry photos, weight, witness, and an audit log. Derbies get
  disputed and the audit trail is the product
- Rules engine per derby: eligible species, size, dates, and whether the app's own catch
  log counts as an entry (usually it must not — official weigh-in only)

Build for Ketchikan first, then sell to every chamber of commerce and fishing club running
a derby anywhere. Extremely seasonal, low support burden, and a natural entry point to the
same customers as the charter product.
