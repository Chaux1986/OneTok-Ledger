#!/bin/bash
set -e

echo "Logging in..."
curl -s -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@onetok.com.pg","password":"Admin1234!"}' > /dev/null

SESSION=$(grep session /tmp/cookies.txt | awk '{print $7}')

echo ""
echo "=== TRIAL BALANCE ==="
curl -s http://localhost:3000/api/v1/accounting/trial-balance \
  -b "session=$SESSION" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
for a in d['accounts']:
    if a['trialDebit']>0 or a['trialCredit']>0:
        print(f\"{a['code']:6} {a['name']:<40} Dr:{a['trialDebit']:>12.2f}  Cr:{a['trialCredit']:>12.2f}\")
print(f\"{'TOTAL':<48} Dr:{d['totalDebit']:>12.2f}  Cr:{d['totalCredit']:>12.2f}\")
print('Balanced:', d['isBalanced'])
"

echo ""
echo "=== INTEGRITY CHECK ==="
curl -s http://localhost:3000/api/v1/accounting/integrity-check \
  -b "session=$SESSION" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Healthy:', d['isHealthy'])
print('Journals checked:', d['totalJournals'])
print('Issues:', d['journalsWithIssues'])
print('Overall balanced:', d['overallBalanced'])
if d['journalsWithIssues'] > 0:
    for p in d['problems']:
        print(f\"  - {p['journalNumber']}: {[i['message'] for i in p['issues']]}\")
"
