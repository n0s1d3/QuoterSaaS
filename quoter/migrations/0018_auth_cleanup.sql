-- Each authentication cleanup uses these indexes and removes at most 100 rows.
CREATE INDEX IF NOT EXISTS idx_auth_limits_expiry ON auth_limits(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_account_tokens_expiry ON account_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_account_tokens_used ON account_tokens(used_at) WHERE used_at IS NOT NULL;
