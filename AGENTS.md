# Agent guidelines

- Prefix commit messages with a gitmoji and a short imperative summary, e.g. `🐛 Fix GitHub login` or `📝 Update setup docs`.
- Never commit, print, log, or expose credentials, tokens, or secrets. Keep real values in ignored `.env` files; use placeholders in examples and documentation.
- Keep OAuth client secrets and JWT secrets on the backend. Anything in frontend code or `VITE_*` variables is public.
- Keep changes focused. Preserve existing user edits and include only task-related changes in commits.
- Run checks appropriate to the change and report their results, including anything you could not verify.
- Do not commit dependencies, build output, local databases, logs, or generated vendor assets.
