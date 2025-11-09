import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'wabot';

let client;
let db;
let usersCollection;
let itemsCollection;
let categoriesCollection;

/**
 * Connect to MongoDB with retry logic
 */
async function connectDatabase() {
  if (db) {
    return db; // Already connected
  }

  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📦 Connecting to MongoDB (attempt ${attempt}/${maxRetries})...`);
      console.log(`   URI: ${MONGODB_URI.substring(0, 30)}...`);
      console.log(`   Database: ${DB_NAME}`);
      
      client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        retryWrites: true,
        maxPoolSize: 10,
      });
      
      await client.connect();
      
      // Setup connection error handlers
      client.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
        db = null; // Reset connection so it will reconnect on next request
      });
      
      client.on('close', () => {
        console.log('⚠️  MongoDB connection closed');
        db = null; // Reset connection
      });
      
      db = client.db(DB_NAME);
      
      usersCollection = db.collection('users');
      itemsCollection = db.collection('items');
      categoriesCollection = db.collection('categories');
      
      console.log(`✅ Connected to MongoDB: ${DB_NAME}`);
      
      // Create indexes
      await createIndexes();
      
      return db;
    } catch (error) {
      lastError = error;
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff: 1s, 2s
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('❌ Failed to connect to MongoDB after all retries');
  throw lastError;
}

/**
 * Create database indexes for performance
 */
async function createIndexes() {
  try {
    // Users indexes
    await usersCollection.createIndex({ phone_number: 1 }, { unique: true });
    await usersCollection.createIndex({ status: 1 });
    
    // Items indexes
    await itemsCollection.createIndex({ user_phone: 1 });
    await itemsCollection.createIndex({ user_phone: 1, status: 1 });
    await itemsCollection.createIndex({ user_phone: 1, type: 1 });
    await itemsCollection.createIndex({ created_at: -1 });
    
    // Text search index for full-text search
    await itemsCollection.createIndex({ content: 'text', tags: 'text' });
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('⚠️  Index creation warning:', error.message);
  }
}

/**
 * Password hashing utilities
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

/**
 * Generate secure random password
 */
export function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  
  return password;
}

/**
 * Initialize database (create collections if they don't exist)
 */
export async function initializeDatabase() {
  await connectDatabase();
  console.log('✅ Database initialized');
}

/**
 * Get user by phone number
 */
export async function getUserByPhone(phone_number) {
  return await usersCollection.findOne({ phone_number });
}

/**
 * Get all users (for debugging)
 */
export async function getAllUsers() {
  return await usersCollection.find({}).toArray();
}

/**
 * Authenticate user (for dashboard login)
 */
export async function authenticateUser(phone_number, password) {
  console.log(`🔐 [AUTH] Attempting authentication for: ${phone_number}`);
  
  const user = await getUserByPhone(phone_number);
  
  if (!user) {
    console.log(`❌ [AUTH] User not found: ${phone_number}`);
    return null;
  }
  
  console.log(`✓ [AUTH] User found: ${user.name}`);
  
  if (user.status !== 'active') {
    console.log(`❌ [AUTH] User ${phone_number} is inactive`);
    return null;
  }
  
  console.log(`🔐 [AUTH] Verifying password...`);
  console.log(`   Password length: ${password.length}`);
  console.log(`   Hash format: ${user.password_hash.substring(0, 20)}...`);
  
  const isValid = verifyPassword(password, user.password_hash);
  
  console.log(`🔐 [AUTH] Password valid: ${isValid}`);
  
  if (isValid) {
    // Update last_active timestamp
    await usersCollection.updateOne(
      { phone_number },
      { $set: { last_active: new Date() } }
    );
    console.log(`✓ [AUTH] Authentication successful for ${user.name}`);
    return {
      phone_number: user.phone_number,
      name: user.name,
      status: user.status
    };
  }
  
  console.log(`❌ [AUTH] Password verification failed`);
  return null;
}

/**
 * Authenticate by password only (for single-user convenience)
 */
export async function authenticateByPassword(password) {
  console.log(`🔐 [AUTH] Attempting password-only authentication`);
  
  // Get all active users
  const users = await usersCollection.find({ status: 'active' }).toArray();
  
  console.log(`   Found ${users.length} active user(s)`);
  
  // Try to authenticate with each user
  for (const user of users) {
    const isValid = verifyPassword(password, user.password_hash);
    if (isValid) {
      // Update last_active timestamp
      await usersCollection.updateOne(
        { phone_number: user.phone_number },
        { $set: { last_active: new Date() } }
      );
      console.log(`✓ [AUTH] Password-only authentication successful for ${user.name}`);
      return {
        phone_number: user.phone_number,
        name: user.name,
        status: user.status
      };
    }
  }
  
  console.log(`❌ [AUTH] Password-only authentication failed`);
  return null;
}

/**
 * Auto-register new user (called on first WhatsApp message)
 */
export async function autoRegisterUser(phone_number) {
  // Extract name from phone number
  const name = `User ${phone_number.replace('whatsapp:', '')}`;
  
  // Generate secure random password
  const password = generatePassword(12);
  const password_hash = hashPassword(password);
  
  try {
    await usersCollection.insertOne({
      phone_number,
      name,
      password_hash,
      status: 'active',
      created_at: new Date(),
      last_active: new Date()
    });
    
    console.log(`✓ Auto-registered new user: ${name} (${phone_number})`);
    
    // Return user info with plain password (only time it's visible)
    return {
      phone_number,
      name,
      password,  // Plain text - will be sent to user via WhatsApp
      isNewUser: true
    };
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      console.log(`User ${phone_number} already exists`);
      return null;
    }
    throw error;
  }
}

/**
 * Create user manually (for admin use)
 */
export async function createUser(phone_number, name, password) {
  const password_hash = hashPassword(password);
  
  try {
    await usersCollection.insertOne({
      phone_number,
      name,
      password_hash,
      status: 'active',
      created_at: new Date(),
      last_active: new Date()
    });
    
    console.log(`Created user: ${name} (${phone_number})`);
    return { phone_number, name };
  } catch (error) {
    if (error.code === 11000) {
      // Update existing user
      await usersCollection.updateOne(
        { phone_number },
        { $set: { name, password_hash, last_active: new Date() } }
      );
      console.log(`Updated user: ${name} (${phone_number})`);
      return { phone_number, name };
    }
    throw error;
  }
}

/**
 * Save a new item (task or idea) with input validation
 */
export async function saveItem({ user_phone, type, content, priority, category, deadline, context, tags }) {
  // Validate required fields
  if (!user_phone || typeof user_phone !== 'string') {
    throw new Error('user_phone is required and must be a string');
  }
  
  if (!type || !['task', 'idea'].includes(type)) {
    throw new Error('type must be either "task" or "idea"');
  }
  
  if (!content || typeof content !== 'string') {
    throw new Error('content is required and must be a string');
  }
  
  // Validate optional fields
  if (priority && !['high', 'medium', 'low'].includes(priority)) {
    throw new Error('priority must be "high", "medium", or "low"');
  }
  
  // Sanitize and limit content length
  const sanitizedContent = content.trim().substring(0, 2000);
  
  if (sanitizedContent.length === 0) {
    throw new Error('content cannot be empty');
  }
  
  // Process tags: convert to array if needed
  let processedTags = [];
  if (tags) {
    if (Array.isArray(tags)) {
      processedTags = tags.map(tag => String(tag).trim().toLowerCase()).filter(tag => tag.length > 0);
    } else if (typeof tags === 'string') {
      processedTags = tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    }
  }
  
  const item = {
    user_phone,
    type,
    content: sanitizedContent,
    priority: priority || null,
    category: category ? String(category).trim() : null,
    deadline: deadline || null,
    context: context || null,
    tags: processedTags,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date()
  };
  
  const result = await itemsCollection.insertOne(item);
  
  console.log(`✓ Saved ${type}: ${sanitizedContent.substring(0, 50)}...`);
  if (processedTags.length > 0) console.log(`  Tags: ${processedTags.join(', ')}`);
  
  return {
    id: result.insertedId.toString(),
    ...item
  };
}

/**
 * Get items with optional filters
 */
export async function getItems(user_phone, filters = {}) {
  const query = { user_phone };
  
  // Apply filters
  if (filters.type) query.type = filters.type;
  if (filters.priority) query.priority = filters.priority;
  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  
  // Text search
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  const limit = filters.limit || 1000;
  
  const items = await itemsCollection
    .find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
  
  return items.map(item => ({
    id: item._id.toString(),
    user_phone: item.user_phone,
    type: item.type,
    content: item.content,
    priority: item.priority,
    category: item.category,
    deadline: item.deadline,
    context: item.context,
    tags: item.tags,
    status: item.status,
    created_at: item.created_at,
    updated_at: item.updated_at
  }));
}

/**
 * Get item by ID
 */
export async function getItemById(id, user_phone) {
  const item = await itemsCollection.findOne({
    _id: new ObjectId(id),
    user_phone
  });
  
  if (!item) return null;
  
  return {
    id: item._id.toString(),
    ...item
  };
}

/**
 * Update item status
 */
export async function updateItemStatus(id, status, user_phone) {
  const result = await itemsCollection.updateOne(
    { _id: new ObjectId(id), user_phone },
    { $set: { status, updated_at: new Date() } }
  );
  
  return result.modifiedCount > 0;
}

/**
 * Delete item
 */
export async function deleteItem(id, user_phone) {
  const result = await itemsCollection.deleteOne({
    _id: new ObjectId(id),
    user_phone
  });
  
  return result.deletedCount > 0;
}

/**
 * Get all categories
 */
export async function getCategories() {
  return await categoriesCollection.find({}).toArray();
}

/**
 * Create category
 */
export async function createCategory(name, parentId = null) {
  const category = {
    name,
    parent_id: parentId,
    created_at: new Date()
  };
  
  const result = await categoriesCollection.insertOne(category);
  return { id: result.insertedId.toString(), ...category };
}

/**
 * Get statistics for a user
 */
export async function getStats(user_phone) {
  const stats = {};
  
  // Total counts
  const total = await itemsCollection.countDocuments({ user_phone });
  const tasks = await itemsCollection.countDocuments({ user_phone, type: 'task' });
  const ideas = await itemsCollection.countDocuments({ user_phone, type: 'idea' });
  
  stats.total = total;
  stats.tasks = tasks;
  stats.ideas = ideas;
  
  // Status breakdown
  stats.by_status = {
    pending: await itemsCollection.countDocuments({ user_phone, status: 'pending' }),
    completed: await itemsCollection.countDocuments({ user_phone, status: 'completed' }),
    cancelled: await itemsCollection.countDocuments({ user_phone, status: 'cancelled' })
  };
  
  // Priority breakdown (tasks only)
  stats.by_priority = {
    high: await itemsCollection.countDocuments({ user_phone, type: 'task', priority: 'high' }),
    medium: await itemsCollection.countDocuments({ user_phone, type: 'task', priority: 'medium' }),
    low: await itemsCollection.countDocuments({ user_phone, type: 'task', priority: 'low' })
  };
  
  // Category breakdown
  const categoryStats = await itemsCollection.aggregate([
    { $match: { user_phone } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  
  stats.by_category = categoryStats.map(c => ({ category: c._id, count: c.count }));
  
  return stats;
}

/**
 * Search by tags (optimized for array-based tags)
 */
export async function searchByTags(tagKeywords, user_phone) {
  if (!tagKeywords || tagKeywords.length === 0) {
    return [];
  }
  
  // Convert keywords to lowercase for case-insensitive matching
  const normalizedKeywords = tagKeywords.map(tag => tag.toLowerCase());
  
  // Use MongoDB's $in operator for efficient array matching
  const items = await itemsCollection
    .find({
      user_phone,
      tags: { $in: normalizedKeywords }
    })
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();
  
  return items.map(item => ({
    id: item._id.toString(),
    ...item
  }));
}

/**
 * Full-text search
 */
export async function searchFullText(searchQuery, user_phone) {
  const items = await itemsCollection
    .find({
      user_phone,
      $text: { $search: searchQuery }
    })
    .sort({ score: { $meta: 'textScore' } })
    .toArray();
  
  return items.map(item => ({
    id: item._id.toString(),
    ...item
  }));
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (client) {
    await client.close();
    console.log('Database connection closed');
  }
}

// Initialize on import
await initializeDatabase();

export { db };
export default db;

