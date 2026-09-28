#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# The claude-code-config named volume is mounted at $CLAUDE_CONFIG_DIR fresh
# on first container creation — Docker creates that mount point owned by
# root, not the vscode user, so it's unwritable until we fix ownership here
# (postCreateCommand runs as remoteUser, after the mount is already in
# place, so this has to happen every time rather than in the image build).
if [ -n "${CLAUDE_CONFIG_DIR:-}" ]; then
  sudo mkdir -p "$CLAUDE_CONFIG_DIR"
  sudo chown -R "$(id -u):$(id -g)" "$CLAUDE_CONFIG_DIR"
fi

# GIT_USERNAME/GIT_EMAIL come from devcontainer.json's containerEnv — set the
# container's own git identity from them so commits made inside the sandbox
# are attributed correctly without touching the host's global git config.
if [ -n "${GIT_USERNAME:-}" ]; then
  git config --global user.name "$GIT_USERNAME"
fi
if [ -n "${GIT_EMAIL:-}" ]; then
  git config --global user.email "$GIT_EMAIL"
fi
