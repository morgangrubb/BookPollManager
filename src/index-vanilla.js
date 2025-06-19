// Discord Bot with signature verification using Web Crypto API
async function verifyDiscordSignature(body, signature, timestamp, publicKey) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKey),
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );
    
    const data = encoder.encode(timestamp + body);
    const sig = hexToBytes(signature);
    
    return await crypto.subtle.verify('Ed25519', key, sig, data);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      
      // Health check endpoint
      if (url.pathname === '/health' && request.method === 'GET') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'discord-book-poll-bot',
          version: '2.0-serverless'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Discord interactions endpoint
      if (url.pathname === '/interactions' && request.method === 'POST') {
        try {
          const signature = request.headers.get('x-signature-ed25519');
          const timestamp = request.headers.get('x-signature-timestamp');
          const body = await request.text();

          // Verify signature if public key is available
          if (env.DISCORD_PUBLIC_KEY && signature && timestamp) {
            const isValid = await verifyDiscordSignature(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
            if (!isValid) {
              return new Response('Invalid signature', { status: 401 });
            }
          }

          const interaction = JSON.parse(body);

          // Handle ping (type 1) - Discord verification
          if (interaction.type === 1) {
            console.log('Discord PING received, responding with PONG');
            return new Response(JSON.stringify({ type: 1 }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // Handle slash commands (type 2)
          if (interaction.type === 2) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: 'Discord bot verified! Poll functionality will be available soon.',
                flags: 64
              }
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // Handle other interaction types
          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: 'Bot is operational!',
              flags: 64
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });

        } catch (parseError) {
          console.error('Parse error:', parseError);
          return new Response('Bad request', { status: 400 });
        }
      }
      
      // 404 for all other routes
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
};