import OpenAI from 'openai';
import https from 'https';
import http from 'http';

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
 * Download audio file from Twilio's MediaUrl
 * Twilio requires Basic Auth (AccountSid:AuthToken)
 * Handles HTTP redirects (307) automatically
 */
async function downloadAudioFromTwilio(mediaUrl, redirectCount = 0) {
  // Prevent infinite redirect loops
  if (redirectCount > 5) {
    throw new Error('Too many redirects while downloading audio');
  }
  
  return new Promise((resolve, reject) => {
    try {
      if (redirectCount === 0) {
        console.log('📥 [TRANSCRIPTION] Downloading audio from Twilio...');
      } else {
        console.log(`   Following redirect (${redirectCount})...`);
      }
      
      // Create Basic Auth header
      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64');
      
      const url = new URL(mediaUrl);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      };
      
      const req = protocol.request(options, (res) => {
        // Handle redirects (301, 302, 307, 308)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`   Redirect detected: ${res.statusCode} → ${res.headers.location}`);
          
          // Follow the redirect
          downloadAudioFromTwilio(res.headers.location, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }
        
        // Handle non-200 responses
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download audio: HTTP ${res.statusCode}`));
          return;
        }
        
        // Download the actual file
        const chunks = [];
        let totalSize = 0;
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
          totalSize += chunk.length;
        });
        
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || 'audio/ogg';
          
          console.log(`✓ [TRANSCRIPTION] Downloaded ${(totalSize / 1024).toFixed(2)} KB (${contentType})`);
          resolve({ buffer, contentType });
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Network error downloading audio: ${error.message}`));
      });
      
      // Timeout after 30 seconds
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Timeout downloading audio from Twilio'));
      });
      
      req.end();
      
    } catch (error) {
      reject(new Error(`Error downloading audio: ${error.message}`));
    }
  });
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithWhisper(audioBuffer, mimeType) {
  try {
    console.log('🎤 [TRANSCRIPTION] Calling OpenAI Whisper API...');
    const startTime = Date.now();
    
    const client = getOpenAIClient();
    
    // Determine file extension from mime type
    let extension = 'ogg';
    if (mimeType.includes('mp3')) extension = 'mp3';
    else if (mimeType.includes('mp4')) extension = 'mp4';
    else if (mimeType.includes('mpeg')) extension = 'mpeg';
    else if (mimeType.includes('m4a')) extension = 'm4a';
    else if (mimeType.includes('wav')) extension = 'wav';
    else if (mimeType.includes('webm')) extension = 'webm';
    
    // Create a Blob from buffer (Node.js 18+ has native Blob support)
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    
    // Create a File-like object for the OpenAI SDK
    // The SDK needs an object with name, type, and blob/buffer properties
    const audioFile = Object.assign(audioBlob, {
      name: `voice_note.${extension}`,
      lastModified: Date.now()
    });
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Whisper API timeout after 60s')), 60000)
    );
    
    const transcriptionPromise = client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Can be removed to auto-detect, but 'en' is faster
      response_format: 'text'
    });
    
    const transcription = await Promise.race([transcriptionPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    console.log(`✓ [TRANSCRIPTION] Transcription complete (took ${duration}ms)`);
    console.log(`   📝 Result: "${transcription.substring(0, 100)}${transcription.length > 100 ? '...' : ''}"`);
    
    return transcription;
    
  } catch (error) {
    console.error('❌ [TRANSCRIPTION] Whisper API error:', error.message);
    throw error;
  }
}

/**
 * Main export: Transcribe audio from Twilio MediaUrl
 * @param {string} mediaUrl - Twilio MediaUrl from webhook
 * @returns {Promise<string|null>} - Transcribed text or null if failed
 */
export async function transcribeAudio(mediaUrl) {
  const startTime = Date.now();
  
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎤 [TRANSCRIPTION] Processing voice note...');
    console.log(`   URL: ${mediaUrl}`);
    
    // Step 1: Download audio from Twilio
    const { buffer, contentType } = await downloadAudioFromTwilio(mediaUrl);
    
    // Step 2: Transcribe with Whisper
    const transcription = await transcribeWithWhisper(buffer, contentType);
    
    // Step 3: Validate transcription
    if (!transcription || transcription.trim().length === 0) {
      console.log('⚠️  [TRANSCRIPTION] Empty transcription returned');
      return null;
    }
    
    // Check if transcription is too short or just noise
    if (transcription.trim().length < 3) {
      console.log('⚠️  [TRANSCRIPTION] Transcription too short, likely noise');
      return null;
    }
    
    const totalDuration = Date.now() - startTime;
    console.log(`✓ [TRANSCRIPTION] Voice note processed successfully (${totalDuration}ms total)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return transcription.trim();
    
  } catch (error) {
    console.error('❌ [TRANSCRIPTION] Failed to process voice note:', error.message);
    console.error('❌ Stack trace:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return null;
  }
}

