import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma, { pool } from './prisma.js';
import authRoutes from './routes/authRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import marketplaceRoutes from './routes/listingRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import preferenceRoutes from './routes/preferenceRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import moderationRoutes from './routes/moderationRoutes.js';
import escrowRoutes from './routes/escrowRoutes.js';
import bulkRoutes from './routes/bulkRoutes.js';
import { createServer } from 'http';
import { initializeSocket } from './socket.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = initializeSocket(httpServer);
const PORT = process.env.PORT || 3001;

// Load and configure Swagger UI
const specPath = path.join(__dirname, '../ecommerce-backend-spec.json');
const swaggerDocument = JSON.parse(fs.readFileSync(specPath, 'utf8'));

// Dynamically update server URL based on environment
const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}/api`;
swaggerDocument.servers = [{ url: serverUrl, description: 'Current Environment' }];

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/listings', marketplaceRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin/listings', moderationRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api', reviewRoutes); // Review routes handle their own prefix patterns in tests

app.get('/api/health', async (req, res) => {
  try {
    // Check DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});




if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export { app, httpServer, io };
export default app;
