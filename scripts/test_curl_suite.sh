#!/usr/bin/env bash
# ==============================================================================
# FoodLab LIMS Backend Curl Verification Suite
# Tests health, security headers, protected route guards, and NoSQL injection
# ==============================================================================

set -u

BASE_URL="${1:-http://127.0.0.1:5000}"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN} FoodLab LIMS Backend API Curl Test Suite${NC}"
echo -e "${CYAN} Target: ${BASE_URL}${NC}"
echo -e "${CYAN}================================================================${NC}\n"

run_test() {
  local test_name="$1"
  local expected_status="$2"
  local curl_cmd="$3"

  local response
  local http_code
  local body

  response=$(eval "$curl_cmd -s -w '\n%{http_code}'")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  # Check if expected_status contains multiple accepted codes separated by pipe (e.g. "401|429")
  local matched=0
  IFS='|' read -ra CODES <<< "$expected_status"
  for code in "${CODES[@]}"; do
    if [ "$http_code" -eq "$code" ]; then
      matched=1
      break
    fi
  done

  if [ "$matched" -eq 1 ]; then
    echo -e " [${GREEN}PASS${NC}] ${test_name}"
    echo -e "        Status: ${http_code} (expected ${expected_status})"
    if [ -n "$body" ]; then
      local truncated_body
      truncated_body=$(echo "$body" | head -c 120)
      echo -e "        Body:   ${truncated_body}..."
    fi
    PASSED=$((PASSED + 1))
  else
    echo -e " [${RED}FAIL${NC}] ${test_name}"
    echo -e "        Status: ${http_code} (expected ${expected_status})"
    echo -e "        Body:   ${body}"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# --- 1. Health & Infrastructure Endpoints ---
echo -e "${YELLOW}--- 1. Health and System Endpoints ---${NC}"

run_test \
  "Health Check (GET /api/health)" \
  200 \
  "curl -X GET '${BASE_URL}/api/health'"

run_test \
  "Unknown Endpoint 404 Handler (GET /api/unknown-xyz)" \
  404 \
  "curl -X GET '${BASE_URL}/api/unknown-xyz'"

# --- 2. NoSQL Operator Injection Guards on /api/auth/login ---
echo -e "${YELLOW}--- 2. NoSQL Injection Guards on /api/auth/login ---${NC}"

run_test \
  "NoSQL Injection: Object (\$ne: null) in email" \
  400 \
  "curl -X POST '${BASE_URL}/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\": {\"\$ne\": null}, \"password\": \"test\"}'"

run_test \
  "NoSQL Injection: Operator (\$gt: '') in email" \
  400 \
  "curl -X POST '${BASE_URL}/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\": {\"\$gt\": \"\"}, \"password\": \"test\"}'"

run_test \
  "NoSQL Injection: Regex (\$regex: '.*') in email" \
  400 \
  "curl -X POST '${BASE_URL}/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\": {\"\$regex\": \".*\"}, \"password\": \"test\"}'"

run_test \
  "Type Guard: Array payload in email" \
  400 \
  "curl -X POST '${BASE_URL}/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\": [\"admin@example.com\"], \"password\": \"test\"}'"

run_test \
  "Type Guard: Integer payload in email" \
  400 \
  "curl -X POST '${BASE_URL}/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\": 12345, \"password\": \"test\"}'"

run_test \
  "Type Guard: Boolean payload in email" \
  400 \
  "curl -X POST '${BASE_URL}/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\": true, \"password\": \"test\"}'"

run_test \
  "Empty JSON Body ({})" \
  400 \
  "curl -X POST '${BASE_URL}/api/auth/login' -H 'Content-Type: application/json' -d '{}'"

run_test \
  "Valid Format Credentials (non-existent email rejection or 429 rate limit)" \
  "401|429" \
  "curl -X POST '${BASE_URL}/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\": \"nobody@acrocsit.in\", \"password\": \"wrongpass123\"}'"

# --- 3. NoSQL Operator Injection Guards on /api/auth/renew-session ---
echo -e "${YELLOW}--- 3. Re-Authentication / Session Renewal Guards ---${NC}"

run_test \
  "Renew Session: NoSQL Injection (\$ne: null) in email" \
  400 \
  "curl -X POST '${BASE_URL}/api/auth/renew-session' -H 'Content-Type: application/json' -d '{\"email\": {\"\$ne\": null}, \"password\": \"test\"}'"

run_test \
  "Renew Session: Operator (\$gt: '') in email" \
  400 \
  "curl -X POST '${BASE_URL}/api/auth/renew-session' -H 'Content-Type: application/json' -d '{\"email\": {\"\$gt\": \"\"}, \"password\": \"test\"}'"

run_test \
  "Renew Session: Non-existent user rejection (or 429 rate limit)" \
  "401|429" \
  "curl -X POST '${BASE_URL}/api/auth/renew-session' -H 'Content-Type: application/json' -d '{\"email\": \"nobody@acrocsit.in\", \"password\": \"wrongpass123\"}'"

# --- 4. Unauthenticated Access Guards on Protected Routes ---
echo -e "${YELLOW}--- 4. Unauthenticated Protected Route Guards ---${NC}"

run_test \
  "Recent Activity Unauthenticated Guard (GET /api/jobs/recent-activity?limit=5)" \
  401 \
  "curl -X GET '${BASE_URL}/api/jobs/recent-activity?limit=5'"

run_test \
  "Recent Activity Invalid Token Guard" \
  401 \
  "curl -X GET '${BASE_URL}/api/jobs/recent-activity?limit=5' -H 'Authorization: Bearer invalid-garbage-token-string'"

run_test \
  "Jobs List Unauthenticated Guard (GET /api/jobs)" \
  401 \
  "curl -X GET '${BASE_URL}/api/jobs'"

run_test \
  "Users List Unauthenticated Guard (GET /api/users)" \
  401 \
  "curl -X GET '${BASE_URL}/api/users'"

run_test \
  "Logs List Unauthenticated Guard (GET /api/logs)" \
  401 \
  "curl -X GET '${BASE_URL}/api/logs'"

# --- 5. Security Headers Check ---
echo -e "${YELLOW}--- 5. Security Headers Verification ---${NC}"

HEADERS=$(curl -s -I "${BASE_URL}/api/health")

if echo "$HEADERS" | grep -qi "x-content-type-options: nosniff"; then
  echo -e " [${GREEN}PASS${NC}] Header present: X-Content-Type-Options: nosniff"
  PASSED=$((PASSED + 1))
else
  echo -e " [${RED}FAIL${NC}] Header missing: X-Content-Type-Options: nosniff"
  FAILED=$((FAILED + 1))
fi

if echo "$HEADERS" | grep -qi "x-frame-options: SAMEORIGIN"; then
  echo -e " [${GREEN}PASS${NC}] Header present: X-Frame-Options: SAMEORIGIN"
  PASSED=$((PASSED + 1))
else
  echo -e " [${RED}FAIL${NC}] Header missing: X-Frame-Options: SAMEORIGIN"
  FAILED=$((FAILED + 1))
fi

echo ""
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN} Test Results Summary: Total $((PASSED + FAILED)) | Passed: ${GREEN}${PASSED}${CYAN} | Failed: ${RED}${FAILED}${CYAN}${NC}"
echo -e "${CYAN}================================================================${NC}"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi

exit 0
