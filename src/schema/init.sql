-- Cloudflare D1 Database Schema for Discord Book Poll Bot

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    phase TEXT NOT NULL DEFAULT 'nomination',
    tally_method TEXT NOT NULL DEFAULT 'ranked-choice',
    nomination_deadline TEXT NOT NULL,
    voting_deadline TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    results_data TEXT -- JSON string for results
);

-- Nominations table
CREATE TABLE IF NOT EXISTS nominations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    link TEXT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rankings TEXT NOT NULL, -- JSON array of rankings
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    UNIQUE(poll_id, user_id) -- One vote per user per poll
);

-- Temporary voting sessions (for chris-style dropdown selections)
CREATE TABLE IF NOT EXISTS voting_sessions (
    user_key TEXT PRIMARY KEY, -- format: userId_pollId
    poll_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    selections TEXT NOT NULL, -- JSON object with first/second/third choices
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_polls_guild_id ON polls(guild_id);
CREATE INDEX IF NOT EXISTS idx_polls_phase ON polls(phase);
CREATE INDEX IF NOT EXISTS idx_nominations_poll_id ON nominations(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_poll_id ON voting_sessions(poll_id);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_expires ON voting_sessions(expires_at);

-- Cleanup trigger for expired voting sessions
CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions
    AFTER INSERT ON voting_sessions
    BEGIN
        DELETE FROM voting_sessions 
        WHERE expires_at < datetime('now');
    END;