// src/interactions/tie-break.js
import { createResponse } from "../utils/createResponse.js";
import { formatResults } from "../utils/format.js";

export const tieBreakCommand = {
  name: "tie-break",
  description: "Resolve a tie in a Chris-style poll by selecting a winner",
  type: 1, // SUB_COMMAND
  options: [
    {
      name: "poll_id",
      description: "Poll ID",
      type: 3, // STRING
      required: false,
    },
  ],
};

export async function handleTieBreak({
  interaction,
  pollManager,
  poll,
  isAdmin,
  isPollCreator,
}) {
  if (
    !poll ||
    poll.phase !== "completed" ||
    poll.tallyMethod !== "chris-style"
  ) {
    return createResponse({
      ephemeral: true,
      content:
        "❌ Tie-break is only available for completed Chris-style polls.",
    });
  }
  if (
    !poll.results ||
    poll.results.tie !== true ||
    !Array.isArray(poll.results.tiedNominations) ||
    poll.results.tiedNominations.length < 2
  ) {
    return createResponse({
      ephemeral: true,
      content: "❌ There is no tie to break for this poll.",
    });
  }
  if (!(isAdmin || isPollCreator)) {
    return createResponse({
      ephemeral: true,
      content: "❌ Only the poll creator or a server admin can break a tie.",
    });
  }

  const winnerNominationId = interaction.data?.values?.[0];
  if (!winnerNominationId) {
    // Show options for tie-break
    const tiedOptions = poll.results.tiedNominations.map((nom) => ({
      label: nom.title + (nom.author ? ` by ${nom.author}` : ""),
      value: String(nom.id),
      description: nom.link || undefined,
    }));

    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: "Select the winner from the tied nominations below.",
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: `tie_break_${poll.id}`,
                  options: tiedOptions,
                  placeholder: "Select winner",
                  min_values: 1,
                  max_values: 1,
                },
              ],
            },
          ],
          flags: 64,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Find the selected winner
  const winnerNom = poll.results.tiedNominations.find(
    (nom) => String(nom.id) === String(winnerNominationId),
  );
  if (!winnerNom) {
    return createResponse({
      ephemeral: true,
      content: "❌ Selected winner is not among the tied nominations.",
    });
  }

  // Update poll results in DB
  try {
    // Overwrite winner in results and remove tie
    const newResults = {
      ...poll.results,
      winner: winnerNom,
      tie: false,
      tiedNominations: [],
    };
    await pollManager.updatePoll(poll.id, {
      results: newResults,
    });
    const updatedPoll = await pollManager.getPoll(poll.id);

    // Announce to channel
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          embeds: [
            formatResults(updatedPoll, { heading: "Tie broken by Dottie" }),
          ],
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return createResponse({
      ephemeral: true,
      content: `❌ Failed to resolve tie: ${error.message}`,
    });
  }
}
