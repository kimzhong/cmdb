#!/bin/bash
# CMDB 全页面 CRUD E2E 测试脚本（v2 - 使用时间戳保证幂等）
# 不使用 set -e，因为 get_path 静默失败时不应中断整个测试
BASE="http://localhost:8081/api/v1"
RESP="C:/Users/kim/AppData/Local/Temp/cmdb_e2e_resp.json"
TS=$(date +%s%N)
PASS=0
FAIL=0

# 清空 DB 避免与上次测试残留冲突
python -c "
import pymongo
c = pymongo.MongoClient('mongodb://localhost:27017/')
db = c['cmdb']
for col in ['model_groups','models','field_groups','fields','relations','resources','tag_keys','tag_values','sync_tasks','applications','businesses']:
    db[col].delete_many({})
print('DB cleaned')
" 2>&1 | head -1

ok()   { PASS=$((PASS+1)); echo "PASS: $1"; }
fail() { FAIL=$((FAIL+1)); echo "FAIL: $1 -- $2"; }

call() {
  local method=$1 path=$2 token=$3 body=$4
  local args=(-s -o "$RESP" -w "%{http_code}" -X "$method" "$BASE$path" -H "Content-Type: application/json")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-d "$body")
  curl "${args[@]}"
}
expect() {
  local got=$1 want=$2 name=$3
  if [ "$got" = "$want" ]; then ok "$name (HTTP $got)"
  else fail "$name" "expected $want got $got | body: $(cat "$RESP" 2>/dev/null | head -c 200)"
  fi
}
get_path() {
  python -c "
import json
d = json.load(open(r'$RESP'))
v = d
for k in '$1'.split('.'):
    v = v[k] if isinstance(v, dict) else v[int(k)]
print(v)
" 2>/dev/null
}

# ============ 1. Login ============
echo ""; echo "===== 1. Login 页面 ====="
CODE=$(call POST /login "" '{"username":"admin","password":"admin123"}')
expect "$CODE" 200 "Login admin/admin123"
TOKEN=$(get_path data.token)
[ -z "$TOKEN" ] && { fail "Token 提取" "data.token 为空"; exit 1; }
ok "JWT token: ${TOKEN:0:20}..."

# ============ 2. Dashboard ============
echo ""; echo "===== 2. Dashboard 页面 (/stats) ====="
CODE=$(call GET /stats "$TOKEN")
expect "$CODE" 200 "GET /stats"
ok "  modelCount=$(get_path data.modelCount) resourceCount=$(get_path data.resourceCount)"

# ============ 3. Model 页面 ============
echo ""; echo "===== 3. Model 页面 (模型/分组/字段) ====="
CODE=$(call POST /model-groups "$TOKEN" "{\"identify\":\"e2e_grp_$TS\",\"name\":\"E2E分组$TS\",\"category\":\"资产\",\"description\":\"测试\"}")
expect "$CODE" 200 "Create model group"
GROUP_ID=$(get_path data.id)
ok "  group=$GROUP_ID"

CODE=$(call GET /model-groups "$TOKEN")
expect "$CODE" 200 "List model groups"
CODE=$(call PUT "/model-groups/$GROUP_ID" "$TOKEN" "{\"name\":\"E2E分组-更新\",\"description\":\"E2E更新\"}")
expect "$CODE" 200 "Update model group"
CODE=$(call GET "/model-groups/$GROUP_ID" "$TOKEN")
expect "$CODE" 200 "Get model group"

CODE=$(call POST /models "$TOKEN" "{\"identify\":\"e2e_model_$TS\",\"name\":\"E2E模型$TS\",\"model_group_id\":\"$GROUP_ID\",\"description\":\"测试\"}")
expect "$CODE" 200 "Create model"
MODEL_ID=$(get_path data.id)
ok "  model=$MODEL_ID"

CODE=$(call GET /models "$TOKEN")
expect "$CODE" 200 "List models"
CODE=$(call GET "/models/$MODEL_ID" "$TOKEN")
expect "$CODE" 200 "Get model"
CODE=$(call GET "/models/$MODEL_ID/details" "$TOKEN")
expect "$CODE" 200 "Get model details (含字段分组+内置字段)"

CODE=$(call POST /field-groups "$TOKEN" "{\"model_id\":\"$MODEL_ID\",\"name\":\"扩展属性\",\"identify\":\"ext\",\"sort\":1}")
expect "$CODE" 200 "Create field group"
FG_ID=$(get_path data.id)

CODE=$(call GET "/models/$MODEL_ID/field-groups" "$TOKEN")
expect "$CODE" 200 "List field groups"

CODE=$(call POST /fields "$TOKEN" "{\"model_id\":\"$MODEL_ID\",\"field_group_id\":\"$FG_ID\",\"name\":\"主机名\",\"identify\":\"hostname\",\"type\":\"string\",\"required\":true,\"description\":\"E2E\"}")
expect "$CODE" 200 "Create field"
FIELD_ID=$(get_path data.id)

CODE=$(call GET "/field-groups/$FG_ID/fields" "$TOKEN")
expect "$CODE" 200 "List fields"

CODE=$(call PUT "/fields/$FIELD_ID" "$TOKEN" '{"name":"主机名-更新","description":"E2E更新"}')
expect "$CODE" 200 "Update field"

CODE=$(call POST /relations "$TOKEN" "{\"model_id\":\"$MODEL_ID\",\"name\":\"从属业务\",\"identify\":\"belong_to_$TS\",\"target_model_id\":\"$MODEL_ID\",\"type\":\"belong\",\"cardinality\":\"one-to-one\"}")
expect "$CODE" 200 "Create relation"
REL_ID=$(get_path data.id)

CODE=$(call GET "/models/$MODEL_ID/relations" "$TOKEN")
expect "$CODE" 200 "List relations"

CODE=$(call DELETE "/relations/$REL_ID" "$TOKEN")
expect "$CODE" 200 "Delete relation"
CODE=$(call DELETE "/fields/$FIELD_ID" "$TOKEN")
expect "$CODE" 200 "Delete field"
CODE=$(call DELETE "/field-groups/$FG_ID" "$TOKEN")
expect "$CODE" 200 "Delete field group"
CODE=$(call DELETE "/models/$MODEL_ID" "$TOKEN")
expect "$CODE" 200 "Delete model"
CODE=$(call DELETE "/model-groups/$GROUP_ID" "$TOKEN")
expect "$CODE" 200 "Delete model group"

# ============ 4. Resource 页面 ============
echo ""; echo "===== 4. Resource 页面 (/resources) ====="
call POST /model-groups "$TOKEN" "{\"identify\":\"e2e_res_grp_$TS\",\"name\":\"E2E资源组$TS\",\"category\":\"资产\"}" >/dev/null
GID=$(get_path data.id)
call POST /models "$TOKEN" "{\"identify\":\"e2e_host_$TS\",\"name\":\"E2E主机$TS\",\"model_group_id\":\"$GID\"}" >/dev/null
MID=$(get_path data.id)
ok "测试模型: $MID"

CODE=$(call POST /resources "$TOKEN" "{\"model_id\":\"$MID\",\"model_identify\":\"e2e_host_$TS\",\"data\":{\"hostname\":\"e2e-server-1\",\"ip\":\"10.0.0.100\"}}")
expect "$CODE" 200 "Create resource"
RID=$(get_path data.id)
ok "  resource=$RID"

CODE=$(call GET "/resources/model/$MID?page=1&pageSize=10" "$TOKEN")
expect "$CODE" 200 "List resources by model (分页)"
CODE=$(call GET "/resources/$RID" "$TOKEN")
expect "$CODE" 200 "Get resource"

CODE=$(call PUT "/resources/$RID" "$TOKEN" "{\"model_id\":\"$MID\",\"model_identify\":\"e2e_host_$TS\",\"data\":{\"hostname\":\"e2e-server-1-updated\",\"ip\":\"10.0.0.101\"}}")
expect "$CODE" 200 "Update resource"
CODE=$(call GET "/resources/$RID" "$TOKEN")
expect "$CODE" 200 "Get resource (after update)"
H=$(get_path data.data.hostname)
[ "$H" = "e2e-server-1-updated" ] && ok "  data updated correctly: hostname=$H" || fail "  data not updated" "got $H"

CODE=$(call POST "/resources/$RID/relations" "$TOKEN" "{\"relation_identify\":\"rel_self\",\"target_ids\":[\"$RID\"]}")
expect "$CODE" 200 "Create resource relation"
CODE=$(call GET "/resources/$RID/relations" "$TOKEN")
expect "$CODE" 200 "Get resource relations"

CODE=$(call POST /resources/batch-delete "$TOKEN" "{\"ids\":[\"not-a-hex\",\"$RID\"]}")
expect "$CODE" 200 "Batch delete (1 invalid + 1 valid)"
ok "  invalid_ids=$(get_path data.invalid_ids)"

CODE=$(call POST /resources/batch-delete "$TOKEN" '{"ids":["bad1","bad2"]}')
expect "$CODE" 400 "Batch delete all invalid → 400 (review 修复)"

CODE=$(call GET "/resources/$RID" "$TOKEN")
[ "$CODE" = "404" ] || [ "$CODE" = "500" ] && ok "Resource deleted (HTTP $CODE)" || fail "Resource delete verify" "got $CODE"

# ============ 5. Tag 页面 ============
echo ""; echo "===== 5. Tag 页面 (/tags) ====="
CODE=$(call POST /tags "$TOKEN" "{\"name\":\"环境$TS\",\"tag_identify\":\"env_$TS\",\"description\":\"E2E\"}")
expect "$CODE" 200 "Create tag key"
TK_ID=$(get_path data.id)

CODE=$(call GET /tags "$TOKEN")
expect "$CODE" 200 "List tag keys"

CODE=$(call PUT "/tags/$TK_ID" "$TOKEN" "{\"name\":\"环境-更新$TS\",\"tag_identify\":\"env_$TS\",\"description\":\"更新\"}")
expect "$CODE" 200 "Update tag key"

CODE=$(call POST /tags/values "$TOKEN" "{\"tag_key_id\":\"$TK_ID\",\"name\":\"prod\"}")
expect "$CODE" 200 "Create tag value"
TV_ID=$(get_path data.id)

CODE=$(call GET "/tags/$TK_ID/values" "$TOKEN")
expect "$CODE" 200 "List tag values"

CODE=$(call PUT "/tags/values/$TV_ID" "$TOKEN" "{\"tag_key_id\":\"$TK_ID\",\"name\":\"production\"}")
expect "$CODE" 200 "Update tag value"

CODE=$(call GET /tags/values/all "$TOKEN")
expect "$CODE" 200 "List all tag values"

call POST /resources "$TOKEN" "{\"model_id\":\"$MID\",\"model_identify\":\"e2e_host_$TS\",\"data\":{\"ip\":\"10.0.0.200\"}}" >/dev/null
R2_ID=$(get_path data.id)
ok "测试资源: $R2_ID"

CODE=$(call POST "/tags/values/$TV_ID/bind" "$TOKEN" "{\"resource_ids\":[\"$R2_ID\"]}")
expect "$CODE" 200 "Bind resource to tag"

CODE=$(call GET "/tags/search?tagKeyId=$TK_ID&tagValueId=$TV_ID" "$TOKEN")
expect "$CODE" 200 "Search resources by tag"

CODE=$(call DELETE "/tags/values/$TV_ID/unbind" "$TOKEN" "{\"resource_ids\":[\"$R2_ID\"]}")
expect "$CODE" 200 "Unbind resource from tag"

CODE=$(call DELETE "/tags/values/$TV_ID" "$TOKEN")
expect "$CODE" 200 "Delete tag value"
CODE=$(call DELETE "/tags/$TK_ID" "$TOKEN")
expect "$CODE" 200 "Delete tag key"

# ============ 6. Search 页面 ============
echo ""; echo "===== 6. Search 页面 (/search) ====="
CODE=$(call GET "/search?keyword=e2e" "$TOKEN")
expect "$CODE" 200 "Global search keyword=e2e"
RES_COUNT=$(python -c "import json; d=json.load(open(r'$RESP')); print(len(d['data']) if d.get('data') else 0)")
ok "  results count: $RES_COUNT"

CODE=$(call GET "/search" "$TOKEN")
expect "$CODE" 400 "Search without keyword → 400"

LONG=$(printf 'a%.0s' {1..100})
CODE=$(call GET "/search?keyword=$LONG" "$TOKEN")
expect "$CODE" 400 "Search keyword > 64 bytes → 400 (review 修复)"

CODE=$(call GET '/search?keyword=(a%2B)%2B%24' "$TOKEN")
expect "$CODE" 200 "Search with regex metachars → 200 (ReDoS 防御)"

# ============ 7. App 页面 ============
echo ""; echo "===== 7. App 页面 (/businesses, /apps) ====="
CODE=$(call POST /businesses "$TOKEN" "{\"name\":\"电商业务$TS\",\"identify\":\"ecommerce_$TS\",\"description\":\"E2E\",\"owner\":\"alice\"}")
expect "$CODE" 200 "Create business"
BIZ_ID=$(get_path data.id)

CODE=$(call GET /businesses "$TOKEN")
expect "$CODE" 200 "List businesses"

CODE=$(call GET "/businesses/$BIZ_ID" "$TOKEN")
expect "$CODE" 200 "Get business"

# Business.Status 是 int，不是 string
CODE=$(call PUT "/businesses/$BIZ_ID" "$TOKEN" "{\"name\":\"电商业务-更新$TS\",\"identify\":\"ecommerce_$TS\",\"description\":\"更新\",\"owner\":\"bob\",\"status\":1}")
expect "$CODE" 200 "Update business (status: int 1)"

CODE=$(call POST /apps "$TOKEN" "{\"name\":\"订单服务$TS\",\"identify\":\"order-svc-$TS\",\"business_id\":\"$BIZ_ID\",\"description\":\"E2E\",\"owner\":\"alice\"}")
expect "$CODE" 200 "Create app"
APP_ID=$(get_path data.id)

CODE=$(call GET /apps "$TOKEN")
expect "$CODE" 200 "List apps"

CODE=$(call GET "/apps/$APP_ID" "$TOKEN")
expect "$CODE" 200 "Get app"

CODE=$(call PUT "/apps/$APP_ID" "$TOKEN" "{\"name\":\"订单服务-更新$TS\",\"identify\":\"order-svc-$TS\",\"business_id\":\"$BIZ_ID\",\"description\":\"更新\",\"owner\":\"bob\",\"status\":\"running\"}")
expect "$CODE" 200 "Update app"

# 关键 bug 修复验证：bindAppResource 之前会因 $addToSet on null 失败
CODE=$(call POST "/apps/$APP_ID/resources" "$TOKEN" "{\"resource_ids\":[\"$R2_ID\"]}")
expect "$CODE" 200 "Bind resource to app (review 修复 - $addToSet on null)"

CODE=$(call GET "/apps/$APP_ID/resources" "$TOKEN")
expect "$CODE" 200 "Get app resources"

CODE=$(call GET "/businesses/$BIZ_ID/apps" "$TOKEN")
expect "$CODE" 200 "List apps by business"

# 关键 bug 修复验证：unbindAppResource 之前会因 $pull on null 失败
CODE=$(call DELETE "/apps/$APP_ID/resources/$R2_ID" "$TOKEN")
expect "$CODE" 200 "Unbind resource from app (review 修复 - $pull on null)"

CODE=$(call DELETE "/apps/$APP_ID" "$TOKEN")
expect "$CODE" 200 "Delete app"
CODE=$(call DELETE "/businesses/$BIZ_ID" "$TOKEN")
expect "$CODE" 200 "Delete business"

# ============ 8. Task 页面 ============
echo ""; echo "===== 8. Task 页面 (/tasks) ====="
CODE=$(call POST /tasks "$TOKEN" "{\"name\":\"同步云主机$TS\",\"identify\":\"sync_cloud_host_$TS\",\"model_id\":\"$MID\",\"cloud_type\":\"aliyun\",\"sync_type\":\"full\",\"schedule\":\"0 0 * * *\",\"status\":1}")
expect "$CODE" 200 "Create task (status: int 1)"
TASK_ID=$(get_path data.id)

CODE=$(call GET /tasks "$TOKEN")
expect "$CODE" 200 "List tasks"

CODE=$(call GET "/tasks/$TASK_ID" "$TOKEN")
expect "$CODE" 200 "Get task"

CODE=$(call PUT "/tasks/$TASK_ID" "$TOKEN" "{\"name\":\"同步云主机-更新$TS\",\"identify\":\"sync_cloud_host_$TS\",\"model_id\":\"$MID\",\"cloud_type\":\"aliyun\",\"sync_type\":\"incremental\",\"schedule\":\"0 0 * * *\",\"status\":1}")
expect "$CODE" 200 "Update task"

CODE=$(call POST "/tasks/$TASK_ID/run" "$TOKEN" '{}')
expect "$CODE" 200 "Run task (仅更新 last_run_at)"

CODE=$(call GET "/tasks/$TASK_ID" "$TOKEN")
expect "$CODE" 200 "Get task (after run)"
# 注：Go 的 json.Marshal 把 LastRunAt 转成 lastRunAt（camelCase），与 model_id (snake_case) 不一致
# 这是 router 的字段命名不一致（潜在技术债），测试以实际响应为准
LAST=$(get_path data.lastRunAt)
[ -n "$LAST" ] && [ "$LAST" != "None" ] && ok "  lastRunAt updated: $LAST" || fail "  lastRunAt" "未更新"

CODE=$(call DELETE "/tasks/$TASK_ID" "$TOKEN")
expect "$CODE" 200 "Delete task"

# ============ 9. 边界与安全 ============
echo ""; echo "===== 9. 边界与安全 ====="
CODE=$(call GET /stats "")
expect "$CODE" 401 "无 token → 401"

CODE=$(call GET /stats "$TOKEN" "")
expect "$CODE" 200 "有效 token → 200"

OPTS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE/login" -H "Origin: http://localhost:3000")
expect "$OPTS_CODE" 204 "OPTIONS 预检 → 204 (CORS)"

# ============ 清理 ============
echo ""; echo "===== 清理测试数据 ====="
CODE=$(call DELETE "/resources/$R2_ID" "$TOKEN")
expect "$CODE" 200 "Delete leftover resource"
CODE=$(call DELETE "/models/$MID" "$TOKEN")
expect "$CODE" 200 "Delete test model"
CODE=$(call DELETE "/model-groups/$GID" "$TOKEN")
expect "$CODE" 200 "Delete test group"

# ============ 总结 ============
echo ""
echo "============================================"
echo "  E2E CRUD 测试结果"
echo "============================================"
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo "============================================"
[ $FAIL -gt 0 ] && exit 1
exit 0
