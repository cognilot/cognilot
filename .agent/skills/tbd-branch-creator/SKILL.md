---
name: tbd-branch-creator
description: Use this skill whenever the user provides context about a feature, bug fix, or task they are about to work on and wants to start clean or create a new branch. This skill automates Git branch creation using Trunk-Based Development (TBD) practices. Make sure to use this skill when the user asks to "prepare the repo for work", "create a branch for this context", or mentions they want to start working on a new task and need a branch.
---

# TBD Branch Creator

This skill automates the creation of new Git branches following Trunk-Based Development (TBD) best practices and Conventional Commits. It ensures the local repository is clean, synchronized with the remote main branch, and free of stale branches before starting new work.

## Workflow Instructions

When triggered, execute the following steps strictly in order. If any step fails, stop and inform the user.

### 1. Stash Uncommitted Changes

Before changing branches, ensure the working directory is clean to prevent data loss.

- Run `git status -s` to check for changes.
- If there are uncommitted changes, stash them by running: `git stash push -u -m "Auto-stashed by tbd-branch-creator before branch creation"`
- Inform the user that changes were stashed.

### 2. Detect the Main Branch

Determine if the repository's primary branch is `master` or `main`.

- You can check the local branches (e.g., `git branch --list main` and `git branch --list master`) or the remote default.
- Determine the correct main branch name and use it for the next steps.

### 3. Switch to Main and Sync

Checkout the main branch and pull the latest changes from the remote.

- Run `git checkout <MAIN_BRANCH>`
- Run `git pull origin <MAIN_BRANCH>` (if a remote is configured).

### 4. Delete All Other Local Branches

To enforce Trunk-Based Development and keep the local workspace clean, delete all local branches except the main branch.

- First, ensure you are currently on the main branch.
- Then, delete other branches. (e.g., `git branch | Select-String -NotMatch '^\*|<MAIN_BRANCH>' | ForEach-Object { git branch -D $_.ToString().Trim() }` if on Windows/PowerShell, or the equivalent `grep -v | xargs` in bash). Note: the user is on Windows (PowerShell), so prefer PowerShell-compatible commands or let the agent decide based on environment.
- _Safety Check:_ Do not delete branches if you failed to checkout the main branch.

### 5. Generate and Create the New Branch

Analyze the context provided by the user to determine an appropriate branch name.

- Use Conventional Commits naming conventions: `<type>/<short-description>`.
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
  - Description: short, kebab-case (e.g., `add-jwt-auth`, `header-alignment`).
- Run `git checkout -b <generated-branch-name>`.

### 6. Summary

Once finished, provide the user with a brief summary of the actions taken. For example: "Stashed your previous changes, synced `main`, deleted old local branches, and checked out `feat/add-jwt-auth`."
