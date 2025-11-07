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
2. Extract relevant information from the message
3. Generate searchable tags for better retrieval
4. Return structured JSON

TASK: Something that needs to be done, has action items, deadlines, or to-do elements
IDEA: A suggestion, concept, thought, or brainstorming item for the future
QUERY: A question asking to retrieve or show existing tasks/ideas (like "show tasks", "list ideas")

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

For tasks/ideas:
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
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });
    
    const response = await Promise.race([apiPromise, timeoutPromise]);

    const result = JSON.parse(response.choices[0].message.content);
    
    // Add some logging
    console.log(`AI Analysis: ${result.type} (confidence: ${result.confidence})`);
    
    return result;
  } catch (error) {
    console.error('Error processing message with AI:', error.message);
    
    // Fallback: basic keyword detection
    return fallbackProcessing(message);
  }
}

/**
 * Fallback processing if AI fails
 */
function fallbackProcessing(message) {
  const lowerMessage = message.toLowerCase();
  
  // Check if it's a query
  const queryKeywords = ['show', 'list', 'get', 'what', 'which', 'pending', 'display'];
  if (queryKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { type: 'query', confidence: 0.5 };
  }

  // Check for task indicators
  const taskKeywords = ['need to', 'must', 'have to', 'should', 'finish', 'complete', 'do', 'call', 'email', 'buy', 'send'];
  const ideaKeywords = ['idea:', 'thought:', 'maybe', 'could', 'what if', 'consider', 'explore'];

  const hasTaskKeyword = taskKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasIdeaKeyword = ideaKeywords.some(keyword => lowerMessage.includes(keyword));

  // Generate basic tags from message words
  const words = message.toLowerCase().split(/\s+/);
  const tags = words.filter(word => word.length > 3 && !['the', 'and', 'for', 'with'].includes(word)).slice(0, 5);

  if (hasIdeaKeyword) {
    return {
      type: 'idea',
      content: message,
      priority: 'medium',
      category: 'personal',
      deadline: null,
      tags: tags,
      confidence: 0.6
    };
  }

  if (hasTaskKeyword) {
    return {
      type: 'task',
      content: message,
      priority: 'medium',
      category: 'personal',
      deadline: null,
      tags: tags,
      confidence: 0.6
    };
  }

  return { type: 'none', confidence: 0.7 };
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

