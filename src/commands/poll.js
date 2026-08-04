import { createPollCommand } from "../interactions/create.js";
import { statusCommand } from "../interactions/status.js";
import { announceCommand } from "../interactions/announce.js";
import { nominateCommand } from "../interactions/nominate.js";
import { listCommand } from "../interactions/list.js";
import { withdrawNominationCommand } from "../interactions/withdraw-nomination.js";
import { voteCommand } from "../interactions/vote.js";
import { addVoteCommand } from "../interactions/add-vote.js";
import { removeNominationCommand } from "../interactions/remove-nomination.js";
import { editNominationCommand } from "../interactions/edit-nomination.js";
import { tieBreakCommand } from "../interactions/tie-break.js";
import { endNominationsCommand } from "../interactions/end-nominations.js";
import { endVotingCommand } from "../interactions/end-voting.js";
import { deletePollCommand } from "../interactions/delete.js";
import { extendCommand } from "../interactions/extend.js";
import { testOobCommand } from "../interactions/test-oob.js";

export const pollCommand = {
  data: {
    name: "poll",
    description: "Manage book polls",
    options: [
      createPollCommand,
      statusCommand,
      announceCommand,
      nominateCommand,
      listCommand,
      withdrawNominationCommand,
      voteCommand,
      addVoteCommand,
      removeNominationCommand,
      editNominationCommand,
      tieBreakCommand,
      endNominationsCommand,
      endVotingCommand,
      deletePollCommand,
      extendCommand,
      testOobCommand,
    ],
  },
};
