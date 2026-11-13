/**
 * Payments (spec §8D). Stripe TEST mode via its REST API, or a mock.
 *
 * - No STRIPE_SECRET_KEY: every charge is `mock_succeeded`.
 * - A key that is not `sk_test_…`: refuse to start (assertSafeStripeKey).
 * - Card decline (Stripe card_error): `failed`.
 * - Any other Stripe/network/config error: `mock_succeeded`, logged, never thrown.
 */
import { Business } from '../types';

const STRIPE_API = 'https://api.stripe.com/v1';
const TEST_CARD_PM = 'pm_card_visa';

export interface ChargeResult {
  status: 'succeeded' | 'mock_succeeded' | 'failed';
  paymentIntentId?: string;
}

/** businessId → Stripe customer + attached test payment method. Survives demo resets. */
const customers = new Map<string, { customer: string; paymentMethod: string }>();

/** Test hooks. */
export function resetPaymentsCache(): void {
  customers.clear();
}

function stripeKey(): string {
  return process.env.STRIPE_SECRET_KEY ?? '';
}

export function assertSafeStripeKey(): void {
  const key = stripeKey();
  if (key && !key.startsWith('sk_test_')) {
    throw new Error('STRIPE_SECRET_KEY must be a Stripe TEST key (sk_test_…). Refusing to start.');
  }
}

class CardDeclined extends Error {
  constructor(message: string, readonly paymentIntentId?: string) {
    super(message);
  }
}

async function stripePost(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stripeKey()}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json()) as Record<string, unknown> & {
    error?: { type?: string; message?: string; payment_intent?: { id?: string } };
  };
  if (!res.ok) {
    if (body.error?.type === 'card_error') throw new CardDeclined(body.error.message ?? 'card declined', body.error.payment_intent?.id);
    throw new Error(`Stripe ${path} HTTP ${res.status}: ${body.error?.message ?? 'unknown error'}`);
  }
  return body;
}

async function ensureCustomer(business: Business): Promise<{ customer: string; paymentMethod: string }> {
  const cached = customers.get(business.id);
  if (cached) return cached;
  const customer = await stripePost('/customers', { name: business.name, 'metadata[businessId]': business.id });
  const pm = await stripePost(`/payment_methods/${TEST_CARD_PM}/attach`, { customer: String(customer.id) });
  const entry = { customer: String(customer.id), paymentMethod: String(pm.id) };
  customers.set(business.id, entry);
  business.stripeCustomerId = entry.customer;
  return entry;
}

export async function charge(business: Business, amountDollars: number, description: string): Promise<ChargeResult> {
  const cents = Math.round(amountDollars * 100);
  if (!stripeKey()) return { status: 'mock_succeeded', paymentIntentId: `pi_mock_${business.id}_${Date.now()}` };
  try {
    const { customer, paymentMethod } = await ensureCustomer(business);
    const pi = await stripePost('/payment_intents', {
      amount: String(cents),
      currency: 'usd',
      customer,
      payment_method: paymentMethod,
      off_session: 'true',
      confirm: 'true',
      description,
    });
    return pi.status === 'succeeded'
      ? { status: 'succeeded', paymentIntentId: String(pi.id) }
      : { status: 'failed', paymentIntentId: String(pi.id) };
  } catch (err) {
    if (err instanceof CardDeclined) {
      console.warn(`[payments] card declined for ${business.name}: ${err.message}`);
      return { status: 'failed', paymentIntentId: err.paymentIntentId };
    }
    console.warn(`[payments] Stripe unavailable, mocking charge for ${business.name}: ${(err as Error).message}`);
    return { status: 'mock_succeeded', paymentIntentId: `pi_mock_${business.id}_${Date.now()}` };
  }
}
