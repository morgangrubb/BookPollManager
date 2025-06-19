// Minimal Discord bot to test basic functionality
import { verifyKey } from 'discord-interactions';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { Router } from 'itty-router';

const router = Router();

// Health check endpoint
router.get('/health', () => {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'discord-book-poll-bot'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// Discord interactions endpoint
router.post('/interactions', async (request, env) => {
  try {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();

    // Verify signature if public key is available
    if (env.DISCORD_PUBLIC_KEY) {
      const isValidRequest = verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
      if (!isValidRequest) {
        return new Response('Bad request signature', { status: 401 });
      }
    }

    const interaction = JSON.parse(body);

    // Handle ping
    if (interaction.type === InteractionType.PING) {
      return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For now, return a simple response for other interactions
    return new Response(JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Bot is working! Full functionality coming soon.',
        flags: 64 // EPHEMERAL
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Interaction error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});

// Default export
export default {
  async fetch(request, env, ctx) {
    try {
      return await router.handle(request, env, ctx);
    } catch (error) {
      console.error('Router error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
};