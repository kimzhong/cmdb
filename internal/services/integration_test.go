//go:build integration
// +build integration

package services

import (
	"context"
	"fmt"
	"testing"
	"time"

	"cmdb/config"
	"cmdb/database"
	"cmdb/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var testDBName = fmt.Sprintf("cmdb_test_%d", time.Now().UnixNano())

// setupTestDB 尝试连接本地 MongoDB；不可达时 t.Skip。
func setupTestDB(t *testing.T) {
	t.Helper()
	config.AppConfig = &config.Config{
		MongoDB: config.MongoDBConfig{
			Host:     "localhost",
			Port:     27017,
			Database: testDBName,
		},
	}
	uri := config.AppConfig.MongoDB.GetURI()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Skipf("MongoDB connect failed: %v", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		t.Skipf("MongoDB ping failed: %v", err)
	}
	database.Client = client
	database.DB = client.Database(testDBName)

	t.Cleanup(func() {
		dropCtx, dropCancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer dropCancel()
		_ = database.DB.Drop(dropCtx)
		_ = client.Disconnect(dropCtx)
	})
}

func mustInsertModelGroup(t *testing.T) primitive.ObjectID {
	t.Helper()
	grp := &models.ModelGroup{
		Identify: "test_grp_" + primitive.NewObjectID().Hex(),
		Name:     "测试分组",
		Category: "资产",
	}
	if err := NewModelGroupService().Create(grp); err != nil {
		t.Fatalf("create model group: %v", err)
	}
	return grp.ID
}

// TestModelServiceCreate_AutoCreatesFieldGroups 验证 ModelService.Create
// 会自动建立"基本属性"与"关系属性"两个字段分组，以及"唯一标识"与"名称"两个内置字段。
// 这是 requirement.md 4.1.3 明确要求的行为。
func TestModelServiceCreate_AutoCreatesFieldGroups(t *testing.T) {
	setupTestDB(t)

	groupID := mustInsertModelGroup(t)
	svc := NewModelService()

	model := &models.Model{
		Identify:     "test_model",
		Name:         "测试模型",
		ModelGroupID: groupID,
	}
	if err := svc.Create(model); err != nil {
		t.Fatalf("create model: %v", err)
	}

	// 验证创建了 2 个字段分组
	fieldGroups, err := NewFieldGroupService().ListByModel(model.ID.Hex())
	if err != nil {
		t.Fatalf("list field groups: %v", err)
	}
	if len(fieldGroups) != 2 {
		t.Fatalf("expected 2 field groups, got %d", len(fieldGroups))
	}
	names := map[string]bool{}
	for _, fg := range fieldGroups {
		names[fg.Name] = true
	}
	if !names["基本属性"] || !names["关系属性"] {
		t.Errorf("missing expected field groups, got %v", names)
	}

	// 验证创建了 2 个内置字段（唯一标识 + 名称）
	fields, err := database.GetCollection("fields").CountDocuments(context.Background(),
		bson.M{"model_id": model.ID})
	if err != nil {
		t.Fatal(err)
	}
	if fields != 2 {
		t.Errorf("expected 2 built-in fields, got %d", fields)
	}
}

// TestModelGroupService_DeleteWithModels 应被拒绝
// 验证 requirement.md 4.1.2：分组内有模型则不能删除
func TestModelGroupService_DeleteWithModels(t *testing.T) {
	setupTestDB(t)

	groupID := mustInsertModelGroup(t)
	svc := NewModelService()
	if err := svc.Create(&models.Model{
		Identify:     "m1",
		Name:         "M1",
		ModelGroupID: groupID,
	}); err != nil {
		t.Fatal(err)
	}

	err := NewModelGroupService().Delete(groupID.Hex())
	if err == nil {
		t.Fatal("expected error deleting group with models")
	}
}

// TestTagService_BindUnbindConsistency 验证 tag_values.resources 与
// resources.tags 双向绑定一致性。
// 验证 requirement.md 6.1.3：绑定资源双向同步。
func TestTagService_BindUnbindConsistency(t *testing.T) {
	setupTestDB(t)

	// 准备：1 个 model + 2 个 resource
	groupID := mustInsertModelGroup(t)
	modelSvc := NewModelService()
	model := &models.Model{Identify: "host", Name: "主机", ModelGroupID: groupID}
	if err := modelSvc.Create(model); err != nil {
		t.Fatal(err)
	}
	resSvc := NewResourceService()
	r1 := &models.Resource{ModelID: model.ID, ModelIdentify: "host", Data: bson.M{"ip": "10.0.0.1"}}
	r2 := &models.Resource{ModelID: model.ID, ModelIdentify: "host", Data: bson.M{"ip": "10.0.0.2"}}
	if err := resSvc.Create(r1); err != nil {
		t.Fatal(err)
	}
	if err := resSvc.Create(r2); err != nil {
		t.Fatal(err)
	}

	// 准备：1 个 tag_key + 1 个 tag_value
	tagSvc := NewTagService()
	key := &models.TagKey{Name: "env", Identify: "env"}
	if err := tagSvc.CreateTagKey(key); err != nil {
		t.Fatal(err)
	}
	tv := &models.TagValue{TagKeyID: key.ID, Name: "prod"}
	if err := tagSvc.CreateTagValue(tv); err != nil {
		t.Fatal(err)
	}

	// 绑定 r1, r2
	if err := tagSvc.BindResource(tv.ID.Hex(), []primitive.ObjectID{r1.ID, r2.ID}); err != nil {
		t.Fatalf("bind: %v", err)
	}

	// 验证 tv.Resources 包含 r1+r2
	got, _ := tagSvc.GetTagValueByID(tv.ID.Hex())
	if len(got.Resources) != 2 {
		t.Errorf("tag_value.resources expected 2, got %d", len(got.Resources))
	}

	// 验证 r1.tags 包含 tv.ID
	gr1, _ := resSvc.GetByID(r1.ID.Hex())
	if len(gr1.Tags) != 1 || gr1.Tags[0] != tv.ID {
		t.Errorf("resource r1.tags expected [%s], got %v", tv.ID.Hex(), gr1.Tags)
	}

	// 解绑 r1
	if err := tagSvc.UnbindResource(tv.ID.Hex(), []primitive.ObjectID{r1.ID}); err != nil {
		t.Fatalf("unbind: %v", err)
	}

	// 验证 tv.Resources 只剩 r2
	got, _ = tagSvc.GetTagValueByID(tv.ID.Hex())
	if len(got.Resources) != 1 || got.Resources[0] != r2.ID {
		t.Errorf("after unbind, expected [%s], got %v", r2.ID.Hex(), got.Resources)
	}

	// 验证 r1.tags 已空
	gr1, _ = resSvc.GetByID(r1.ID.Hex())
	if len(gr1.Tags) != 0 {
		t.Errorf("after unbind, resource r1.tags expected empty, got %v", gr1.Tags)
	}
}

// TestResourceService_CRUD 验证基本 CRUD 路径
func TestResourceService_CRUD(t *testing.T) {
	setupTestDB(t)

	groupID := mustInsertModelGroup(t)
	modelSvc := NewModelService()
	model := &models.Model{Identify: "host", Name: "主机", ModelGroupID: groupID}
	if err := modelSvc.Create(model); err != nil {
		t.Fatal(err)
	}

	resSvc := NewResourceService()
	r := &models.Resource{
		ModelID:       model.ID,
		ModelIdentify: "host",
		Data:          bson.M{"ip": "10.0.0.1"},
	}
	if err := resSvc.Create(r); err != nil {
		t.Fatal(err)
	}
	if r.ID.IsZero() {
		t.Fatal("expected non-zero ID after create")
	}

	// GetByID
	got, err := resSvc.GetByID(r.ID.Hex())
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Data["ip"] != "10.0.0.1" {
		t.Errorf("data.ip: got %v want 10.0.0.1", got.Data["ip"])
	}

	// Update
	got.Data["ip"] = "10.0.0.99"
	if err := resSvc.Update(got); err != nil {
		t.Fatal(err)
	}
	got2, _ := resSvc.GetByID(r.ID.Hex())
	if got2.Data["ip"] != "10.0.0.99" {
		t.Errorf("after update: got %v", got2.Data["ip"])
	}

	// ListByModel
	_, total, err := resSvc.ListByModel(model.ID.Hex(), 1, 10)
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 {
		t.Errorf("total: got %d want 1", total)
	}

	// Delete
	if err := resSvc.Delete(r.ID.Hex()); err != nil {
		t.Fatal(err)
	}
	_, err = resSvc.GetByID(r.ID.Hex())
	if err == nil {
		t.Error("expected error fetching deleted resource")
	}
}
