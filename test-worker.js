// Minimal test worker to identify the issue
import { Router } from 'itty-router';

const router = Router();

// Simple health check
router.get('/health', () => {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'discord-book-poll-bot-test'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// Simple interactions endpoint
router.post('/interactions', () => {
  return new Response(JSON.stringify({
    type: 1 // PONG
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

export default {
  async fetch(request, env, ctx) {
    try {
      return router.handle(request, env, ctx);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
};