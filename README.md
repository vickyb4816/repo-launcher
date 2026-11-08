# Repo Launcher

A first MVP for a web product that starts with a GitHub link.

## What it does now

- Accepts a **public GitHub repository** URL.
- Reads real repository metadata and root-level files from GitHub's API.
- Detects common Docker, Node.js, Python, Android, Java, Go, and Rust setup files.
- Shows a launch recommendation without executing untrusted code.

## Run locally

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open the Cloud Shell Web Preview on port 5173.

## Important

This version intentionally does **not** build, run, or deploy supplied repositories. Running arbitrary code requires isolated containers, resource quotas, secrets handling, and safety controls. That is the next backend milestone.
