// src/interactions/list.js
import { createResponse } from "../utils/createResponse.js";

export const listCommand = {
  name: "list",
  description: "List all polls",
  type: 1, // SUB_COMMAND
};

export async function handleListPolls({ interaction, pollManager }) {
  const activePolls = await pollManager.getAllPolls(interaction.guild_id);

  if (activePolls.length === 0) {
    return createResponse({
      ephemeral: true,
      content: "📚 No active polls found in this server.",
    });
  }

  // Handle pagination for more than 10 polls
  const pollsPerPage = 10;
  const totalPages = Math.ceil(activePolls.length / pollsPerPage);
  const currentPolls = activePolls.slice(0, pollsPerPage);

  const pollList = currentPolls
    .map((poll) => {
      const createdTimestamp = poll.createdAt
        ? Math.floor(new Date(poll.createdAt).getTime() / 1000)
        : null;
      const timeDisplay =
        createdTimestamp && !isNaN(createdTimestamp)
          ? `<t:${createdTimestamp}:R>`
          : "Unknown date";
      const phase =
        poll.phase === "nomination"
          ? "📝 Nominating"
          : poll.phase === "voting"
            ? "🗳️ Voting"
            : "✅ Completed";

      return `\`${poll.id}\` - **${poll.title}** (${phase}) - ${timeDisplay}`;
    })
    .join("\n");

  const embed = {
    title: "📚 Book Club Polls",
    description: pollList,
    color: 0x0099ff,
    timestamp: new Date().toISOString(),
  };

  // Add pagination info if there are more polls
  if (totalPages > 1) {
    embed.footer = {
      text: `Showing 1-${currentPolls.length} of ${activePolls.length} polls (Page 1/${totalPages})`,
    };
  }

  return new Response(
    JSON.stringify({
      type: 4,
      data: {
        embeds: [embed],
        flags: 64,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
