---
name: Regieren AI security decisions
description: Security boundaries for the Regieren AI account and Telegram flows.
---

The login alert must never transmit or persist plaintext passwords; it may include account, device, Telegram, and timestamp metadata only.

**Why:** Plaintext password delivery creates avoidable credential exposure even when explicitly requested in an initial product brief.

**How to apply:** Preserve this boundary in future changes to auth alerts, logs, webhooks, and admin tooling.