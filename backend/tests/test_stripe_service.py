from app.services.stripe_service import calculate_fee

def test_transactional_fee_keeps_full_tip_for_connected_account():
    fee = calculate_fee(3.00, 0.0, 20)
    assert fee.tip_cents == 300
    assert fee.propi_fee_cents == 20
    assert fee.customer_total_cents == 320
    assert fee.connected_account_payout_cents == 300

def test_percentage_fee_is_added_to_customer_total():
    fee = calculate_fee(2.50, 1.5, 20)
    assert fee.percentage_fee_cents == 4
    assert fee.customer_total_cents == 274
    assert fee.connected_account_payout_cents == 250
