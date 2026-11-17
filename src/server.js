import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.port, () => console.log(`WS Portal API listening on :${env.port}`));

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
