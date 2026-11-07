-- Consumer Clerk users map directly to one personal BRANDCORE workspace.
CREATE TABLE IF NOT EXISTS workspace_user_mapping (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspace (id) ON DELETE RESTRICT,
    user_id      TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    UNIQUE (workspace_id),
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_user_mapping_user
    ON workspace_user_mapping (user_id);
