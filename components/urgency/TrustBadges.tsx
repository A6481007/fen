export function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center gap-4 py-4 border-t border-b text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="text-green-600">✓</span>
        <span>Free Returns</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-600">✓</span>
        <span>Secure Checkout</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-600">✓</span>
        <span>Fast Shipping</span>
      </div>
    </div>
  );
}
