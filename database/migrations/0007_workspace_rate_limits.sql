CREATE TABLE IF NOT EXISTS workspace_rate_limit (
    workspace_id  TEXT PRIMARY KEY REFERENCES workspace (id) ON DELETE CASCADE,
    window_start  INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);
