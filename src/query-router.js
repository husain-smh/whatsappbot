import OpenAI from 'openai';

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
 * System prompt for query analysis
 */
const QUERY_ANALYSIS_PROMPT = `You are a query analyzer that extracts structured filters and keywords from natural language queries.

Your job is to analyze a user query and extract:
1. Structural filters (priority, status, category, date ranges)
2. Search keywords/concepts for semantic matching
3. Query intent

Examples:

Query: "show high priority tasks due this week"
{
  "filters": {
    "priority": "high",
    "status": "pending",
    "deadlineFrom": "2024-11-04",
    "deadlineTo": "2024-11-10",
    "type": "task"
  },
  "keywords": [],
  "searchType": "structural",
  "limit": 50
}

Query: "which books I wanted to read"
{
  "filters": {
    "status": "pending"
  },
  "keywords": ["books", "reading", "read"],
  "searchType": "conceptual",
  "limit": 50
}

Query: "ideas about fitness"
{
  "filters": {
    "type": "idea",
    "status": "pending"
  },
  "keywords": ["fitness", "workout", "exercise", "gym", "health"],
  "searchType": "conceptual",
  "limit": 50
}

Query: "pending tasks for identity labs"
{
  "filters": {
    "type": "task",
    "status": "pending",
    "category": "identity labs"
  },
  "keywords": [],
  "searchType": "structural",
  "limit": 50
}

Rules:
- searchType: "structural" if query has clear filters (dates, priority, status, category)
- searchType: "conceptual" if query is about topics/concepts/things
- searchType: "hybrid" if it has both
- keywords: extract main concepts and related terms (3-10 keywords)
- Date ranges: convert relative dates to ISO format (today's date context will be provided)
- Default status to "pending" unless specified
- limit: default 50, but can be higher for "all" or "everything" queries

Return ONLY valid JSON.`;

/**
 * Analyze a query and return structured filters and search strategy
 */
export async function analyzeQuery(query, context = {}) {
  console.log(`   🔍 [QUERY ROUTER] Analyzing: "${query}"`);
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const userMessage = `Query: "${query}"

Today's date: ${today}
Context: User has tasks and ideas saved in a personal database.

Analyze this query and return structured filters and keywords.`;

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: QUERY_ANALYSIS_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    console.log(`   🔍 [QUERY ROUTER] Type: ${analysis.searchType}, Keywords: ${analysis.keywords?.length || 0}`);
    
    return analysis;
    
  } catch (error) {
    console.error('   ❌ [QUERY ROUTER] Error:', error.message);
    
    // Fallback to simple keyword extraction
    return fallbackAnalysis(query);
  }
}

/**
 * Fallback query analysis if GPT fails
 */
function fallbackAnalysis(query) {
  const lowerQuery = query.toLowerCase();
  const filters = {};
  const keywords = [];
  
  // Detect type
  if (lowerQuery.includes('task') && !lowerQuery.includes('idea')) {
    filters.type = 'task';
  } else if (lowerQuery.includes('idea') && !lowerQuery.includes('task')) {
    filters.type = 'idea';
  }
  
  // Detect priority
  if (lowerQuery.includes('high priority') || lowerQuery.includes('urgent')) {
    filters.priority = 'high';
  } else if (lowerQuery.includes('medium priority')) {
    filters.priority = 'medium';
  } else if (lowerQuery.includes('low priority')) {
    filters.priority = 'low';
  }
  
  // Detect status
  if (lowerQuery.includes('completed') || lowerQuery.includes('done')) {
    filters.status = 'completed';
  } else if (lowerQuery.includes('cancelled')) {
    filters.status = 'cancelled';
  } else {
    filters.status = 'pending';
  }
  
  // Detect time ranges
  const today = new Date();
  if (lowerQuery.includes('today')) {
    filters.deadlineFrom = today.toISOString().split('T')[0];
    filters.deadlineTo = today.toISOString().split('T')[0];
  } else if (lowerQuery.includes('this week')) {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    filters.deadlineFrom = startOfWeek.toISOString().split('T')[0];
    filters.deadlineTo = endOfWeek.toISOString().split('T')[0];
  }
  
  // Extract keywords (words longer than 3 chars, excluding common words)
  const stopWords = ['show', 'list', 'get', 'all', 'the', 'and', 'for', 'with', 'about', 'task', 'tasks', 'idea', 'ideas', 'pending', 'high', 'medium', 'low', 'priority'];
  const words = lowerQuery.split(/\s+/);
  words.forEach(word => {
    if (word.length > 3 && !stopWords.includes(word)) {
      keywords.push(word);
    }
  });
  
  // Determine search type
  const hasStructuralFilters = filters.priority || filters.deadlineFrom || filters.category;
  const hasKeywords = keywords.length > 0;
  
  let searchType = 'structural';
  if (hasKeywords && !hasStructuralFilters) {
    searchType = 'conceptual';
  } else if (hasKeywords && hasStructuralFilters) {
    searchType = 'hybrid';
  }
  
  console.log(`   🔍 [QUERY ROUTER] Fallback analysis - Type: ${searchType}`);
  
  return {
    filters,
    keywords,
    searchType,
    limit: 50
  };
}

/**
 * Calculate date range for common phrases
 */
export function parseDateRange(phrase) {
  const today = new Date();
  const lowerPhrase = phrase.toLowerCase();
  
  if (lowerPhrase.includes('today')) {
    return {
      from: today.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  }
  
  if (lowerPhrase.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      from: tomorrow.toISOString().split('T')[0],
      to: tomorrow.toISOString().split('T')[0]
    };
  }
  
  if (lowerPhrase.includes('this week')) {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      from: startOfWeek.toISOString().split('T')[0],
      to: endOfWeek.toISOString().split('T')[0]
    };
  }
  
  if (lowerPhrase.includes('next week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const startOfWeek = new Date(nextWeek);
    startOfWeek.setDate(nextWeek.getDate() - nextWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      from: startOfWeek.toISOString().split('T')[0],
      to: endOfWeek.toISOString().split('T')[0]
    };
  }
  
  if (lowerPhrase.includes('this month')) {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      from: startOfMonth.toISOString().split('T')[0],
      to: endOfMonth.toISOString().split('T')[0]
    };
  }
  
  return null;
}

