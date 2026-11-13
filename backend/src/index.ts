import app from './app';
import { assertSafeStripeKey } from './services/payments';
import { graniteConfigured } from './services/granite';

assertSafeStripeKey();

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`SupplyMash API running on http://localhost:${PORT}`);
  console.log(`  watsonx.ai Granite: ${graniteConfigured() ? 'configured' : 'not configured (fallback parser/templates)'}`);
  console.log(`  Stripe: ${process.env.STRIPE_SECRET_KEY ? 'test mode' : 'not configured (mock charges)'}`);
});
