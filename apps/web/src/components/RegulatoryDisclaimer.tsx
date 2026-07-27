/**
 * Required on any UI that touches seasons, limits, harvest, or closures.
 * docs/30-domain-safety.mdc — no exceptions.
 */
export function RegulatoryDisclaimer() {
  return (
    <p
      className="font-ui text-xs text-hairline/70"
      data-testid="regulatory-disclaimer"
      role="note"
    >
      Regulations are advisory. Verify current ADF&amp;G rules before you fish or
      retain fish. This app does not submit harvest reports for you.
    </p>
  );
}
