#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# 1. Start test environment (Docker Compose)
# ------------------------------------------------------------
docker compose up -d

# Wait for Supabase and app to be healthy
echo "Waiting for services to become healthy..."
while ! curl -s http://localhost:3000/api/health 2>/dev/null | grep -q "ok"; do
  sleep 2
done

echo "Services ready. Starting scans..."

# ------------------------------------------------------------
# 2. OWASP ZAP baseline scan (headless)
# ------------------------------------------------------------
zap-baseline.py -t http://localhost:3000 -r zap-report.html || true

# ------------------------------------------------------------
# 3. Brute‑force login (Hydra) – limited sample list
# ------------------------------------------------------------
if [ -f usernames.txt ] && [ -f passwords.txt ]; then
  hydra -L usernames.txt -P passwords.txt -s 3000 -f \
    -M http-post-form "localhost:3000/api/auth/login:username=^USER^&password=^PASS^:Invalid credentials" || true
fi

# ------------------------------------------------------------
# 4. JWT tampering test (Node script)
# ------------------------------------------------------------
node scripts/jwt-tamper-test.js > jwt-tamper.log || true

# ------------------------------------------------------------
# 5. Upload fuzzing (ffuf)
# ------------------------------------------------------------
if [ -f payloads/malicious.csv ]; then
  ffuf -u http://localhost:3000/api/upload \
    -X POST -d @payloads/malicious.csv -H "Content-Type: text/csv" \
    -mc 200,400 -o upload-fuzz.json || true
fi

# ------------------------------------------------------------
# 6. Gather logs & generate summary report
# ------------------------------------------------------------
mkdir -p pen-test-results
cp zap-report.html jwt-tamper.log upload-fuzz.json pen-test-results/ || true

echo "Pen‑test completed. Results stored in ./pen-test-results" > pen-test-results/summary.txt
