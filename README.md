# CrowdWisdom

**CrowdWisdom** is a privacy-preserving platform for anonymously flagging, validating, and addressing misinformation found in news articles, social media posts, and other online content.

The project enables anonymous contributions and validations from a community of curators using zero-knowledge proofs, ensuring censorship resistance and user privacy throughout the process.

CrowdWisdom is inspired by [StealthNote](https://stealthnote.xyz), particularly in its use of ZK proofs derived from JWTs when users "Sign in with Google" via Google Workspace accounts.

👉 Try it out at [**crowdwisdom.xyz**](https://crowdwisdom.xyz)

---

## ✨ Key Features

- **Anonymous Content Flagging**: Users can submit reports about potentially misleading content without revealing their identity.
- **Anonymous Voting**: Validators can upvote or downvote submissions using a lightweight, zero-knowledge voting system built with Noir.
- **ZK-based Identity Verification**: Leverages `stealthnote-jwt` and `noir-jwt` for zero-knowledge proofs of JWT claims, ensuring only eligible (e.g., workspace-authenticated) users participate—without revealing their identity.
- **Semaphore-based Privacy Layer**: Adds an additional anonymity layer using `semaphore-noir` for both curators and validators. Users can prove their membership in curators and validators groups, and send messages (extending from claims to votes) all without revealing their personal identity. (https://github.com/hashcloak/semaphore-noir)
- **Future Plans**: A browser extension for in-context content reporting and a UI overhaul for a more intuitive experience.

---

##  Architecture Overview

CrowdWisdom is built from the following components:

| Component                      | Description                                                           |
| ------------------------------ | --------------------------------------------------------------------- |
| `stealthnote-jwt` & `noir-jwt` | Used for generating ZK proofs of identity from Google Workspace JWTs. |
| `semaphore-noir`               | Provides anonymous credential signaling and voting.                   |
| Custom Voting Logic            | A lightweight zero-knowledge voting protocol built in Noir.           |
| Minimal Backend                | Simplified infrastructure for submission and validation workflows.    |
| Stateless Proof Verification   | Enables client-side generation of verifiable zero-knowledge proofs.   |

> 🔐 Anonymity is central to CrowdWisdom. Both curators (who flag misinformation) and validators (who vote on it) remain anonymous thanks to a double layer of privacy: `stealthnote-jwt` + `semaphore-noir`.

---

---

## ✅ Becoming a Validator

To maintain integrity and prevent spam or manipulation, **CrowdWisdom validators** are currently limited to members of pre-approved organizations.

### 🔐 Current Access

Validators must sign in with Google using a domain from a whitelisted organization. These domains are currently hardcoded in our backend (db) and include:

- `pse.dev`
- `aztec-labs.com`
- `crowdwisdom.xyz`
- `stealthnote.xyz`

If your Google Workspace account belongs to one of these domains, you will be able to participate as a validator after signing in.

### 🔜 Future Plans

We plan to expand validator access by introducing a **claim-based onboarding process**, allowing new trusted organizations and individuals to request inclusion. This process will maintain validator quality while enabling community growth and decentralization.

---

## 🚧 Roadmap

- MVP Web App
- 🛠️ UI/UX Redesign
- 🧩 **Browser Extension** for contextual submissions:
  - Creating identities via Semaphore
  - Storing identity private keys locally
  - Allowing users to join Curators or Validators groups
  - Enabling Curators to flag a URL for misinformation (create a claim)
  - Allowing Validators to cast votes on open claims
  - Displaying completed claims and Curator notes while browsing the web

---

## Getting Started

1. Clone the repository:
```sh
git clone https://github.com/crowd-wisdom/noirhack
cd noirhack/app
```

2. Install dependencies:
```sh
bun install
```

4. Copy .env.example & set env vars:
```sh
cp .env.example .env
```

4. Start the development server:
```sh
bun run dev
```
---

## 🤝 Contributing

We welcome contributions, ideas, and collaboration! Whether you're into zero-knowledge cryptography, UI/UX for anonymous platforms, or information verification, we'd love to hear from you.

---

## 🧠 Credits

CrowdWisdom is inspired by the amazing work of [StealthNote](https://stealthnote.xyz) and built by privacy-maxi builders committed to improving online information integrity without compromising individual anonymity.
