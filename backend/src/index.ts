import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import businessRoutes from './routes/businesses';
import listingRoutes from './routes/listings';
import orderPoolRoutes from './routes/orderPools';
import warehouseRoutes from './routes/warehouses';
import matchRoutes from './routes/matches';
import supplierRoutes from './routes/suppliers';
import orderRoutes from './routes/orders';
import poolRoutes from './routes/pools';
import scrapOfferRoutes from './routes/scrapOffers';
import metricsRoutes from './routes/metrics';
import demoRoutes from './routes/demo';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

// Existing routes (unchanged)
app.use('/api/businesses', businessRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/order-pools', orderPoolRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/matches', matchRoutes);

// New order-first routes (§9)
app.use('/api/suppliers', supplierRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pools', poolRoutes);
app.use('/api/scrap-offers', scrapOfferRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/demo', demoRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`SupplyMash API running on http://localhost:${PORT}`);
});

export default app;
