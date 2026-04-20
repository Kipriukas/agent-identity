// ─────────────────────────────────────────────
// AgentIdentityToken — schema & types
// ─────────────────────────────────────────────

/**
 * The claims that get signed into the JWT payload.
 * Every field has a reason — nothing optional that shouldn't be.
 */
export interface AgentClaims {
  /**
   * Stable identifier for this agent configuration.
   * Derived by hashing: model + system_prompt + issuer_id
   * so the same logical agent always gets the same ID.
   * Change the system prompt → different agent_id.
   */
  agent_id: string;

  /**
   * Who created this token — your registry's issuer ID.
   * Receivers use this to look up the public key for verification.
   */
  issuer_id: string;

  /**
   * The human user this agent is acting on behalf of.
   * Can be an email, a UUID, or any stable user identifier
   * from your auth system. Never leave this empty —
   * it's the root of your accountability chain.
   */
  human_principal: string;

  /**
   * What this agent is allowed to do.
   * Use colon-namespaced strings: "resource:action"
   * Examples: "email:read", "calendar:write", "payments:initiate"
   * A delegating agent can only grant a subset of its own scopes.
   */
  delegation_scope: string[];

  /**
   * Optional chain of delegation hops if this token was
   * issued by one agent delegating to another.
   * Each entry records who delegated what to whom.
   */
  delegation_chain?: DelegationHop[];

  /**
   * Free-form metadata. Useful for: model name, version,
   * environment (prod/staging), originating request ID.
   * Not part of the trust model — just for debugging.
   */
  metadata?: Record<string, string>;
}

/**
 * One hop in a delegation chain.
 * Agent A delegates to Agent B → one DelegationHop.
 */
export interface DelegationHop {
  /** The agent that delegated */
  from_agent_id: string;
  /** The agent that received the delegation */
  to_agent_id: string;
  /** Which scopes were passed (must be subset of from_agent's scopes) */
  scopes: string[];
  /** Unix timestamp of when this delegation was granted */
  delegated_at: number;
}

/**
 * Full token as it comes back from issueToken().
 * jwt is what you pass around. claims is the decoded version
 * so you don't have to decode it again immediately after issuing.
 */
export interface IssuedToken {
  jwt: string;
  claims: AgentClaims;
  expires_at: Date;
}

/**
 * Config you pass into issueToken().
 */
export interface IssueTokenConfig {
  /** Your Ed25519 private key (generated once, stored as env var) */
  privateKey: CryptoKey;
  /** Your issuer ID — a stable string identifying your registry */
  issuer_id: string;
  /** The human this agent acts on behalf of */
  human_principal: string;
  /** What this agent is allowed to do */
  delegation_scope: string[];
  /** The agent's model + system_prompt + issuer_id, pre-hashed */
  agent_id?: string;
  /** Or pass these raw and agent_id gets derived automatically */
  agent_config?: {
    model: string;
    system_prompt: string;
  };
  /** How long the token is valid. Default: 15 minutes */
  ttl_seconds?: number;
  /** Optional delegation chain from a parent agent */
  delegation_chain?: DelegationHop[];
  /** Optional metadata */
  metadata?: Record<string, string>;
}

/**
 * Config for verifyToken().
 */
export interface VerifyConfig {
  /** The JWT string to verify */
  jwt: string;
  /** Your Ed25519 public key (safe to share / embed in verifiers) */
  publicKey: CryptoKey;
  /** Optional: check that a specific scope is present */
  require_scope?: string;
  /** Optional: check that token was issued for a specific human */
  require_principal?: string;
}

/**
 * Result of a successful verification.
 */
export interface VerifiedToken {
  claims: AgentClaims;
  expires_at: Date;
  issued_at: Date;
}
