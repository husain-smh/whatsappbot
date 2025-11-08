import twilio from 'twilio';
import { processMessage } from './ai-processor.js';
import { saveItem, getUserByPhone, autoRegisterUser } from './database.js';
import { handleNaturalQuery } from './natural-query.js';

// Initialize Twilio client
let twilioClient = null;

function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
}

const BOT_PREFIX = '[BOT] ';

/**
 * Handle incoming WhatsApp message webhook from Twilio
 * SIMPLE VERSION - No sessions, just DB lookup!
 */
export async function handleIncomingMessage(req, res) {
  const startTime = Date.now();
  
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 [WEBHOOK] INCOMING MESSAGE');
    
    const { From, To, Body, MessageSid, NumMedia } = req.body;
    
    console.log(`   📱 From: ${From}`);
    console.log(`   📱 To: ${To}`);
    console.log(`   📝 Body: "${Body?.substring(0, 50)}${Body?.length > 50 ? '...' : ''}"`);
    console.log(`   🆔 MessageSid: ${MessageSid}`);
    
    // SIMPLE: Just check if user exists in database
    let user = getUserByPhone(From);
    let welcomeMessage = null;
    
    if (!user) {
      console.log(`📝 [WEBHOOK] New user detected: ${From} - Auto-registering...`);
      
      // Auto-register the user
      const newUser = autoRegisterUser(From);
      
      if (newUser) {
        user = {
          phone_number: newUser.phone_number,
          name: newUser.name,
          status: 'active'
        };
        
        // Prepare welcome message with dashboard credentials
        welcomeMessage = `[BOT] 🎉 Welcome to Task Bot!

You've been automatically registered.

📊 *Dashboard Access:*
• URL: http://localhost:3000/login
• Phone: ${newUser.phone_number}
• Password: ${newUser.password}

💡 You can now send me tasks and ideas, and I'll organize them for you!

Try: "Add task: Buy groceries by tomorrow"`;
        
        console.log(`✓ [WEBHOOK] User auto-registered: ${user.name}`);
      } else {
        console.log(`❌ [WEBHOOK] Failed to auto-register user`);
        await sendWhatsAppMessage(From, '[BOT] ❌ Registration failed. Please try again.');
        return res.status(200).send('OK');
      }
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      console.log(`⏭️  [WEBHOOK] User inactive: ${From}`);
      await sendWhatsAppMessage(From, '[BOT] ❌ Your account is inactive. Please contact the administrator.');
      return res.status(200).send('OK');
    }
    
    console.log(`✓ [WEBHOOK] Message from user: ${user.name} (${From})`);
    
    // If this is a new user, send welcome message first
    if (welcomeMessage) {
      console.log('📤 [WEBHOOK] Sending welcome message with credentials...');
      await sendWhatsAppMessage(From, welcomeMessage);
      console.log('✓ [WEBHOOK] Welcome message sent');
    }
    
    // Ignore media messages
    if (NumMedia && parseInt(NumMedia) > 0) {
      console.log('⏭️  [WEBHOOK] Media message detected, ignoring');
      return res.status(200).send('OK');
    }
    
    // Ignore empty messages
    if (!Body || Body.trim() === '') {
      console.log('⏭️  [WEBHOOK] Empty message, ignoring');
      return res.status(200).send('OK');
    }
    
    const messageText = Body.trim();
    
    // Skip bot's own messages (prevent loops)
    if (messageText.startsWith(BOT_PREFIX)) {
      console.log('⏭️  [WEBHOOK] Bot-sent message detected, skipping');
      return res.status(200).send('OK');
    }
    
    console.log('🔄 [WEBHOOK] Processing message with AI...');
    
    // Prepare context
    const context = {
      sender: user.name,
      timestamp: new Date().toISOString(),
      messageId: MessageSid,
      from: From
    };
    
    // Process with AI
    const analysis = await processMessage(messageText, context);
    
    console.log(`✓ [WEBHOOK] AI analysis complete (took ${Date.now() - startTime}ms)`);
    
    if (!analysis || analysis.confidence < 0.3) {
      console.log('⏭️  [WEBHOOK] Low confidence or failed analysis, skipping');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return res.status(200).send('OK');
    }
    
    // Handle based on type
    let responseText = '';
    
    // MULTI-INTENT: Process multiple items
    if (analysis.isMultiIntent && analysis.items && analysis.items.length > 0) {
      console.log(`📋 [WEBHOOK] MULTI-INTENT: Processing ${analysis.items.length} items (confidence: ${analysis.confidence})`);
      
      const savedItems = [];
      
      for (let i = 0; i < analysis.items.length; i++) {
        const item = analysis.items[i];
        console.log(`  📝 [${i + 1}/${analysis.items.length}] Saving ${item.type}: ${item.content.substring(0, 40)}...`);
        
        const itemId = saveItem({
          user_phone: From,
          type: item.type,
          content: item.content,
          priority: item.priority,
          category: item.category,
          deadline: item.deadline,
          tags: item.tags,
          context: JSON.stringify(context)
        });
        
        savedItems.push({
          id: itemId,
          ...item
        });
        
        console.log(`  ✓ Saved (ID: ${itemId})`);
      }
      
      console.log(`✓ [WEBHOOK] Saved all ${savedItems.length} items to database`);
      responseText = BOT_PREFIX + formatBulkConfirmation(savedItems);
      
    } 
    // SINGLE INTENT: Handle query
    else if (analysis.type === 'query') {
      console.log('🔍 [WEBHOOK] Type: QUERY - Generating response...');
      responseText = BOT_PREFIX + await handleNaturalQuery(messageText, From);
      console.log(`✓ [WEBHOOK] Query response generated (${responseText.length} chars)`);
      
    } 
    // SINGLE INTENT: Handle task or idea
    else if (analysis.type === 'task' || analysis.type === 'idea') {
      console.log(`📝 [WEBHOOK] Type: ${analysis.type.toUpperCase()} - Saving to database...`);
      
      const itemId = saveItem({
        user_phone: From,
        type: analysis.type,
        content: analysis.content || messageText,
        priority: analysis.priority,
        category: analysis.category,
        deadline: analysis.deadline,
        tags: analysis.tags,
        context: JSON.stringify(context)
      });
      
      console.log(`✓ [WEBHOOK] Saved to database (ID: ${itemId})`);
      responseText = BOT_PREFIX + formatConfirmation(analysis, itemId);
      
    } else {
      console.log(`⏭️  [WEBHOOK] Type: ${analysis.type} - Not actionable, ignoring`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return res.status(200).send('OK');
    }
    
    // Send response back via Twilio
    if (responseText) {
      // WhatsApp has message length limits, truncate if needed
      const MAX_MESSAGE_LENGTH = 4000;
      if (responseText.length > MAX_MESSAGE_LENGTH) {
        console.log(`⚠️  [WEBHOOK] Response too long (${responseText.length} chars), truncating...`);
        responseText = responseText.substring(0, MAX_MESSAGE_LENGTH - 100) + '\n\n_...response truncated. Try filtering to see fewer items._';
      }
      
      console.log('🔄 [WEBHOOK] Sending response via Twilio...');
      await sendWhatsAppMessage(From, responseText);
      console.log(`✓ [WEBHOOK] Response sent successfully!`);
    }
    
    console.log(`⏱️  Total processing time: ${Date.now() - startTime}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error processing message:', error.message);
    console.error('❌ Stack trace:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Try to send error notification
    try {
      const { From } = req.body;
      const user = getUserByPhone(From);
      if (user) {
        await sendWhatsAppMessage(From, '[BOT] ❌ Sorry, an error occurred processing your message. Please try again.');
      }
    } catch (notifyError) {
      console.error('❌ Could not send error notification:', notifyError.message);
    }
    
    // Always return 200 to Twilio to avoid retries
    return res.status(200).send('OK');
  }
}

/**
 * Send WhatsApp message via Twilio API
 */
async function sendWhatsAppMessage(to, text) {
  try {
    const client = getTwilioClient();
    
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: to,
      body: text
    });
    
  } catch (error) {
    console.error('❌ Failed to send WhatsApp message:', error.message);
    throw error;
  }
}

/**
 * Format confirmation message
 */
function formatConfirmation(analysis, itemId) {
  let message = `Saved as *${analysis.type}* (ID: ${itemId})\n\n`;
  
  if (analysis.priority) {
    message += `Priority: ${analysis.priority}\n`;
  }
  
  if (analysis.category) {
    message += `Category: ${analysis.category}\n`;
  }
  
  if (analysis.deadline) {
    message += `Deadline: ${analysis.deadline}\n`;
  }

  message += `\nType "show tasks" or "list ideas" to see your items`;

  return message;
}

/**
 * Format bulk confirmation message for multiple items
 */
function formatBulkConfirmation(savedItems) {
  // Count by type
  const taskCount = savedItems.filter(item => item.type === 'task').length;
  const ideaCount = savedItems.filter(item => item.type === 'idea').length;
  
  // Create summary line
  const summary = [];
  if (taskCount > 0) summary.push(`${taskCount} task${taskCount > 1 ? 's' : ''}`);
  if (ideaCount > 0) summary.push(`${ideaCount} idea${ideaCount > 1 ? 's' : ''}`);
  
  let message = `Saved ${summary.join(' and ')}!\n\n`;
  
  // List each item with details
  savedItems.forEach((item, idx) => {
    const typeLabel = item.type === 'task' ? 'TASK' : 'IDEA';
    message += `${idx + 1}. [${typeLabel}] *${item.content}*\n`;
    message += `   ID: ${item.id}`;
    
    if (item.priority) {
      message += ` | Priority: ${item.priority}`;
    }
    
    if (item.category) {
      message += ` | ${item.category}`;
    }
    
    if (item.deadline) {
      message += `\n   Deadline: ${item.deadline}`;
    }
    
    message += '\n\n';
  });
  
  message += `Type "show tasks" or "list ideas" to see all your items`;
  
  return message;
}

/**
 * Verify Twilio webhook signature (optional but recommended for production)
 */
export function verifyTwilioSignature(req, res, next) {
  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  try {
    const client = getTwilioClient();
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      url,
      req.body
    );
    
    if (isValid) {
      return next();
    } else {
      console.warn('⚠️  Invalid Twilio signature');
      return res.status(403).send('Forbidden');
    }
  } catch (error) {
    console.error('❌ Error verifying Twilio signature:', error.message);
    return next(); // In development, proceed even if verification fails
  }
}
