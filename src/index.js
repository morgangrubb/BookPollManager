import { verifyKey } from 'discord-interactions';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { Router } from 'itty-router';
import { pollCommand } from './commands/poll.js';
import { handleButtonInteraction, handleSelectMenuInteraction, handleModalSubmit } from './interactions/handlers.js';
import { checkPollPhases } from './services/scheduler.js';

const router = Router();

// Health check endpoint - completely synchronous
router.get('/health', () => {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'discord-book-poll-bot',
    version: '2.0-serverless'
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
});

// Discord interactions endpoint
router.post('/interactions', async (request, env) => {
  try {
    // Add overall timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
    });

    const handlerPromise = (async () => {
      const signature = request.headers.get('x-signature-ed25519');
      const timestamp = request.headers.get('x-signature-timestamp');
      const body = await request.text();

      console.log('Interaction request:', {
        signature: signature ? 'present' : 'missing',
        timestamp: timestamp ? 'present' : 'missing',
        bodyLength: body.length,
        method: request.method,
        url: request.url
      });

      // Check if public key is available
      if (!env.DISCORD_PUBLIC_KEY) {
        console.error('DISCORD_PUBLIC_KEY not configured');
        return new Response('Bot configuration error', { status: 500 });
      }

      // Verify the request signature (skip verification for health checks)
      if (request.url.includes('/health')) {
        // Health endpoint doesn't need signature verification
      } else {
        try {
          const isValidRequest = verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
          if (!isValidRequest) {
            console.error('Invalid request signature');
            return new Response('Bad request signature', { status: 401 });
          }
        } catch (verifyError) {
          console.error('Signature verification error:', verifyError);
          return new Response('Signature verification failed', { status: 401 });
        }
      }

      const interaction = JSON.parse(body);

      // Handle ping
      if (interaction.type === InteractionType.PING) {
        console.log('Received PING, responding with PONG');
        return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate database connection
      if (!env.POLLS_DB) {
        console.error('Database not available');
        return new Response(JSON.stringify({ 
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Database unavailable. Please try again later.',
            flags: 64
          }
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Handle application commands
      if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        if (interaction.data.name === 'poll') {
          return await pollCommand.execute(interaction, env);
        }
      }

      // Handle message components (buttons, select menus)
      if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        if (interaction.data.component_type === 2) { // Button
          return await handleButtonInteraction(interaction, env);
        } else if (interaction.data.component_type === 3) { // Select Menu
          return await handleSelectMenuInteraction(interaction, env);
        }
      }

      // Handle modal submissions
      if (interaction.type === InteractionType.MODAL_SUBMIT) {
        return await handleModalSubmit(interaction, env);
      }

      return new Response(JSON.stringify({ error: 'Unknown interaction type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    })();

    return await Promise.race([handlerPromise, timeoutPromise]);

  } catch (error) {
    console.error('Error handling interaction:', error);
    
    if (error.message === 'Request timeout') {
      return new Response(JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Request timed out. Please try again.',
          flags: 64
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Cron job handler for poll phase transitions
async function handleCron(event, env, ctx) {
  console.log('Cron trigger activated');
  
  try {
    // Add timeout protection for cron jobs
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Cron timeout')), 25000); // 25 second timeout for cron
    });

    const cronPromise = checkPollPhases(env);

    await Promise.race([cronPromise, timeoutPromise]);
    console.log('Cron job completed successfully');
  } catch (error) {
    console.error('Error in cron job:', error);
    if (error.message === 'Cron timeout') {
      console.error('Cron job timed out - this may indicate database performance issues');
    }
  }
}

// Main handler
export default {
  async fetch(request, env, ctx) {
    try {
      return await router.handle(request, env, ctx);
    } catch (error) {
      console.error('Router error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
  
  async scheduled(event, env, ctx) {
    try {
      return await handleCron(event, env, ctx);
    } catch (error) {
      console.error('Scheduled error:', error);
    }
  }
};