export function createResponse({ ephemeral = false, ...data }) {
  return new Response(
    JSON.stringify({
      type: 4,
      data: {
        ...data,
        flags: ephemeral ? 64 : 0,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
