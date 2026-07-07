---
name: safe-git-workflow
description: Automates a safe Git workflow to prevent PR conflicts and CI failures. Use this before pushing any code to the remote repository.
---

# Safe Git Workflow Skill

You have been invoked to perform a safe Git push and PR creation workflow.
Never perform a raw `git push` without running this checklist first.

## Instructions

1. **Verify Local Status**:
   - Run `git status` to ensure all changes are committed.
   - If there are uncommitted changes, abort and ask the user if they want to commit them first.

2. **Fetch and Check Conflicts**:
   - Run `git fetch origin main` (or the equivalent target default branch).
   - Run `git merge origin/main --no-commit --no-ff`.
   - If conflicts exist, they will appear in the working tree. Use your file editing tools to resolve the conflicts cleanly.
   - Once resolved, run `git commit -m "chore: merge main and resolve conflicts"`.
   - If no conflicts exist or if it says "Already up to date", abort the merge if necessary (`git merge --abort`) and proceed to step 3.

3. **Run Validations**:
   - For Node.js/frontend projects, run `pnpm run lint` and `pnpm run format` (or their `npm`/`yarn` equivalents).
   - For Python backend projects, run `uv run ruff format --check src/ tests/` (or equivalent formatter) and `uv run ruff check src/ tests/` or simply `make check` if a Makefile exists.
   - If the project has tests, run them (e.g. `pnpm run test`, `pytest`, `make test`).
   - If any of these validations fail, STOP. Read the errors, fix the code locally, run formatters to auto-fix styling issues (e.g., `uv run ruff format src/ tests/`), create a new commit using Conventional Commits, and restart the validations.

4. **Push and PR**:
   - Once all validations pass locally, you are authorized to run `git push`.
   - If requested, you can now use the `create_pull_request` tool (from the github MCP server) to open the PR.
