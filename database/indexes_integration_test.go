//go:build integration
// +build integration

package database

import (
	"context"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

// setupIndexesTestDB 复用 services 包相同的 setupTestDB 策略：
// 尝试连接本地 MongoDB；不可达则 t.Skip。
func setupIndexesTestDB(t *testing.T) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// 用现有 Client（如果 InitMongoDB 已运行），否则新建
	if Client == nil {
		t.Skipf("MongoDB Client is nil; please run with main.go bootstrap or wire up client first")
	}
	if err := Client.Ping(ctx, nil); err != nil {
		t.Skipf("MongoDB ping failed: %v", err)
	}
	DB = Client.Database("cmdb_indexes_test")

	t.Cleanup(func() {
		dropCtx, dropCancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer dropCancel()
		_ = DB.Drop(dropCtx)
	})
}

// TestEnsureIndexes_Idempotent 验证 EnsureIndexes 可重复调用且不报错
// 同时验证目标索引名都真实存在于 MongoDB 中。
func TestEnsureIndexes_Idempotent(t *testing.T) {
	setupIndexesTestDB(t)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 第一次调用
	if err := EnsureIndexes(ctx, DB); err != nil {
		t.Fatalf("first EnsureIndexes: %v", err)
	}

	// 第二次调用（必须幂等）
	if err := EnsureIndexes(ctx, DB); err != nil {
		t.Fatalf("second EnsureIndexes (idempotent): %v", err)
	}

	// 验证至少几个关键索引存在
	wantIndexes := map[string][]string{
		"resources":          {"idx_resources_model", "idx_resources_unique_id", "idx_resources_name", "idx_resources_tags", "idx_resources_data_text"},
		"relation_instances": {"idx_ri_relation_from", "idx_ri_relation_to", "idx_ri_from_relation", "idx_ri_to_relation"},
		"models":             {"idx_models_identify_uniq"},
		"fields":             {"idx_fields_model_group_sort"},
		"model_groups":       {"idx_groups_category_sort"},
	}

	for coll, wantNames := range wantIndexes {
		cur, err := DB.Collection(coll).Indexes().List(ctx)
		if err != nil {
			t.Fatalf("list indexes on %s: %v", coll, err)
		}
		var got []bson.M
		if err := cur.All(ctx, &got); err != nil {
			t.Fatalf("decode indexes: %v", err)
		}
		gotNames := make(map[string]bool)
		for _, idx := range got {
			if n, ok := idx["name"].(string); ok {
				gotNames[n] = true
			}
		}
		for _, name := range wantNames {
			if !gotNames[name] {
				t.Errorf("collection %s missing index %q (have: %v)", coll, name, gotNames)
			}
		}
	}
}
