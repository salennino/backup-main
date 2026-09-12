---
name: Groq model availability
description: Keep the assistant's Groq model configuration resilient to provider model retirement.
---

Do not assume the model named in an older setup brief remains available. Keep a currently listed Groq-hosted model as the fallback and surface the provider status in logs without exposing credentials.

**Why:** The originally requested default model was accepted by configuration but rejected because it was no longer present in the provider's current model list.

**How to apply:** When Groq chat starts failing, check `/openai/v1/models` before changing auth code or the webhook path.