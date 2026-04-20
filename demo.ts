/**
 * demo.ts — run this to verify everything works
 *
 * npx tsx demo.ts
 */

import {
  generateKeyPair,
  issueToken,
  verifyToken,
  delegateToken,
} from "./packages/sdk/src/token";

async function main() {
  console.log("=== AgentIdentityToken demo ===\n");

  // ── 1. Generate keys (do this ONCE, save to env vars) ──────────────────
  console.log("1. Generating Ed25519 key pair...");
  const { privateKey, publicKey, privateKeyBase64, publicKeyBase64 } =
    await generateKeyPair();

  console.log("   Private key (store as AGENT_PRIVATE_KEY env var):");
  console.log("  ", privateKeyBase64.slice(0, 40) + "...");
  console.log("   Public key (safe to share as AGENT_PUBLIC_KEY env var):");
  console.log("  ", publicKeyBase64.slice(0, 40) + "...\n");

  // ── 2. Issue a token ────────────────────────────────────────────────────
  console.log("2. Issuing token for an email-reading agent...");
  const issued = await issueToken({
    privateKey,
    issuer_id: "my-registry",
    human_principal: "alice@example.com",
    delegation_scope: ["email:read", "calendar:read", "calendar:write"],
    agent_config: {
      model: "claude-sonnet-4-6",
      system_prompt: "You are a helpful scheduling assistant.",
    },
    ttl_seconds: 900, // 15 minutes
    metadata: {
      environment: "production",
      request_id: "req_abc123",
    },
  });

  console.log("   agent_id:", issued.claims.agent_id);
  console.log("   human_principal:", issued.claims.human_principal);
  console.log("   scopes:", issued.claims.delegation_scope);
  console.log("   expires_at:", issued.expires_at.toISOString());
  console.log("   JWT (first 60 chars):", issued.jwt.slice(0, 60) + "...\n");

  // ── 3. Verify the token ─────────────────────────────────────────────────
  console.log("3. Verifying token...");
  const verified = await verifyToken({
    jwt: issued.jwt,
    publicKey,
    require_scope: "email:read",
  });
  console.log("   Verified! Claims look good.");
  console.log("   issued_at:", verified.issued_at.toISOString(), "\n");

  // ── 4. Scope check failure ──────────────────────────────────────────────
  console.log('4. Trying to verify with scope "payments:initiate" (not granted)...');
  try {
    await verifyToken({
      jwt: issued.jwt,
      publicKey,
      require_scope: "payments:initiate",
    });
  } catch (e: unknown) {
    console.log("   Correctly rejected:", (e as Error).message, "\n");
  }

  // ── 5. Tamper detection ─────────────────────────────────────────────────
  console.log("5. Tampered token detection...");
  const [header, payload, sig] = issued.jwt.split(".");
  const tamperedJwt = `${header}.${payload}TAMPERED.${sig}`;
  try {
    await verifyToken({ jwt: tamperedJwt, publicKey });
  } catch (e: unknown) {
    console.log("   Correctly rejected:", (e as Error).message, "\n");
  }

  // ── 6. Delegation ───────────────────────────────────────────────────────
  console.log("6. Agent A delegating a subset of scopes to Agent B...");
  const delegated = await delegateToken(verified, {
    privateKey,
    issuer_id: "my-registry",
    grant_scopes: ["email:read"], // subset only — calendar:write NOT included
    agent_config: {
      model: "claude-haiku-4-5-20251001",
      system_prompt: "You are a read-only email summarizer.",
    },
    ttl_seconds: 300, // shorter TTL for delegated agents
  });

  console.log("   Delegated agent_id:", delegated.claims.agent_id);
  console.log("   Granted scopes:", delegated.claims.delegation_scope);
  console.log("   Delegation chain length:", delegated.claims.delegation_chain?.length);
  console.log(
    "   Chain:",
    JSON.stringify(delegated.claims.delegation_chain, null, 2)
  );

  // ── 7. Delegation scope enforcement ────────────────────────────────────
  console.log('\n7. Trying to over-delegate (grant "calendar:write" that parent has but B should not get)...');
  // First issue a restricted parent that only has email:read
  const restrictedParent = await issueToken({
    privateKey,
    issuer_id: "my-registry",
    human_principal: "alice@example.com",
    delegation_scope: ["email:read"],
    agent_config: {
      model: "claude-sonnet-4-6",
      system_prompt: "Restricted agent.",
    },
  });
  const restrictedVerified = await verifyToken({
    jwt: restrictedParent.jwt,
    publicKey,
  });

  try {
    await delegateToken(restrictedVerified, {
      privateKey,
      issuer_id: "my-registry",
      grant_scopes: ["email:read", "calendar:write"], // calendar:write not in parent!
      agent_config: {
        model: "claude-haiku-4-5-20251001",
        system_prompt: "Trying to escalate.",
      },
    });
  } catch (e: unknown) {
    console.log("   Correctly rejected:", (e as Error).message);
  }

  console.log("\n=== All checks passed ===");
}

main().catch(console.error);
