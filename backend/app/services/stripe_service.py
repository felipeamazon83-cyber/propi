"""Stripe payment calculations for Propi's transactional pricing."""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

@dataclass(frozen=True)
class FeeBreakdown:
    tip_cents: int
    fixed_fee_cents: int
    percentage_fee_cents: int

    @property
    def propi_fee_cents(self) -> int:
        return self.fixed_fee_cents + self.percentage_fee_cents

    @property
    def customer_total_cents(self) -> int:
        return self.tip_cents + self.propi_fee_cents

    @property
    def connected_account_payout_cents(self) -> int:
        """The recipient always receives the selected tip in full."""
        return self.tip_cents

def calculate_fee(tip_amount: float, fee_percent: float, fixed_fee_cents: int) -> FeeBreakdown:
    tip_cents = int((Decimal(str(tip_amount)) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    percentage = int((Decimal(tip_cents) * Decimal(str(fee_percent)) / 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    return FeeBreakdown(tip_cents=tip_cents, fixed_fee_cents=fixed_fee_cents, percentage_fee_cents=percentage)
