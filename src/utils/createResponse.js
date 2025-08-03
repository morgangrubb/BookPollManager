export function createResponse({ ephemeral = false, ...data }) {
  return Response.json(
    {
      type: 4,
      data: {
        ...data,
        flags: ephemeral ? 64 : 0,
      },
    },
    {
      status: 200,
    },
  );
}
