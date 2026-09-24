run_codex() {
  local bundled_cli
  if command -v codex >/dev/null 2>&1; then
    command codex "$@"
    return
  fi
  for bundled_cli in \
    /Applications/ChatGPT.app/Contents/Resources/codex \
    /Applications/Codex.app/Contents/Resources/codex \
    "$HOME/Applications/ChatGPT.app/Contents/Resources/codex" \
    "$HOME/Applications/Codex.app/Contents/Resources/codex"; do
    if [ -x "$bundled_cli" ]; then
      "$bundled_cli" "$@"
      return
    fi
  done
  echo "Codex CLI not found on PATH or in the ChatGPT/Codex app bundles. Install the app in /Applications and retry." >&2
  return 127
}
