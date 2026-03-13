import Stripe from 'stripe';

// Lazy-init to avoid crash when STRIPE_SECRET_KEY is not set (e.g., during build)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }
  return _stripe;
}

// Backwards-compat: export as `stripe` (will be null if key not set at import time)
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16', typescript: true })
  : (null as unknown as Stripe);
