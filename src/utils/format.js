import { formatChrisStyleResults } from "./chrisStyle";
import { formatRankedChoiceResults } from "./rankedChoice";

export function formatNomination(nomination) {
  if (!nomination) return "Invalid nomination";
  return `[${nomination.title} ${nomination.author ? `by ${nomination.author}` : ""}](${nomination.link}) (${nomination.username})`;
}

export function formatPollFooterLine(poll) {
  // return `Poll ID: ${poll.id}, ${poll.creatorId ? `Created by <@${poll.creatorId}>` : null}`;
  return `Poll ID: ${poll.id}`;
}

export function formatNominations(poll) {
  let nominationsList = "";

  // Show in nomination order
  nominationsList = poll.nominations
    .map((nom, idx) => `${idx + 1}. ${formatNomination(nom)}`)
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

export function formatStatus(poll, { header } = {}) {
  const embed = {
    title: `📚 ${poll.title}${header ? ` - ${header}` : ""}`,
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

  if (poll.nominations && poll.nominations.length > 0) {
    embed.fields.push({
      name: "📖 Nominations",
      value: formatNominations(poll),
      inline: false,
    });
  }

  return embed;
}
