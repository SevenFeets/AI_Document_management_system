# skill-router tech-stack mapping

**Last updated:** 2026-06-16
**Status:** idle

## Goal

Map technologies from `tech-stack.mdc` into `skill-router.mdc` (AWS, Docker/K8s, Redux, Terraform, etc.).

## Decisions

- Phase 1 only: expand router table + path hints; no new skill files yet.

## Done

- Expanded routing table in `skill-router.mdc` (deploy, AWS, Redux, queues, ES, monitoring).
- Added file-path hints for Dockerfiles, store/, s3/, queue/, ai/, monitoring/, lambda.
- Cross-reference to `tech-stack.mdc` / `TECH_STACK.md` for package versions.

## Open / next

- Add dedicated `aws-patterns` or `monitoring-patterns` skills only if those areas grow.

## Files touched

- `.cursor/rules/skill-router.mdc`
