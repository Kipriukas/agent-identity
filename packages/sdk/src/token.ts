import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type {
  AgentClaims,
  IssuedToken,
  IssueTokenConfig,
  VerifyConfig,
  VerifiedToken,
} from "./schema";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Derive a stable agent_id from its configuration.
 * Same model + system_prompt + issuer always → same ID.
 * This means you can re-derive and compare without storing the ID separately.
 */
export async function deriveAgentId(
  model: string,
  system_prompt: string,
  issuer_id: string
): Promise<string> {
  const raw = `${model}:${system_prompt}:${issuer_id}`;
  const bytes = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return bufferToHex(hash);
}

/**
 * Generate a fresh Ed25519 key pair.
 * Run this ONCE, export the keys, store them as env vars.
 * Never regenerate in production — you'll invalidate all existing tokens.
 */
export async function generateKeyPair(): Promise<{
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  privateKeyBase64: string;
  publicKeyBase64: string;
}> {
  const pair = await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ]);

  const privateKeyRaw = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  const publicKeyRaw = await crypto.subtle.exportKey("spki", pair.publicKey);

  return {
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    privateKeyBase64: bufferToBase64(privateKeyRaw),
    publicKeyBase64: bufferToBase64(publicKeyRaw),
  };
}

/**
 * Load a private key from a base64-encoded PKCS8 string.
 * Use this to load your key from an env var at startup.
 */
export async function loadPrivateKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("pkcs8", raw, "Ed25519", false, ["sign"]);
}

/**
 * Load a public key from a base64-encoded SPKI string.
 * Safe to embed in verifier services — this is not a secret.
 */
export async function loadPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("spki", raw, "Ed25519", false, ["verify"]);
}

// ─────────────────────────────────────────────
// Core: issueToken
// ─────────────────────────────────────────────

/**
 * Issue a signed AgentIdentityToken.
 *
 * @example
 * const token = await issueToken({
 *   privateKey,
 *   issuer_id: "my-registry",
 *   human_principal: "user@example.com",
 *   delegation_scope: ["email:read", "calendar:write"],
 *   agent_config: { model: "claude-sonnet-4-6", system_prompt: "You are a helpful assistant." },
 * });
 * console.log(token.jwt); // pass this to other agents
 */
export async function issueToken(config: IssueTokenConfig): Promise<IssuedToken> {
  const {
    privateKey,
    issuer_id,
    human_principal,
    delegation_scope,
    ttl_seconds = 900, // 15 minutes default — short TTLs reduce revocation risk
    delegation_chain,
    metadata,
  } = config;

  // Derive agent_id if not provided directly
  let agent_id: string;
  if (config.agent_id) {
    agent_id = config.agent_id;
  } else if (config.agent_config) {
    agent_id = await deriveAgentId(
      config.agent_config.model,
      config.agent_config.system_prompt,
      issuer_id
    );
  } else {
    throw new Error("Either agent_id or agent_config must be provided");
  }

  const now = Math.floor(Date.now() / 1000);
  const expires_at = new Date((now + ttl_seconds) * 1000);

  const claims: AgentClaims = {
    agent_id,
    issuer_id,
    human_principal,
    delegation_scope,
    ...(delegation_chain && { delegation_chain }),
    ...(metadata && { metadata }),
  };

  // Build and sign the JWT
  // jose handles the standard JWT fields (iss, iat, exp, jti)
  // Our custom claims go into the payload alongside them
  const jwt = await new SignJWT(claims as unknown as JWTPayload)
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttl_seconds)
    .setIssuer(issuer_id)
    .setJti(generateNonce()) // unique per token — prevents replay attacks
    .sign(privateKey);

  return { jwt, claims, expires_at };
}

// ─────────────────────────────────────────────
// Core: verifyToken
// ─────────────────────────────────────────────

/**
 * Verify a token and return its claims.
 * Throws a descriptive error if anything is wrong.
 *
 * @example
 * try {
 *   const verified = await verifyToken({ jwt, publicKey });
 *   console.log(verified.claims.human_principal); // "user@example.com"
 *   console.log(verified.claims.delegation_scope); // ["email:read"]
 * } catch (e) {
 *   // Token is invalid, expired, or tampered with
 *   console.error("Rejected:", e.message);
 * }
 */
export async function verifyToken(config: VerifyConfig): Promise<VerifiedToken> {
  const { jwt, publicKey, require_scope, require_principal } = config;

  // Verify signature + expiry — jose throws if either fails
  let payload: JWTPayload;
  try {
    const result = await jwtVerify(jwt, publicKey, {
      algorithms: ["EdDSA"],
    });
    payload = result.payload;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("expired")) throw new Error("Token has expired");
    if (msg.includes("signature")) throw new Error("Token signature is invalid — possible tampering");
    throw new Error(`Token verification failed: ${msg}`);
  }

  // Cast to our claims shape
  const claims = payload as unknown as AgentClaims;

  // Validate required fields are present
  if (!claims.agent_id) throw new Error("Token missing agent_id");
  if (!claims.issuer_id) throw new Error("Token missing issuer_id");
  if (!claims.human_principal) throw new Error("Token missing human_principal");
  if (!Array.isArray(claims.delegation_scope)) throw new Error("Token missing delegation_scope");

  // Optional scope check
  if (require_scope && !claims.delegation_scope.includes(require_scope)) {
    throw new Error(
      `Token does not have required scope "${require_scope}". ` +
      `Has: [${claims.delegation_scope.join(", ")}]`
    );
  }

  // Optional principal check
  if (require_principal && claims.human_principal !== require_principal) {
    throw new Error(
      `Token principal mismatch. Expected "${require_principal}", got "${claims.human_principal}"`
    );
  }

  return {
    claims,
    expires_at: new Date((payload.exp ?? 0) * 1000),
    issued_at: new Date((payload.iat ?? 0) * 1000),
  };
}

// ─────────────────────────────────────────────
// Delegation helper
// ─────────────────────────────────────────────

/**
 * Create a delegated token — Agent A issuing a token for Agent B
 * with a subset of A's scopes.
 *
 * The scope attenuation rule is enforced here:
 * you cannot grant more than you have.
 */
export async function delegateToken(
  parentToken: VerifiedToken,
  config: Omit<IssueTokenConfig, "human_principal" | "delegation_chain" | "delegation_scope"> & {
    grant_scopes: string[];
  }
): Promise<IssuedToken> {
  const { grant_scopes, ...rest } = config;
  const parentScopes = parentToken.claims.delegation_scope;

  // Enforce attenuation — can only grant what you have
  const invalidScopes = grant_scopes.filter((s) => !parentScopes.includes(s));
  if (invalidScopes.length > 0) {
    throw new Error(
      `Cannot grant scopes not in parent token: [${invalidScopes.join(", ")}]. ` +
      `Parent has: [${parentScopes.join(", ")}]`
    );
  }

  // Build the delegation chain
  const existingChain = parentToken.claims.delegation_chain ?? [];
  const newHop = {
    from_agent_id: parentToken.claims.agent_id,
    to_agent_id: rest.agent_id ?? "pending", // resolved in issueToken
    scopes: grant_scopes,
    delegated_at: Math.floor(Date.now() / 1000),
  };

  return issueToken({
    ...rest,
    human_principal: parentToken.claims.human_principal, // principal always passes through
    delegation_scope: grant_scopes,
    delegation_chain: [...existingChain, newHop],
  });
}

// ─────────────────────────────────────────────
// Internal utils
// ─────────────────────────────────────────────

function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(bytes.buffer);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
