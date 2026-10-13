#!/bin/bash
# proto — setup script for the Claude Code cloud environment.
#
# Canonical copy of the script pasted into claude.ai/code → environment → Edit → "Setup script".
# Runs as root before Claude Code starts. If it finishes within ~5 minutes the resulting
# filesystem is cached (~7 days), so later sessions skip it.
# Must always exit 0: a non-zero exit prevents the session from starting.
# See docs/setup/environment-audit.md for the rationale behind every step.
set -u

log() { echo "[proto-setup] $*"; }

# 1) pnpm pinned to the version declared in package.json "packageManager" (Phase 3+).
PNPM_VERSION=10.28.0
if [ "$(pnpm --version 2>/dev/null)" != "$PNPM_VERSION" ]; then
  npm install -g "pnpm@${PNPM_VERSION}" >/dev/null 2>&1 || log "WARN: pnpm ${PNPM_VERSION} not installed"
fi

# 2) gitleaks for the lefthook pre-commit secret scan (Phase 4), verified by SHA-256.
GITLEAKS_VERSION=8.30.1
GITLEAKS_SHA256=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb
if ! command -v gitleaks >/dev/null 2>&1; then
  tmp="$(mktemp -d)"
  url="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
  if curl -fsSL -o "$tmp/gitleaks.tgz" "$url" &&
    echo "${GITLEAKS_SHA256}  $tmp/gitleaks.tgz" | sha256sum -c - >/dev/null; then
    tar -xzf "$tmp/gitleaks.tgz" -C /usr/local/bin gitleaks || log "WARN: gitleaks unpack failed"
  else
    log "WARN: gitleaks download or checksum failed"
  fi
  rm -rf "$tmp"
fi

# 3) Warm the pnpm store from the lockfile when the repo is already cloned (Phase 3+),
#    so the SessionStart hook's `pnpm install --frozen-lockfile` is fast.
for lock in /home/user/*/pnpm-lock.yaml; do
  if [ -f "$lock" ]; then
    (cd "$(dirname "$lock")" && pnpm fetch >/dev/null 2>&1) || log "WARN: pnpm fetch failed for $lock"
  fi
done

# 4) Playwright browsers are NOT downloaded: Chromium is pre-installed in /opt/pw-browsers
#    and PLAYWRIGHT_BROWSERS_PATH already points there. Only check that it is present.
[ -x /opt/pw-browsers/chromium ] || log "WARN: pre-installed Chromium not found in /opt/pw-browsers"

# Intentionally absent: rclone and any Google credentials — Drive is accessed only from GitHub Actions.
exit 0
