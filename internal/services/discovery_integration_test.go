//go:build integration
// +build integration

package services

import (
	"testing"

	"cmdb/internal/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TestDiscoveryService_CRUD 验证 DiscoveryRule 的增删改查
func TestDiscoveryService_CRUD(t *testing.T) {
	setupTestDB(t)

	// 准备：1 个 model_group + 1 个 model
	groupID := mustInsertModelGroup(t)
	model := &models.Model{Identify: "host", Name: "主机", ModelGroupID: groupID}
	if err := NewModelService().Create(model); err != nil {
		t.Fatal(err)
	}

	svc := NewDiscoveryService()

	// Create
	rule := &models.DiscoveryRule{
		Name:          "主机静态发现",
		Identify:      "host_static_" + primitive.NewObjectID().Hex(),
		TargetModelID: model.ID,
		SourceType:    "static",
		Schedule:      "interval:5m",
		Status:        models.DiscoveryRuleEnabled,
		Config:        map[string]interface{}{"items": []interface{}{}},
	}
	if err := svc.Create(rule); err != nil {
		t.Fatalf("create: %v", err)
	}
	if rule.ID.IsZero() {
		t.Fatal("expected non-zero ID")
	}

	// GetByID
	g, err := svc.GetByID(rule.ID.Hex())
	if err != nil {
		t.Fatal(err)
	}
	if g.Name != "主机静态发现" {
		t.Errorf("expected name 主机静态发现, got %q", g.Name)
	}

	// ListEnabled
	list, err := svc.ListEnabled()
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Errorf("expected 1 enabled rule, got %d", len(list))
	}

	// Update: 关闭规则
	g.Status = models.DiscoveryRuleDisabled
	if err := svc.Update(g); err != nil {
		t.Fatal(err)
	}
	list2, _ := svc.ListEnabled()
	if len(list2) != 0 {
		t.Errorf("after disable, expected 0 enabled rules, got %d", len(list2))
	}

	// RecordRun
	if err := svc.RecordRun(rule.ID.Hex(), models.DiscoveryRunSuccess, "created=2 updated=1"); err != nil {
		t.Fatal(err)
	}
	got, _ := svc.GetByID(rule.ID.Hex())
	if got.LastRunStatus != models.DiscoveryRunSuccess {
		t.Errorf("LastRunStatus expected success, got %q", got.LastRunStatus)
	}
	if got.LastRunMsg != "created=2 updated=1" {
		t.Errorf("LastRunMsg expected %q, got %q", "created=2 updated=1", got.LastRunMsg)
	}
	if got.LastRunAt == nil {
		t.Error("LastRunAt expected non-nil")
	}

	// Delete
	if err := svc.Delete(rule.ID.Hex()); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.GetByID(rule.ID.Hex()); err == nil {
		t.Error("expected error fetching deleted rule")
	}
}

// TestDiscoveryService_IdentifyUnique 校验 identify 唯一性约束
func TestDiscoveryService_IdentifyUnique(t *testing.T) {
	setupTestDB(t)
	groupID := mustInsertModelGroup(t)
	m := &models.Model{Identify: "host", Name: "主机", ModelGroupID: groupID}
	NewModelService().Create(m)
	svc := NewDiscoveryService()
	commonID := "dup_identify_X"
	r1 := &models.DiscoveryRule{
		Name: "rule1", Identify: commonID, TargetModelID: m.ID,
		SourceType: "static", Schedule: "interval:5m", Status: 1,
	}
	r2 := &models.DiscoveryRule{
		Name: "rule2", Identify: commonID, TargetModelID: m.ID,
		SourceType: "static", Schedule: "interval:5m", Status: 1,
	}
	if err := svc.Create(r1); err != nil {
		t.Fatal(err)
	}
	if err := svc.Create(r2); err == nil {
		t.Error("expected error on duplicate identify")
	}
}
