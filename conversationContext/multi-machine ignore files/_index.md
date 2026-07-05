# multi-machine ignore files

**Last updated:** 2026-07-05
**Status:** in progress

## Goal

Update `.gitignore` and `.dockerignore` files so the project syncs cleanly across machines (node_modules/dist/env stay local; lock files and templates are committed).

## Decisions

- Commit `package-lock.json` and `.terraform.lock.hcl` for reproducible installs across machines
- Keep `.env` local; commit `.env.example` templates only
- Commit `.dockerignore` files (were wrongly ignored by root `*.dockerignore` rule)

## Done

- Fixed root `.gitignore` (removed package-lock + dockerignore blocks; added tsbuildinfo, uploads, credentials, docker-compose.override)
- Aligned `backend/.gitignore`, `frontend/.gitignore`, `terraform/lambda-deploy/.gitignore`
- Added/updated `.dockerignore` at root, backend, frontend
- Added `frontend/.env.example`

## Open / next

- User should `git add` lock files, dockerignore, `.env.example` and commit when ready

## Files touched

- `.gitignore`, `.dockerignore`
- `backend/.gitignore`, `backend/.dockerignore`
- `frontend/.gitignore`, `frontend/.dockerignore`, `frontend/.env.example`
- `terraform/lambda-deploy/.gitignore`
