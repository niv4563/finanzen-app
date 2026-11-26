#!/usr/bin/env bash
# Legt das Ergebnis eines Builds im Zweig «ci-status» ab (nur Protokolle des Builds, keine Daten, keine Geheimnisse).
# So lässt sich ein Fehler im Build auch ohne Zugang zu GitHub Actions nachlesen.
set -u
NAME="$1"
OUT="$RUNNER_TEMP/ci-status"
rm -rf "$OUT"; mkdir -p "$OUT"
{
  echo "Build: $NAME"
  echo "Status: ${JOB_STATUS:-unbekannt}"
  echo "Commit: $GITHUB_SHA"
  echo "Lauf: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
  echo "Zeit: $(date -u +%FT%TZ)"
  for f in dist/*.log; do
    [ -f "$f" ] || continue
    echo; echo "===== $f (letzte 150 Zeilen) ====="
    tail -n 150 "$f"
  done
} > "$OUT/report.txt"
cd "$OUT"
git init -q -b ci-status
git config user.name "ci-status"; git config user.email "ci-status@users.noreply.github.com"
REMOTE="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
if git fetch -q --depth 1 "$REMOTE" ci-status 2>/dev/null; then git checkout -q FETCH_HEAD -- . 2>/dev/null || true; fi
mkdir -p ci; mv report.txt "ci/$NAME.txt"
git add "ci/$NAME.txt"
git commit -q -m "Build-Ergebnis $NAME ($GITHUB_SHA)" || exit 0
git push -q "$REMOTE" HEAD:ci-status --force || echo "Ergebnis konnte nicht abgelegt werden"
