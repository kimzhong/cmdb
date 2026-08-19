package services

import (
	"context"
	"errors"
	"time"

	"cmdb/database"
	"cmdb/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// DiscoveryService 自动发现规则服务（Phase 3）
type DiscoveryService struct {
	collection *mongo.Collection
}

func NewDiscoveryService() *DiscoveryService {
	return &DiscoveryService{
		collection: database.GetCollection("discovery_rules"),
	}
}

func (s *DiscoveryService) Create(rule *models.DiscoveryRule) error {
	if rule.Identify == "" {
		return errors.New("rule.identify is required")
	}
	if rule.Name == "" {
		return errors.New("rule.name is required")
	}
	if rule.TargetModelID.IsZero() {
		return errors.New("rule.target_model_id is required")
	}
	if rule.SourceType == "" {
		return errors.New("rule.source_type is required")
	}
	if rule.Schedule == "" {
		return errors.New("rule.schedule is required")
	}

	// 唯一性约束：identify 全局唯一
	count, err := s.collection.CountDocuments(context.Background(), bson.M{"rule_identify": rule.Identify})
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("rule identify already exists")
	}

	rule.CreatedAt = time.Now()
	rule.UpdatedAt = time.Now()
	if rule.Status == 0 {
		rule.Status = models.DiscoveryRuleEnabled
	}

	res, err := s.collection.InsertOne(context.Background(), rule)
	if err != nil {
		return err
	}
	rule.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *DiscoveryService) GetByID(id string) (*models.DiscoveryRule, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var r models.DiscoveryRule
	if err := s.collection.FindOne(context.Background(), bson.M{"_id": oid}).Decode(&r); err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *DiscoveryService) Update(rule *models.DiscoveryRule) error {
	if rule.ID.IsZero() {
		return errors.New("rule.ID is required")
	}
	rule.UpdatedAt = time.Now()
	_, err := s.collection.ReplaceOne(context.Background(), bson.M{"_id": rule.ID}, rule)
	return err
}

func (s *DiscoveryService) Delete(id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = s.collection.DeleteOne(context.Background(), bson.M{"_id": oid})
	return err
}

func (s *DiscoveryService) List(page, pageSize int) ([]*models.DiscoveryRule, int64, error) {
	skip := int64((page - 1) * pageSize)
	if skip < 0 {
		skip = 0
	}
	limit := int64(pageSize)
	if limit <= 0 {
		limit = 20
	}
	total, err := s.collection.CountDocuments(context.Background(), bson.M{})
	if err != nil {
		return nil, 0, err
	}
	cur, err := s.collection.Find(context.Background(), bson.M{},
		options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.D{{Key: "create_at", Value: -1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(context.Background())
	var out []*models.DiscoveryRule
	if err := cur.All(context.Background(), &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

// ListEnabled 列出所有启用规则（供调度器调用）
func (s *DiscoveryService) ListEnabled() ([]models.DiscoveryRule, error) {
	cur, err := s.collection.Find(context.Background(), bson.M{"status": models.DiscoveryRuleEnabled})
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())
	var out []models.DiscoveryRule
	if err := cur.All(context.Background(), &out); err != nil {
		return nil, err
	}
	return out, nil
}

// RecordRun 记录一次执行结果
func (s *DiscoveryService) RecordRun(ruleID, status, msg string) error {
	oid, err := primitive.ObjectIDFromHex(ruleID)
	if err != nil {
		return err
	}
	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"last_run_at":     now,
			"last_run_status": status,
			"last_run_msg":    msg,
			"modify_at":       now,
		},
	}
	_, err = s.collection.UpdateOne(context.Background(), bson.M{"_id": oid}, update)
	return err
}
