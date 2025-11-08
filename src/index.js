import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './database.js';
import { startServer } from './server.js';

// Load environment variables from .env file (for local development)
// On Railway/production, variables are injected directly
dotenv.config();

// Debug: Log available environment variables (without exposing values)
console.log('🔍 Checking environment variables...');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Found' : '❌ Missing');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✓ Found' : '❌ Missing');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✓ Found' : '❌ Missing');
console.log('MY_WHATSAPP_NUMBER:', process.env.MY_WHATSAPP_NUMBER ? '✓ Found' : '❌ Missing');
console.log('');

// Check required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY not found');
  console.error('Please set environment variable:');
  console.error('  - Locally: Add to .env file');
  console.error('  - Railway: Add in Variables tab');
  console.error('OPENAI_API_KEY=your_key_here');
  process.exit(1);
}

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error('❌ Error: Twilio credentials not found');
  console.error('Please set environment variables:');
  console.error('  - Locally: Add to .env file');
  console.error('  - Railway: Add in Variables tab');
  console.error('TWILIO_ACCOUNT_SID=your_account_sid');
  console.error('TWILIO_AUTH_TOKEN=your_auth_token');
  console.error('TWILIO_WHATSAPP_FROM=whatsapp:+14155238886');
  console.error('MY_WHATSAPP_NUMBER=whatsapp:+your_number');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

/**
 * Main application startup
 */
async function main() {
  console.log('🚀 Starting WhatsApp Task Bot (Twilio Edition)...\n');

  try {
    // Initialize database
    console.log('📦 Setting up database...');
    initializeDatabase();

    // Start web server (includes webhook endpoint)
    console.log('🌐 Starting web server...');
    await startServer(PORT);

    console.log('\n✅ All systems ready!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 Send messages to: ' + process.env.TWILIO_WHATSAPP_FROM);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log('💬 Message your Twilio number to start tracking!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Configure Twilio webhook to point to your server:');
    console.log('   If running locally: Use ngrok or similar to expose webhook');
    console.log('   If deployed: Use your public URL + /webhook/whatsapp\n');

  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal) {
  console.log(`\n\n🛑 Received ${signal}, shutting down gracefully...`);

  try {
    closeDatabase();
    console.log('✓ Cleanup complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// Start the application
main();

