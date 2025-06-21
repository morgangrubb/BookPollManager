export const pollCommand = {
  data: {
    name: "poll",
    description: "Manage book polls",
    options: [
      {
        name: "create",
        description: "Create a new book poll",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "title",
            description: "Poll title",
            type: 3, // STRING
            required: true,
          },
          {
            name: "nomination_end",
            description: "Nomination deadline (YYYY-MM-DD HH:MM)",
            type: 3, // STRING
            required: true,
          },
          {
            name: "voting_end",
            description: "Voting deadline (YYYY-MM-DD HH:MM)",
            type: 3, // STRING
            required: true,
          },
          {
            name: "tally_method",
            description: "Voting method",
            type: 3, // STRING
            required: false,
            choices: [
              {
                name: "Ranked Choice (rank all books)",
                value: "ranked-choice",
              },
              { name: "Chris Style (top 3 picks)", value: "chris-style" },
            ],
          },
        ],
      },
      {
        name: "status",
        description: "Check poll status",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "nominate",
        description: "Nominate a book",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "title",
            description: "Book title",
            type: 3, // STRING
            required: true,
          },
          {
            name: "author",
            description: "Book author",
            type: 3, // STRING
            required: true,
          },
          {
            name: "link",
            description: "Link to book (required)",
            type: 3, // STRING
            required: true,
          },
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "list",
        description: "List all polls",
        type: 1, // SUB_COMMAND
      },
      {
        name: "withdraw-nomination",
        description: "Withdraw your nomination from the active poll",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "vote",
        description: "Vote in the active poll",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "remove-nomination",
        description: "Remove a nomination (creator only)",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "nomination_id",
            description: "Nomination ID to remove",
            type: 3, // STRING
            required: true,
          },
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "edit-nomination",
        description: "Edit a nomination (title, author, link)",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "title",
            description: "New book title",
            type: 3, // STRING
            required: false,
          },
          {
            name: "author",
            description: "New book author",
            type: 3, // STRING
            required: false,
          },
          {
            name: "link",
            description: "New link to book",
            type: 3, // STRING
            required: false,
          },
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
          {
            name: "nomination_id",
            description: "Nomination ID (optional, required if you have multiple nominations)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "end-nominations",
        description: "End nomination phase and start voting (creator only)",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "end-voting",
        description: "End voting phase and show results (creator only)",
        type: 1, // SUB_COMMAND
        options: [
          {
            name: "poll_id",
            description:
              "Poll ID (optional - will auto-detect if not provided)",
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: "delete",
        description: "Delete a poll (creator or admin only)",
        type: 1,
        options: [
          {
            name: "poll_id",
            description: "Poll ID to delete",
            type: 3,
            required: true,
          },
          {
            name: "confirm",
            description: 'Type "DELETE" to confirm deletion',
            type: 3,
            required: true,
          },
        ],
      },
    ],
  },
};
