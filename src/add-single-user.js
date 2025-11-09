import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createUser } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n=== Quick User Addition ===\n');

// ⚠️ EDIT THESE VALUES BEFORE RUNNING:
const USER_PHONE = 'whatsapp:+916388990545';      // Your WhatsApp number
const USER_NAME = 'Primary User';                  // Your name
const USER_PASSWORD = 'change-me-123';             // Your password

try {
  createUser(USER_PHONE, USER_NAME, USER_PASSWORD);
  console.log('✅ User created successfully!\n');
  console.log(`Phone: ${USER_PHONE}`);
  console.log(`Name: ${USER_NAME}`);
  console.log(`Password: ${USER_PASSWORD}`);
  console.log('\n🔐 You can now login to the dashboard!\n');
} catch (error) {
  if (error.message.includes('UNIQUE constraint failed')) {
    console.log('ℹ️  User already exists!\n');
    console.log(`Phone: ${USER_PHONE}`);
    console.log('\n💡 If you forgot your password, send a WhatsApp message to auto-register with a new one.\n');
  } else {
    console.error('❌ Error:', error.message);
  }
}

