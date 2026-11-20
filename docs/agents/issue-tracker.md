# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments`
- List issues: `gh issue list --state open`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

Infer the repository from the GitHub remote. When a skill says "publish to the issue tracker," create a GitHub issue.

## Pull requests as a triage surface

PRs as a request surface: no.

## Wayfinding operations

The `/wayfinder` skill uses a GitHub map issue with child issues as tickets. Native GitHub issue dependencies are the preferred representation for blocking relationships.
