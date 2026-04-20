# Agent Identity

Signed identity tokens for AI agents — Ed25519 JWTs with delegation chains and scope attenuation.

[![npm version](https://img.shields.io/npm/v/agent-identity-sdk.svg)](https://www.npmjs.com/package/agent-identity-sdk)
[![license](https://img.shields.io/npm/l/agent-identity-sdk.svg)](./LICENSE)
[![weekly downloads](https://img.shields.io/npm/dw/agent-identity-sdk.svg)](https://www.npmjs.com/package/agent-identity-sdk)

## What it does

- Issues short-lived Ed25519 JWTs that cryptographically bind an AI agent to a human principal and a scoped permission set.
- Supports delegation chains — an agent can hand a subset of its scopes to another agent without talking back to the issuer.
- Ships with a hosted registry (registration, verification, revocation, audit log) so you can plug identity into an existing app without running your own PKI.

## Quick start

```bash
npm install agent-identity-sdk
```

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

## Links

- Live demo: https://agent-identity-blush.vercel.app
- Docs: https://agent-identity-blush.vercel.app/docs
- Dashboard: https://agent-identity-blush.vercel.app/dashboard

## Contributing

Issues and pull requests are welcome. For non-trivial changes, open an issue first to discuss the approach. Run `npm install` at the repo root and `npm run build` inside `packages/sdk` before submitting.

## License

MIT
