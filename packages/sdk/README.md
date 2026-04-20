# agent-identity-sdk

Signed identity tokens for AI agents. Ed25519 JWTs with delegation chains, scope attenuation, and short TTLs.

## Install

```bash
npm install agent-identity-sdk
```

## Quick start

```ts
import { generateKeyPair, issueToken, verifyToken } from "agent-identity-sdk";

const { privateKey, publicKey } = await generateKeyPair();

const token = await issueToken({
  privateKey,
  issuer_id: "my-registry",
  human_principal: "alice@example.com",
  delegation_scope: ["email:read"],
  agent_config: { model: "claude-sonnet-4-6", system_prompt: "..." },
});

const verified = await verifyToken({ jwt: token.jwt, publicKey });
console.log(verified.claims.human_principal); // "alice@example.com"
```

## Live registry

A hosted registry with registration, verification, revocation, and audit endpoints is running at:

https://agent-identity-blush.vercel.app

Try the interactive demo in your browser — no code required.

## API

- `generateKeyPair()` — create an Ed25519 keypair
- `loadPrivateKey(base64)` / `loadPublicKey(base64)` — load keys from env vars
- `issueToken(config)` — sign a new token
- `verifyToken(config)` — verify signature, expiry, and scopes
- `delegateToken(parent, config)` — delegate a subset of scopes to another agent

## License

MIT
