// Computes historical stats across completed polls for the hidden /stats
// page: nomination win counts, how often a user's first pick was the eventual
// winner, and how many chris-style points each user cast toward the winner.
//
// Vote rankings have been stored in a couple of different shapes over time
// (nomination ids, 0-based indices into poll.nominations, or
// { nominationId, title, author } objects for ranked-choice), so
// resolveRankingEntryToNomination() tries each interpretation rather than
// assuming one.

function displayNameForUserId(userId, usernameByUserId) {
  if (!userId) return "Unknown";
  if (userId.startsWith("manual_")) {
    return userId.slice("manual_".length);
  }
  return usernameByUserId.get(userId) || userId;
}

function buildUsernameMap(polls) {
  const map = new Map();
  for (const poll of polls) {
    for (const nomination of poll.nominations || []) {
      if (nomination.userId) {
        map.set(nomination.userId, nomination.username || nomination.userId);
      }
    }
  }
  return map;
}

function resolveRankingEntryToNomination(nominations, entry) {
  if (entry === undefined || entry === null) return null;

  if (typeof entry === "object") {
    if (entry.nominationId != null) {
      const byId = nominations.find((n) => n.id === entry.nominationId);
      if (byId) return byId;
    }
    if (entry.title) {
      return nominations.find((n) => n.title === entry.title) || null;
    }
    return null;
  }

  const byId = nominations.find((n) => n.id === entry);
  if (byId) return byId;

  if (Number.isInteger(entry) && entry >= 0 && entry < nominations.length) {
    return nominations[entry];
  }

  return null;
}

function sortDescBy(map, key) {
  return [...map.values()].sort((a, b) => b[key] - a[key]);
}

// Best-to-worst finishing order of nominations for a completed poll, used to
// attribute 2nd/3rd place finishes (in addition to the win) to nominators.
// Chris-style standings are already sorted by points. Ranked-choice has no
// points, so the order is reconstructed from elimination order: the winner
// finishes 1st, the last candidate eliminated finishes 2nd, the
// second-to-last eliminated finishes 3rd, and so on.
function getFinalRankOrder(poll) {
  const winner = poll.results?.winner;
  if (!winner) return [];

  if (poll.tallyMethod === "chris-style" && Array.isArray(poll.results?.standings)) {
    return poll.results.standings.map((standing) => standing.nomination).filter(Boolean);
  }

  if (poll.tallyMethod === "ranked-choice" && Array.isArray(poll.results?.rounds)) {
    const eliminatedInOrder = poll.results.rounds
      .map((round) => round.eliminated)
      .filter(Boolean);
    return [winner, ...eliminatedInOrder.reverse()];
  }

  return [winner];
}

function average(numbers) {
  if (!numbers || numbers.length === 0) return null;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

// Duration (in ms) between `from` and `to`, or null if either timestamp is
// missing/unparseable, or if the result would be negative (which shouldn't
// happen, but timestamps are free-form strings from the DB).
function durationMs(from, to) {
  if (!from || !to) return null;
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return null;
  const diff = toMs - fromMs;
  return diff >= 0 ? diff : null;
}

export function computeStats(polls) {
  const completedPolls = (polls || []).filter(
    (poll) => poll && poll.phase === "completed" && !poll.isTest,
  );
  const usernameByUserId = buildUsernameMap(completedPolls);

  const nominationWinsByUser = new Map(); // userId -> { displayName, wins }
  const nominationPointsByUser = new Map(); // userId -> { displayName, points }
  const firstChoiceByUser = new Map(); // userId -> { displayName, hits, totalVotes }
  const pointsByUser = new Map(); // userId -> { displayName, points }
  const nominationTimingByUser = new Map(); // userId -> { displayName, durationsMs: [] }
  const votingTimingByUser = new Map(); // userId -> { displayName, durationsMs: [] }
  const pollCounts = []; // { id, title, nominationCount, voteCount }

  let pollsWithWinner = 0;

  for (const poll of completedPolls) {
    const winner = poll.results?.winner || null;
    const nominations = poll.nominations || [];
    const votes = poll.votes || [];

    pollCounts.push({
      id: poll.id,
      title: poll.title,
      createdAt: poll.createdAt,
      nominationCount: nominations.length,
      voteCount: votes.length,
    });

    // Nomination phase runs from poll creation to the nomination deadline.
    for (const nomination of nominations) {
      if (!nomination.userId) continue;
      const duration = durationMs(poll.createdAt, nomination.timestamp);
      if (duration === null) continue;
      const displayName = nomination.username || nomination.userId;
      const entry = nominationTimingByUser.get(nomination.userId) || {
        displayName,
        durationsMs: [],
      };
      entry.displayName = displayName;
      entry.durationsMs.push(duration);
      nominationTimingByUser.set(nomination.userId, entry);
    }

    // Seed every nominator in this poll so users with zero wins/points still
    // show up in the "least" end of these tables. pollIds tracks distinct
    // polls nominated in, so the average below is per poll, not per
    // nomination (a user only nominates once per poll under normal use).
    for (const nomination of nominations) {
      if (!nomination.userId) continue;
      if (!nominationWinsByUser.has(nomination.userId)) {
        nominationWinsByUser.set(nomination.userId, {
          displayName: nomination.username || nomination.userId,
          wins: 0,
          second: 0,
          third: 0,
        });
      }
      if (!nominationPointsByUser.has(nomination.userId)) {
        nominationPointsByUser.set(nomination.userId, {
          displayName: nomination.username || nomination.userId,
          points: 0,
          pollIds: new Set(),
        });
      }
      nominationPointsByUser.get(nomination.userId).pollIds.add(poll.id);
    }

    // Chris-style standings carry the points each nomination earned from all
    // voters. Attribute those points to whoever nominated the book.
    if (poll.tallyMethod === "chris-style" && Array.isArray(poll.results?.standings)) {
      for (const standing of poll.results.standings) {
        const nomination = standing.nomination;
        if (!nomination || !nomination.userId) continue;
        const entry = nominationPointsByUser.get(nomination.userId) || {
          displayName: nomination.username || nomination.userId,
          points: 0,
          pollIds: new Set(),
        };
        entry.points += standing.points || 0;
        entry.displayName = nomination.username || entry.displayName;
        entry.pollIds.add(poll.id);
        nominationPointsByUser.set(nomination.userId, entry);
      }
    }

    if (winner) {
      pollsWithWinner += 1;
      const winnerUserId = winner.userId || `nomination-${winner.id}`;
      const entry = nominationWinsByUser.get(winnerUserId) || {
        displayName: winner.username || winnerUserId,
        wins: 0,
        second: 0,
        third: 0,
      };
      entry.wins += 1;
      entry.displayName = winner.username || entry.displayName;
      nominationWinsByUser.set(winnerUserId, entry);

      const [, secondPlace, thirdPlace] = getFinalRankOrder(poll);

      if (secondPlace && secondPlace.userId) {
        const secondEntry = nominationWinsByUser.get(secondPlace.userId) || {
          displayName: secondPlace.username || secondPlace.userId,
          wins: 0,
          second: 0,
          third: 0,
        };
        secondEntry.second += 1;
        secondEntry.displayName = secondPlace.username || secondEntry.displayName;
        nominationWinsByUser.set(secondPlace.userId, secondEntry);
      }

      if (thirdPlace && thirdPlace.userId) {
        const thirdEntry = nominationWinsByUser.get(thirdPlace.userId) || {
          displayName: thirdPlace.username || thirdPlace.userId,
          wins: 0,
          second: 0,
          third: 0,
        };
        thirdEntry.third += 1;
        thirdEntry.displayName = thirdPlace.username || thirdEntry.displayName;
        nominationWinsByUser.set(thirdPlace.userId, thirdEntry);
      }
    }

    // Voting phase runs from the nomination deadline to the voting deadline.
    for (const vote of votes) {
      const displayName = displayNameForUserId(vote.userId, usernameByUserId);
      const rankings = Array.isArray(vote.rankings) ? vote.rankings : [];

      const votingDuration = durationMs(poll.nominationDeadline, vote.timestamp);
      if (votingDuration !== null) {
        const votingEntry = votingTimingByUser.get(vote.userId) || {
          displayName,
          durationsMs: [],
        };
        votingEntry.displayName = displayName;
        votingEntry.durationsMs.push(votingDuration);
        votingTimingByUser.set(vote.userId, votingEntry);
      }

      const firstChoiceEntry = firstChoiceByUser.get(vote.userId) || {
        displayName,
        hits: 0,
        totalVotes: 0,
      };
      firstChoiceEntry.totalVotes += 1;
      firstChoiceEntry.displayName = displayName;

      if (winner) {
        const firstPick = resolveRankingEntryToNomination(
          nominations,
          rankings[0],
        );
        if (firstPick && firstPick.id === winner.id) {
          firstChoiceEntry.hits += 1;
        }
      }
      firstChoiceByUser.set(vote.userId, firstChoiceEntry);

      if (winner && poll.tallyMethod === "chris-style") {
        const position = rankings.findIndex((rankingEntry) => {
          const nomination = resolveRankingEntryToNomination(
            nominations,
            rankingEntry,
          );
          return nomination && nomination.id === winner.id;
        });
        const earnedPoints = position === -1 ? 0 : Math.max(0, 3 - position);
        if (earnedPoints > 0) {
          const pointsEntry = pointsByUser.get(vote.userId) || {
            displayName,
            points: 0,
          };
          pointsEntry.points += earnedPoints;
          pointsEntry.displayName = displayName;
          pointsByUser.set(vote.userId, pointsEntry);
        }
      }
    }
  }

  const firstChoiceAccuracy = [...firstChoiceByUser.values()]
    .map((entry) => ({
      ...entry,
      rate: entry.totalVotes > 0 ? entry.hits / entry.totalVotes : 0,
    }))
    .sort((a, b) => b.hits - a.hits || b.rate - a.rate);

  // One row per user who has ever nominated and/or voted, with how quickly
  // they acted after each phase opened (fastest ever, and average).
  const userIds = new Set([
    ...nominationTimingByUser.keys(),
    ...votingTimingByUser.keys(),
  ]);
  const userTiming = [...userIds]
    .map((userId) => {
      const nominationTiming = nominationTimingByUser.get(userId);
      const votingTiming = votingTimingByUser.get(userId);
      const displayName =
        nominationTiming?.displayName ||
        votingTiming?.displayName ||
        displayNameForUserId(userId, usernameByUserId);

      return {
        displayName,
        earliestNominationMs: nominationTiming
          ? Math.min(...nominationTiming.durationsMs)
          : null,
        avgNominationMs: nominationTiming
          ? average(nominationTiming.durationsMs)
          : null,
        earliestVotingMs: votingTiming
          ? Math.min(...votingTiming.durationsMs)
          : null,
        avgVotingMs: votingTiming ? average(votingTiming.durationsMs) : null,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const nominationPointsReceived = [...nominationPointsByUser.values()]
    .map((entry) => ({
      displayName: entry.displayName,
      totalPoints: entry.points,
      avgPoints: entry.pollIds.size > 0 ? entry.points / entry.pollIds.size : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // Top/bottom 10 polls by nomination count and by vote count. With fewer
  // than 20 polls the top and bottom lists may overlap - that's expected.
  const POLL_LEADERBOARD_SIZE = 10;
  const byNominationCount = [...pollCounts].sort(
    (a, b) => b.nominationCount - a.nominationCount,
  );
  const byVoteCount = [...pollCounts].sort((a, b) => b.voteCount - a.voteCount);

  return {
    totalCompletedPolls: completedPolls.length,
    pollsWithWinner,
    nominationWins: [...nominationWinsByUser.values()].sort(
      (a, b) => b.wins - a.wins || b.second - a.second || b.third - a.third,
    ),
    nominationPointsReceived,
    firstChoiceAccuracy,
    pointsTowardWinner: sortDescBy(pointsByUser, "points"),
    userTiming,
    topPollsByNominations: byNominationCount.slice(0, POLL_LEADERBOARD_SIZE),
    bottomPollsByNominations: [...byNominationCount]
      .reverse()
      .slice(0, POLL_LEADERBOARD_SIZE),
    topPollsByVotes: byVoteCount.slice(0, POLL_LEADERBOARD_SIZE),
    bottomPollsByVotes: [...byVoteCount]
      .reverse()
      .slice(0, POLL_LEADERBOARD_SIZE),
  };
}
