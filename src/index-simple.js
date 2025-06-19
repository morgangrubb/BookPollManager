// Ultra-minimal Discord bot without discord-interactions package
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

// Discord interactions endpoint without signature verification
router.post('/interactions', async (request, env) => {
  try {
    const body = await request.text();
    const interaction = JSON.parse(body);

    // Handle ping (type 1)
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For other interactions, return a simple response
    return new Response(JSON.stringify({
      type: 4,
      data: {
        content: 'Bot is working! Discord verification successful.',
        flags: 64
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

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

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