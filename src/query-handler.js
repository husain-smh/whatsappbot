import { getItems, getStats, getCategories } from './database.js';

/**
 * Parse a query message and return appropriate results
 */
export function handleQuery(query) {
  console.log(`   🔍 [QUERY] Parsing query: "${query}"`);
  const lowerQuery = query.toLowerCase();
  const filters = {};

  // Detect type filter
  if (lowerQuery.includes('task') && !lowerQuery.includes('idea')) {
    filters.type = 'task';
  } else if (lowerQuery.includes('idea') && !lowerQuery.includes('task')) {
    filters.type = 'idea';
  }

  // Detect priority filter
  if (lowerQuery.includes('high priority') || lowerQuery.includes('urgent')) {
    filters.priority = 'high';
  } else if (lowerQuery.includes('medium priority')) {
    filters.priority = 'medium';
  } else if (lowerQuery.includes('low priority')) {
    filters.priority = 'low';
  }

  // Detect status filter
  if (lowerQuery.includes('pending') || lowerQuery.includes('upcoming') || lowerQuery.includes('todo')) {
    filters.status = 'pending';
  } else if (lowerQuery.includes('completed') || lowerQuery.includes('done')) {
    filters.status = 'completed';
  } else if (lowerQuery.includes('cancelled')) {
    filters.status = 'cancelled';
  } else {
    // Default to pending if no status specified
    filters.status = 'pending';
  }

  // Detect category filter
  const categories = getCategories().map(c => c.name);
  for (const category of categories) {
    if (lowerQuery.includes(category)) {
      filters.category = category;
      break;
    }
  }

  // Check for stats/summary request
  if (lowerQuery.includes('stats') || lowerQuery.includes('summary') || lowerQuery.includes('overview')) {
    return formatStatsResponse();
  }

  // Check for categories list request
  if (lowerQuery.includes('categories') || lowerQuery.includes('what categories')) {
    return formatCategoriesResponse();
  }

  // Get items based on filters
  console.log(`   🔍 [QUERY] Filters applied:`, filters);
  const items = getItems(filters);
  console.log(`   🔍 [QUERY] Found ${items.length} matching items`);

  const response = formatItemsResponse(items, filters);
  console.log(`   🔍 [QUERY] Response formatted (${response.length} chars)`);
  return response;
}

/**
 * Format items into a readable WhatsApp message
 */
function formatItemsResponse(items, filters) {
  if (items.length === 0) {
    return `No ${filters.type || 'items'} found matching your query. Try being less specific or check if you have any saved items.`;
  }

  let response = '';

  // Add header based on filters
  const typeText = filters.type ? `${filters.type}s` : 'items';
  const priorityText = filters.priority ? ` (${filters.priority} priority)` : '';
  const categoryText = filters.category ? ` in "${filters.category}"` : '';
  const statusText = filters.status && filters.status !== 'pending' ? ` - ${filters.status}` : '';

  response += `📋 *${items.length} ${typeText}${priorityText}${categoryText}${statusText}*\n\n`;

  // Group by priority if not filtered by priority
  if (!filters.priority && filters.status === 'pending') {
    const high = items.filter(i => i.priority === 'high');
    const medium = items.filter(i => i.priority === 'medium');
    const low = items.filter(i => i.priority === 'low');
    const noPriority = items.filter(i => !i.priority);

    if (high.length > 0) {
      response += `🔴 *HIGH PRIORITY*\n`;
      high.forEach((item, idx) => {
        response += formatItem(item, idx + 1);
      });
      response += '\n';
    }

    if (medium.length > 0) {
      response += `🟡 *MEDIUM PRIORITY*\n`;
      medium.forEach((item, idx) => {
        response += formatItem(item, idx + 1);
      });
      response += '\n';
    }

    if (low.length > 0) {
      response += `🟢 *LOW PRIORITY*\n`;
      low.forEach((item, idx) => {
        response += formatItem(item, idx + 1);
      });
      response += '\n';
    }

    if (noPriority.length > 0) {
      noPriority.forEach((item, idx) => {
        response += formatItem(item, idx + 1);
      });
    }
  } else {
    // Just list items sequentially
    items.forEach((item, idx) => {
      response += formatItem(item, idx + 1);
    });
  }

  return response.trim();
}

/**
 * Format a single item
 */
function formatItem(item, number) {
  const priorityEmoji = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
  };

  const typeEmoji = item.type === 'task' ? '✓' : '💡';
  const emoji = priorityEmoji[item.priority] || typeEmoji;

  let line = `${number}. ${emoji} ${item.content}`;

  if (item.category) {
    line += ` [${item.category}]`;
  }

  if (item.deadline) {
    const deadlineDate = new Date(item.deadline);
    const today = new Date();
    const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      line += ` ⚠️ OVERDUE by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      line += ` 📅 Due TODAY`;
    } else if (diffDays === 1) {
      line += ` 📅 Due tomorrow`;
    } else if (diffDays <= 7) {
      line += ` 📅 Due in ${diffDays} days`;
    } else {
      line += ` 📅 Due ${item.deadline}`;
    }
  }

  return line + '\n';
}

/**
 * Format statistics response
 */
function formatStatsResponse() {
  const stats = getStats();

  let response = `📊 *Your Task Bot Stats*\n\n`;
  response += `📋 Total: ${stats.total} items\n`;
  response += `  • ${stats.totalTasks} tasks\n`;
  response += `  • ${stats.totalIdeas} ideas\n\n`;

  if (Object.keys(stats.byStatus).length > 0) {
    response += `📌 *By Status:*\n`;
    for (const [status, count] of Object.entries(stats.byStatus)) {
      response += `  • ${status}: ${count}\n`;
    }
    response += '\n';
  }

  if (Object.keys(stats.byPriority).length > 0) {
    response += `⚡ *Pending by Priority:*\n`;
    if (stats.byPriority.high) response += `  🔴 High: ${stats.byPriority.high}\n`;
    if (stats.byPriority.medium) response += `  🟡 Medium: ${stats.byPriority.medium}\n`;
    if (stats.byPriority.low) response += `  🟢 Low: ${stats.byPriority.low}\n`;
    response += '\n';
  }

  if (Object.keys(stats.byCategory).length > 0) {
    response += `🏷️ *Top Categories:*\n`;
    const topCategories = Object.entries(stats.byCategory).slice(0, 5);
    topCategories.forEach(([category, count]) => {
      response += `  • ${category}: ${count}\n`;
    });
  }

  return response.trim();
}

/**
 * Format categories response
 */
function formatCategoriesResponse() {
  const categories = getCategories();

  if (categories.length === 0) {
    return 'No categories found.';
  }

  let response = `🏷️ *Your Categories (${categories.length})*\n\n`;
  categories.forEach((cat, idx) => {
    response += `${idx + 1}. ${cat.name}\n`;
  });

  return response.trim();
}

