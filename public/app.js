// State
let allItems = [];
let allCategories = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check auth first
  checkAuth().then(isAuthenticated => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    
    loadStats();
    loadCategories();
    loadItems();
    checkBotStatus();
    setupEventListeners();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
      loadStats();
      loadItems();
      checkBotStatus();
    }, 30000);
  });
});

// Check authentication status
async function checkAuth() {
  try {
    const response = await fetch('/auth/status');
    const data = await response.json();
    
    if (data.authenticated) {
      // Update user info in header
      const userInfo = document.getElementById('user-info');
      if (userInfo && data.name) {
        userInfo.textContent = `Welcome, ${data.name}`;
      }
    }
    
    return data.authenticated;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('filter-type').addEventListener('change', loadItems);
  document.getElementById('filter-priority').addEventListener('change', loadItems);
  document.getElementById('filter-category').addEventListener('change', loadItems);
  document.getElementById('filter-status').addEventListener('change', loadItems);
  document.getElementById('filter-search').addEventListener('input', debounce(loadItems, 500));
  document.getElementById('btn-refresh').addEventListener('click', () => {
    loadStats();
    loadCategories();
    loadItems();
    checkBotStatus();
  });
  
  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// Logout function
async function logout() {
  try {
    const response = await fetch('/auth/logout', {
      method: 'POST'
    });
    const data = await response.json();
    
    if (data.success) {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Check bot status
async function checkBotStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    
    const statusBadge = document.getElementById('bot-status');
    const statusText = statusBadge.querySelector('.status-text');
    
    if (data.success && data.status.isReady) {
      statusBadge.classList.add('connected');
      statusBadge.classList.remove('disconnected');
      statusText.textContent = 'Connected';
    } else {
      statusBadge.classList.add('disconnected');
      statusBadge.classList.remove('connected');
      statusText.textContent = 'Disconnected';
    }
  } catch (error) {
    console.error('Error checking bot status:', error);
  }
}

// Load statistics
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('stat-total').textContent = data.stats.total;
      document.getElementById('stat-tasks').textContent = data.stats.totalTasks;
      document.getElementById('stat-ideas').textContent = data.stats.totalIdeas;
      document.getElementById('stat-pending').textContent = data.stats.byStatus.pending || 0;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load categories
async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    const data = await response.json();
    
    if (data.success) {
      allCategories = data.categories;
      
      // Update category filter dropdown
      const categorySelect = document.getElementById('filter-category');
      const currentValue = categorySelect.value;
      
      categorySelect.innerHTML = '<option value="">All</option>';
      data.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
      });
      
      categorySelect.value = currentValue;
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Load items
async function loadItems() {
  const container = document.getElementById('items-container');
  container.innerHTML = '<div class="loading">Loading...</div>';
  
  try {
    // Build query params from filters
    const params = new URLSearchParams();
    
    const type = document.getElementById('filter-type').value;
    const priority = document.getElementById('filter-priority').value;
    const category = document.getElementById('filter-category').value;
    const status = document.getElementById('filter-status').value;
    const search = document.getElementById('filter-search').value;
    
    if (type) params.append('type', type);
    if (priority) params.append('priority', priority);
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    
    const response = await fetch(`/api/items?${params}`);
    const data = await response.json();
    
    if (data.success) {
      allItems = data.items;
      renderItems(data.items);
    } else {
      container.innerHTML = '<div class="empty-state"><h3>Error loading items</h3></div>';
    }
  } catch (error) {
    console.error('Error loading items:', error);
    container.innerHTML = '<div class="empty-state"><h3>Error loading items</h3><p>Please try again</p></div>';
  }
}

// Render items
function renderItems(items) {
  const container = document.getElementById('items-container');
  
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No items found</h3>
        <p>Start by messaging yourself on WhatsApp with tasks or ideas!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  items.forEach(item => {
    const card = createItemCard(item);
    container.appendChild(card);
  });
}

// Create item card
function createItemCard(item) {
  const card = document.createElement('div');
  card.className = `item-card ${item.priority ? 'priority-' + item.priority : ''}`;
  
  // Parse context
  let context = {};
  try {
    context = JSON.parse(item.context || '{}');
  } catch (e) {
    context = {};
  }
  
  // Format deadline
  let deadlineHTML = '';
  if (item.deadline) {
    const deadline = new Date(item.deadline);
    const today = new Date();
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let deadlineText = item.deadline;
    let deadlineClass = '';
    
    if (diffDays < 0) {
      deadlineText = `⚠️ OVERDUE by ${Math.abs(diffDays)} days`;
      deadlineClass = 'overdue';
    } else if (diffDays === 0) {
      deadlineText = '📅 Due TODAY';
      deadlineClass = 'overdue';
    } else if (diffDays === 1) {
      deadlineText = '📅 Due tomorrow';
    } else if (diffDays <= 7) {
      deadlineText = `📅 Due in ${diffDays} days`;
    }
    
    deadlineHTML = `<span class="item-deadline ${deadlineClass}">${deadlineText}</span>`;
  }
  
  // Format created date
  const createdDate = new Date(item.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  card.innerHTML = `
    <div class="item-header">
      <span class="item-type ${item.type}">${item.type}</span>
      ${item.priority ? `<span class="item-priority ${item.priority}">${item.priority}</span>` : ''}
      ${item.category ? `<span class="item-category">🏷️ ${item.category}</span>` : ''}
      <span class="item-status ${item.status}">${item.status}</span>
    </div>
    <div class="item-content">${escapeHtml(item.content)}</div>
    <div class="item-meta">
      <span>📅 ${createdDate}</span>
      ${deadlineHTML}
      ${context.sender ? `<span>👤 ${escapeHtml(context.sender)}</span>` : ''}
    </div>
  `;
  
  return card;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

