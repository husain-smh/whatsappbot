import OpenAI from 'openai';
import { getItems, searchByTags, searchFullText } from './database.js';
import { analyzeQuery } from './query-router.js';

// Lazy initialization
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Handle natural language queries using GPT with smart filtering
 * SCOPED TO USER - Only searches user's own data!
 */
export async function handleNaturalQuery(query, user_phone) {
  console.log(`   💬 [NATURAL QUERY] Processing: "${query}" for user: ${user_phone}`);
  
  try {
    // STEP 1: Analyze query to extract filters and keywords
    const analysis = await analyzeQuery(query);
    console.log(`   💬 [NATURAL QUERY] Analysis complete - Type: ${analysis.searchType}`);
    
    // STEP 2: Get filtered items based on search type (SCOPED TO USER)
    let relevantItems = [];
    
    if (analysis.searchType === 'structural') {
      // Use SQL filters for structural queries
      console.log(`   💬 [NATURAL QUERY] Using SQL filters`);
      relevantItems = await getItems(user_phone, {
        ...analysis.filters,
        limit: analysis.limit || 50
      });
      
    } else if (analysis.searchType === 'conceptual') {
      // Use tag/keyword search for conceptual queries
      console.log(`   💬 [NATURAL QUERY] Using tag/keyword search: ${analysis.keywords.join(', ')}`);
      
      // First try tag search (SCOPED TO USER)
      if (analysis.keywords && analysis.keywords.length > 0) {
        relevantItems = await searchByTags(analysis.keywords, user_phone);
      }
      
      // If no results, try full-text search (SCOPED TO USER)
      if (relevantItems.length === 0 && analysis.keywords.length > 0) {
        console.log(`   💬 [NATURAL QUERY] No tag results, trying full-text search`);
        const ftsQuery = analysis.keywords.join(' OR ');
        relevantItems = await searchFullText(ftsQuery, user_phone);
      }
      
      // Apply additional filters if present
      if (relevantItems.length > 0 && Object.keys(analysis.filters).length > 0) {
        relevantItems = relevantItems.filter(item => {
          if (analysis.filters.status && item.status !== analysis.filters.status) return false;
          if (analysis.filters.type && item.type !== analysis.filters.type) return false;
          if (analysis.filters.priority && item.priority !== analysis.filters.priority) return false;
          if (analysis.filters.category && item.category !== analysis.filters.category) return false;
          return true;
        });
      }
      
    } else {
      // Hybrid: combine both approaches
      console.log(`   💬 [NATURAL QUERY] Using hybrid search`);
      
      // Start with structural filters (SCOPED TO USER)
      let structuralResults = await getItems(user_phone, {
        ...analysis.filters,
        limit: analysis.limit || 100
      });
      
      // Refine with keyword search if keywords present (SCOPED TO USER)
      if (analysis.keywords && analysis.keywords.length > 0) {
        const keywordResults = await searchByTags(analysis.keywords, user_phone);
        const keywordIds = new Set(keywordResults.map(item => item.id));
        
        // Prioritize items that match both
        relevantItems = structuralResults.filter(item => keywordIds.has(item.id));
        
        // If too few results, include structural-only matches
        if (relevantItems.length < 10) {
          relevantItems = structuralResults.slice(0, analysis.limit || 50);
        }
      } else {
        relevantItems = structuralResults;
      }
    }
    
    console.log(`   💬 [NATURAL QUERY] Found ${relevantItems.length} relevant items`);
    
    // STEP 3: Handle empty results
    if (relevantItems.length === 0) {
      return "No items found matching your query. Try a different search or check your saved tasks and ideas.";
    }
    
    // STEP 4: Format items for GPT context (only relevant items, not all!)
    const itemsContext = relevantItems.slice(0, 50).map((item, idx) => {
      return `${idx + 1}. [${item.type.toUpperCase()}] ${item.content}
   - Priority: ${item.priority || 'not set'}
   - Category: ${item.category || 'none'}
   - Deadline: ${item.deadline || 'none'}
   - Status: ${item.status}
   - Tags: ${item.tags || 'none'}
   - Created: ${new Date(item.created_at).toLocaleDateString()}`;
    }).join('\n\n');
    
    const systemPrompt = `You are a helpful assistant that helps users query their saved tasks and ideas.

The user asked: "${query}"

Here are the relevant items found (${relevantItems.length} total):

${itemsContext}

RESPONSE STYLE:
- Write in natural, conversational language - avoid field labels and bullet points
- Weave information into flowing sentences (e.g., "You have 3 high priority tasks: *Finish presentation* for work by Friday, *Buy groceries* (personal) by Sunday...")
- Use *single asterisks* for bold text on task/idea content (WhatsApp format)
- DO NOT use **double asterisks** or emojis
- Be concise but friendly and professional
- If showing multiple items, integrate them into natural sentences or short paragraphs
- Format dates naturally (e.g., "November 10th" instead of "2024-11-10")
- Group related items when it makes sense (e.g., "Your high priority items are...", "For personal tasks you have...")

Answer the user's question in a natural, conversational way. Be specific and reference the actual tasks/ideas they've saved, but make it sound like you're talking to them, not listing database fields.`;

    console.log(`   💬 [NATURAL QUERY] Calling GPT with ${relevantItems.length} filtered items...`);
    
    const client = getOpenAIClient();
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OpenAI API timeout after 30s')), 30000)
    );
    
    const apiPromise = client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    const answer = response.choices[0].message.content;
    console.log(`   💬 [NATURAL QUERY] GPT responded (${answer.length} chars)`);
    
    return answer;
    
  } catch (error) {
    console.error('   ❌ [NATURAL QUERY] Error:', error.message);
    
    // Fallback to simple keyword search (SCOPED TO USER)
    const items = await getItems(user_phone, { limit: 100 });
    return fallbackKeywordSearch(query, items);
  }
}

/**
 * Fallback: Simple keyword search if GPT fails
 */
function fallbackKeywordSearch(query, items) {
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  
  const matches = items.filter(item => {
    const content = item.content.toLowerCase();
    return keywords.some(keyword => content.includes(keyword));
  });
  
  if (matches.length === 0) {
    return `No items found matching "${query}". Try a different search term.`;
  }
  
  let response = `Found ${matches.length} item(s) matching "${query}":\n\n`;
  matches.slice(0, 5).forEach((item, idx) => {
    response += `${idx + 1}. *${item.content}*\n`;
    if (item.priority) response += `   Priority: ${item.priority}\n`;
    if (item.category) response += `   Category: ${item.category}\n`;
    response += '\n';
  });
  
  if (matches.length > 5) {
    response += `...and ${matches.length - 5} more. Try narrowing your search.`;
  }
  
  return response;
}
