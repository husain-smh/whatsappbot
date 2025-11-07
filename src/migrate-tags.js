/**
 * Migration script to generate tags for existing items
 * Run this once to add tags to items that were created before the tag feature
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { getItemsWithoutTags, updateItemTags, closeDatabase } from './database.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TAG_GENERATION_PROMPT = `You are a tag generator for tasks and ideas.

Given a task or idea content, generate 5-10 searchable tags that describe it semantically.

Tags should include:
- Main topic/subject (e.g., "books", "fitness", "meetings")
- Specific entities mentioned (e.g., "atomic-habits", "client-presentation")
- Related concepts (e.g., for "Read Atomic Habits" → ["books", "reading", "habits", "productivity", "self-improvement", "atomic-habits"])
- Action verbs if applicable (e.g., "read", "buy", "schedule", "call")
- Make tags lowercase and hyphenated for multi-word tags

Return ONLY a JSON array of tags, nothing else.

Example inputs and outputs:
Input: "Read Atomic Habits and Deep Work"
Output: ["books", "reading", "atomic-habits", "deep-work", "productivity", "self-improvement", "habits"]

Input: "Schedule meeting with client about Q4 presentation"
Output: ["meeting", "client", "schedule", "presentation", "q4", "business", "work"]

Input: "Buy groceries - milk, eggs, bread"
Output: ["groceries", "shopping", "food", "milk", "eggs", "bread", "errands"]`;

/**
 * Generate tags for a batch of items
 */
async function generateTagsForItems(items) {
  const results = [];
  
  for (const item of items) {
    try {
      console.log(`Processing item ${item.id}: ${item.content.substring(0, 50)}...`);
      
      // Skip malformed items (likely bot responses)
      if (item.content.includes('📋 *') || item.content.includes('🟡 *') || item.content.length > 500) {
        console.log(`⚠️  Skipping malformed item ${item.id} (likely a bot response)`);
        // Set generic tags for these
        updateItemTags(item.id, ['misc', 'review-needed']);
        results.push({ id: item.id, tags: ['misc', 'review-needed'], success: true, skipped: true });
        continue;
      }
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: TAG_GENERATION_PROMPT },
          { role: 'user', content: `Type: ${item.type}\nContent: ${item.content}` }
        ],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      const tags = result.tags || result.keywords || [];
      
      if (tags && tags.length > 0) {
        updateItemTags(item.id, tags);
        console.log(`✓ Generated ${tags.length} tags: ${tags.join(', ')}`);
        results.push({ id: item.id, tags, success: true });
      } else {
        console.log(`⚠️  No tags generated for item ${item.id}, using fallback`);
        // Fallback: extract simple keywords
        const words = item.content.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5);
        updateItemTags(item.id, words);
        results.push({ id: item.id, tags: words, success: true });
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing item ${item.id}:`, error.message);
      // On error, set basic tags so it can be found
      try {
        updateItemTags(item.id, ['error', 'needs-review']);
      } catch (updateError) {
        // Ignore update errors
      }
      results.push({ id: item.id, error: error.message, success: false });
    }
  }
  
  return results;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🔄 Starting tag migration...\n');
  
  // Get all items without tags
  const itemsWithoutTags = getItemsWithoutTags();
  console.log(`Found ${itemsWithoutTags.length} items without tags\n`);
  
  if (itemsWithoutTags.length === 0) {
    console.log('✓ All items already have tags!');
    closeDatabase();
    return;
  }
  
  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 10;
  const batches = [];
  
  for (let i = 0; i < itemsWithoutTags.length; i += BATCH_SIZE) {
    batches.push(itemsWithoutTags.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`Processing ${batches.length} batches of ${BATCH_SIZE} items each...\n`);
  
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (let i = 0; i < batches.length; i++) {
    console.log(`\n📦 Batch ${i + 1}/${batches.length}`);
    const results = await generateTagsForItems(batches[i]);
    
    const batchSuccess = results.filter(r => r.success).length;
    const batchFailed = results.filter(r => !r.success).length;
    
    totalSuccess += batchSuccess;
    totalFailed += batchFailed;
    
    console.log(`Batch ${i + 1} complete: ${batchSuccess} success, ${batchFailed} failed`);
    
    // Longer delay between batches
    if (i < batches.length - 1) {
      console.log('Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✓ Migration complete!');
  console.log(`   Total items processed: ${itemsWithoutTags.length}`);
  console.log(`   ✓ Success: ${totalSuccess}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  closeDatabase();
}

// Run migration
migrate().catch(error => {
  console.error('❌ Migration failed:', error);
  closeDatabase();
  process.exit(1);
});

