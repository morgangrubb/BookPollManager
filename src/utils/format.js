import { formatChrisStyleResults } from "./chrisStyle.js";
import { formatRankedChoiceResults } from "./rankedChoice.js";

export function formatNomination(
  nomination,
  { includeUser = true, includeAuthor = true, includeLink = true } = {},
) {
  if (!nomination) return "Invalid nomination";

  let text = "";

  if (includeLink) {
    text += `[${nomination.title}](${nomination.link})`;
  } else {
    text += nomination.title;
  }

  if (includeAuthor) {
    text += nomination.author ? ` by ${nomination.author}` : "";
  }

  if (includeUser) {
    text += ` (${nomination.username})`;
  }

  return text;
}

export function formatPollFooterLine(poll) {
  // return `Poll ID: ${poll.id}, ${poll.creatorId ? `Created by <@${poll.creatorId}>` : null}`;
  return `Poll ID: ${poll.id}`;
}

export function formatNominations(poll, opts = {}) {
  let nominationsList = "";

  // Show in nomination order
  nominationsList = poll.nominations
    .map((nom, idx) => `${idx + 1}. ${formatNomination(nom, opts)}`)
    .join("\n");

  return nominationsList;
}

export function formatPollFields(poll) {
  const fields = [
    {
      name: "📝 Phase",
      value: poll.phase.charAt(0).toUpperCase() + poll.phase.slice(1),
      inline: true,
    },
  ];

  if (poll.phase === "nomination") {
    fields.push({
      name: "📅 Deadline",
      value: `<t:${Math.floor(new Date(poll.nominationDeadline).getTime() / 1000)}:F>`,
      inline: true,
    });
  } else if (poll.phase === "voting") {
    fields.push({
      name: "📅 Deadline",
      value: `<t:${Math.floor(new Date(poll.votingDeadline).getTime() / 1000)}:F>`,
      inline: true,
    });
  }

  fields.push({
    name: "📊 Tally Method",
    value: poll.tallyMethod === "chris-style" ? "Chris Style" : "Ranked Choice",
    inline: true,
  });

  if (poll.phase === "completed" || poll.phase === "voting") {
    fields.push({
      name: "🗳️ Votes Cast",
      value: poll.results.totalVotes.toString(),
      inline: true,
    });
  }

  return fields;
}

export function formatResults(poll, opts = {}) {
  if (poll.tallyMethod === "chris-style") {
    return formatChrisStyleResults(poll, opts);
  } else if (poll.tallyMethod === "ranked-choice") {
    return formatRankedChoiceResults(poll, opts);
  }
}

export function formatStatus(
  poll,
  { header, showIndexedNominations = false } = {},
) {
  let description = "";

  if (poll.description) {
    description = poll.description;
  }

  // Add phase-specific instructions
  if (poll.phase === "nomination") {
    description += `${description ? "\n\n" : ""}💡 **Use \`/poll nominate\` to nominate a book!**`;
  } else if (poll.phase === "voting") {
    description += `${description ? "\n\n" : ""}💡 **Use \`/poll vote\` to cast your vote!**`;
  }

  if (poll.nominations && poll.nominations.length > 0) {
    if (showIndexedNominations) {
      // Show nominations with index numbers for commands like add-vote
      const indexedList = poll.nominations
        .map((nom, idx) => {
          const number = idx + 1;
          let line = `**${number}.** `;

          if (nom.link) {
            line += `[${nom.title}](${nom.link})`;
          } else {
            line += nom.title;
          }

          if (nom.author) {
            line += ` by ${nom.author}`;
          }

          line += ` (${nom.username})`;

          return line;
        })
        .join("\n");

      description += `${description ? "\n\n" : ""}**📖 Nominations** _(Index numbers for \`/poll add-vote\`)_\n${indexedList}`;
    } else {
      description += `${description ? "\n\n" : ""}**📖 Nominations**\n${formatNominations(poll)}`;
    }
  }

  const embed = {
    title: `📚 ${poll.title}${header ? ` - ${header}` : ""}`,
    description,
    color:
      poll.phase === "completed"
        ? 0x00ff00
        : poll.phase === "voting"
          ? 0xffaa00
          : 0x0099ff,
    fields: formatPollFields(poll),
    footer: { text: formatPollFooterLine(poll) },
    timestamp: new Date().toISOString(),
  };

  if (poll.phase === "completed" || poll.phase === "voting") {
    if (
      poll.phase === "completed" &&
      poll.tallyMethod === "chris-style" &&
      poll.results &&
      poll.results.tie === true &&
      Array.isArray(poll.results.tiedNominations) &&
      poll.results.tiedNominations.length > 1
    ) {
      embed.fields.push({
        name: "⚠️ Tie Detected",
        value:
          "There is a tie for first place that must be resolved by Dottie. Use `/poll tie-break` to select a winner.",
        inline: false,
      });
      embed.fields.push({
        name: "Tied Options",
        value: poll.results.tiedNominations
          .map((nom) => formatNomination(nom))
          .join("\n"),
        inline: false,
      });
    } else if (poll.phase === "completed" && poll.results.winner) {
      embed.fields.push({
        name: "🏆 Winner",
        value: formatNomination(poll.results.winner),
        inline: false,
      });
    }
  }

  return embed;
}
