import { verifyKey } from 'discord-interactions';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { Router } from 'itty-router';
import { pollCommand } from './commands/poll.js';
import { handleButtonInteraction, handleSelectMenuInteraction, handleModalSubmit } from './interactions/handlers.js';
import { initializeFirebase } from './services/firebase.js';
import { checkPollPhases } from './services/scheduler.js';

const router = Router();

// Health check endpoint
router.get('/health', () => {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'discord-bot-serverless'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Discord interactions endpoint
router.post('/interactions', async (request, env) => {
  try {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();

    // Verify the request signature
    const isValidRequest = verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
    if (!isValidRequest) {
      return new Response('Bad request signature', { status: 401 });
    }

    const interaction = JSON.parse(body);

    // Handle ping
    if (interaction.type === InteractionType.PING) {
      return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Firebase
    await initializeFirebase(env);

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

  } catch (error) {
    console.error('Error handling interaction:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Cron job handler for poll phase transitions
async function handleCron(event, env, ctx) {
  try {
    await initializeFirebase(env);
    await checkPollPhases(env);
    console.log('Cron job completed successfully');
  } catch (error) {
    console.error('Error in cron job:', error);
  }
}

// Main handler
export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
  
  async scheduled(event, env, ctx) {
    return handleCron(event, env, ctx);
  }
};