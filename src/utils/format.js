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
    {
      name: "📊 Tally Method",
      value:
        poll.tallyMethod === "chris-style" ? "Chris Style" : "Ranked Choice",
      inline: true,
    },
  ];

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
