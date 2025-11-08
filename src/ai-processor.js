import OpenAI from 'openai';

// Lazy initialization to ensure dotenv loads first
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
 * System prompt for GPT to categorize messages
 */
const SYSTEM_PROMPT = `You are an AI assistant that helps categorize messages into tasks and ideas.

Your job is to:
1. Determine if a message is a TASK, IDEA, or QUERY
2. Detect MULTIPLE distinct tasks/ideas in a single message
3. Extract relevant information from each item
4. Generate searchable tags for better retrieval
5. Return structured JSON

TASK: Something that needs to be done, has action items, deadlines, or to-do elements
IDEA: A suggestion, concept, thought, or brainstorming item for the future
QUERY: A question asking to retrieve or show existing tasks/ideas (like "show tasks", "list ideas")

MULTI-INTENT DETECTION:
- If a message contains MULTIPLE distinct tasks/ideas separated by commas, "and", "also", "then", etc., split them into separate items
- Example: "Buy groceries, call mom tomorrow, and think about vacation plans"
  → This is 3 separate items: 2 tasks + 1 idea
- Each item should be analyzed independently with its own priority, category, deadline, and tags

For TASKS and IDEAS, extract:
- priority: high (urgent, ASAP, critical), medium (normal), low (nice to have) - infer from context
- category: personal, interns, identity labs, or suggest a new category based on content
- deadline: parse natural language dates ("by Friday", "tomorrow", "next week") into ISO format (YYYY-MM-DD)
- content: clean, clear description of the task/idea
- tags: 5-10 searchable keywords/tags that describe the content semantically

Tags should include:
- Main topic/subject (e.g., "books", "fitness", "meetings")
- Specific entities mentioned (e.g., "atomic-habits", "client-presentation")
- Related concepts (e.g., for "Read Atomic Habits" → ["books", "reading", "habits", "productivity", "self-improvement", "atomic-habits"])
- Action verbs (e.g., "read", "buy", "schedule", "call")
- Make tags lowercase and hyphenated for multi-word tags

For QUERIES, just identify it as a query - extraction will be handled separately.

Categories explanation:
- "personal" - personal life, errands, self-care, family
- "interns" - related to interns, intern management, intern projects
- "identity labs" - related to identity labs projects, work, initiatives
- If none fit, suggest a NEW category name based on content (lowercase, hyphenated if multiple words)

Return ONLY valid JSON in this exact format:

For MULTIPLE tasks/ideas:
{
  "items": [
    {
      "type": "task" | "idea",
      "content": "cleaned and clear description",
      "priority": "high" | "medium" | "low",
      "category": "category name",
      "deadline": "YYYY-MM-DD" or null,
      "tags": ["tag1", "tag2", "tag3", ...]
    },
    {
      "type": "task" | "idea",
      "content": "second item description",
      "priority": "high" | "medium" | "low",
      "category": "category name",
      "deadline": "YYYY-MM-DD" or null,
      "tags": ["tag1", "tag2", "tag3", ...]
    }
  ],
  "confidence": 0.0-1.0
}

For SINGLE task/idea:
{
  "type": "task" | "idea",
  "content": "cleaned and clear description",
  "priority": "high" | "medium" | "low",
  "category": "category name",
  "deadline": "YYYY-MM-DD" or null,
  "tags": ["tag1", "tag2", "tag3", ...],
  "confidence": 0.0-1.0
}

For queries:
{
  "type": "query",
  "confidence": 0.0-1.0
}

For casual messages that are neither tasks, ideas, nor queries:
{
  "type": "none",
  "confidence": 0.0-1.0
}

Confidence should reflect how certain you are about the classification.`;

/**
 * Process a message with GPT to determine if it's a task/idea and extract info
 * Returns normalized format that handles both single and multiple items
 */
export async function processMessage(message, context = {}) {
  try {
    const userMessage = `Message: "${message}"

Context: ${context.sender || 'self-message'}, sent at ${context.timestamp || new Date().toISOString()}`;

    console.log('🤖 Calling OpenAI API...');
    const client = getOpenAIClient();
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OpenAI API timeout after 30s')), 30000)
    );
    
    const apiPromise = client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 800, // Increased for multiple items
      response_format: { type: 'json_object' }
    });
    
    const response = await Promise.race([apiPromise, timeoutPromise]);

    const result = JSON.parse(response.choices[0].message.content);
    
    // Normalize response format
    // If it has "items" array, it's a multi-intent message
    if (result.items && Array.isArray(result.items)) {
      console.log(`AI Analysis: MULTI-INTENT - ${result.items.length} items detected (confidence: ${result.confidence})`);
      return {
        isMultiIntent: true,
        items: result.items,
        confidence: result.confidence
      };
    }
    
    // Single intent message (backward compatible)
    console.log(`AI Analysis: ${result.type} (confidence: ${result.confidence})`);
    return {
      isMultiIntent: false,
      ...result
    };
    
  } catch (error) {
    console.error('Error processing message with AI:', error.message);
    
    // Fallback: basic keyword detection
    return fallbackProcessing(message);
  }
}

/**
 * Fallback processing if AI fails
 * Now supports multi-intent detection
 */
function fallbackProcessing(message) {
  const lowerMessage = message.toLowerCase();
  
  // Check if it's a query
  const queryKeywords = ['show', 'list', 'get', 'what', 'which', 'pending', 'display'];
  if (queryKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { isMultiIntent: false, type: 'query', confidence: 0.5 };
  }

  // Try to detect multiple items by splitting on common separators
  const fragments = splitMessageIntoFragments(message);
  
  if (fragments.length > 1) {
    // Multi-intent detected
    console.log(`Fallback: Detected ${fragments.length} fragments`);
    const items = fragments.map(fragment => processFragment(fragment)).filter(item => item !== null);
    
    if (items.length > 1) {
      return {
        isMultiIntent: true,
        items: items,
        confidence: 0.5
      };
    }
  }
  
  // Single intent - process the whole message
  const item = processFragment(message);
  
  if (item) {
    return {
      isMultiIntent: false,
      ...item,
      confidence: 0.6
    };
  }

  return { isMultiIntent: false, type: 'none', confidence: 0.7 };
}

/**
 * Split message into fragments based on common separators
 */
function splitMessageIntoFragments(message) {
  // Split on commas, "and", "also", "then" but be smart about it
  // Use regex to split while preserving meaningful content
  const separatorPattern = /,\s*(?:and\s+)?|(?:\s+and\s+)|(?:\s+also\s+)|(?:\s+then\s+)/gi;
  
  const fragments = message.split(separatorPattern)
    .map(f => f.trim())
    .filter(f => f.length > 5); // Filter out very short fragments
  
  return fragments;
}

/**
 * Process a single fragment to determine if it's a task or idea
 */
function processFragment(fragment) {
  const lowerFragment = fragment.toLowerCase();
  
  // Check for task indicators
  const taskKeywords = ['need to', 'must', 'have to', 'should', 'finish', 'complete', 'do', 'call', 'email', 'buy', 'send', 'schedule', 'remind'];
  const ideaKeywords = ['idea:', 'thought:', 'maybe', 'could', 'what if', 'consider', 'explore', 'think about', 'brainstorm'];

  const hasTaskKeyword = taskKeywords.some(keyword => lowerFragment.includes(keyword));
  const hasIdeaKeyword = ideaKeywords.some(keyword => lowerFragment.includes(keyword));

  // Generate basic tags from fragment words
  const words = fragment.toLowerCase().split(/\s+/);
  const tags = words.filter(word => word.length > 3 && !['the', 'and', 'for', 'with', 'also', 'then'].includes(word)).slice(0, 5);

  // Try to extract deadline
  let deadline = parseDeadline(fragment);

  if (hasIdeaKeyword) {
    return {
      type: 'idea',
      content: fragment.trim(),
      priority: 'medium',
      category: 'personal',
      deadline: null,
      tags: tags
    };
  }

  if (hasTaskKeyword || deadline || tags.length > 0) {
    return {
      type: 'task',
      content: fragment.trim(),
      priority: 'medium',
      category: 'personal',
      deadline: deadline,
      tags: tags
    };
  }

  // Default to task if it looks actionable
  if (fragment.trim().length > 0) {
    return {
      type: 'task',
      content: fragment.trim(),
      priority: 'medium',
      category: 'personal',
      deadline: deadline,
      tags: tags
    };
  }

  return null;
}

/**
 * Parse deadline from natural language to ISO date
 * This is a helper that GPT should handle, but useful for fallback
 */
export function parseDeadline(text) {
  const today = new Date();
  const lowerText = text.toLowerCase();

  if (lowerText.includes('today')) {
    return today.toISOString().split('T')[0];
  }

  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  if (lowerText.includes('next week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }

  // Add more sophisticated parsing as needed
  return null;
}

