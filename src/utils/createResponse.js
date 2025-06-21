export function createResponse(content, ephemeral = true) {
  return new Response(
    JSON.stringify({
      type: 4,
      data: {
        content,
        flags: ephemeral ? 64 : 0,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
