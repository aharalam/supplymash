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

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/businesses', businessRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/order-pools', orderPoolRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/matches', matchRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`SupplyMash API running on http://localhost:${PORT}`);
});

export default app;
