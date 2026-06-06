package services

import (
	"context"
	"strings"
	"time"

	"cmdb/database"
	"cmdb/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ResourceService struct {
	collection *mongo.Collection
}

func NewResourceService() *ResourceService {
	return &ResourceService{
		collection: database.GetCollection("resources"),
	}
}

func (s *ResourceService) Create(resource *models.Resource) error {
	resource.CreatedAt = time.Now()
	resource.UpdatedAt = time.Now()

	result, err := s.collection.InsertOne(context.Background(), resource)
	if err != nil {
		return err
	}
	resource.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *ResourceService) GetByID(id string) (*models.Resource, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var resource models.Resource
	err = s.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&resource)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

func (s *ResourceService) Update(resource *models.Resource) error {
	resource.UpdatedAt = time.Now()
	_, err := s.collection.ReplaceOne(context.Background(), bson.M{"_id": resource.ID}, resource)
	return err
}

func (s *ResourceService) Delete(id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = s.collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	return err
}

func (s *ResourceService) ListByModel(modelID string, page, pageSize int) ([]*models.Resource, int64, error) {
	objectID, err := primitive.ObjectIDFromHex(modelID)
	if err != nil {
		return nil, 0, err
	}

	skip := int64((page - 1) * pageSize)
	limit := int64(pageSize)

	total, err := s.collection.CountDocuments(context.Background(), bson.M{"model_id": objectID})
	if err != nil {
		return nil, 0, err
	}

	cursor, err := s.collection.Find(context.Background(),
		bson.M{"model_id": objectID},
		options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.D{{Key: "create_at", Value: -1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(context.Background())

	var resources []*models.Resource
	if err := cursor.All(context.Background(), &resources); err != nil {
		return nil, 0, err
	}

	return resources, total, nil
}

func (s *ResourceService) CountByModel(modelID string) (int64, error) {
	objectID, err := primitive.ObjectIDFromHex(modelID)
	if err != nil {
		return 0, err
	}
	return s.collection.CountDocuments(context.Background(), bson.M{"model_id": objectID})
}

// Search 全文搜索
func (s *ResourceService) Search(keyword string, page, pageSize int) ([]*models.Resource, int64, error) {
	skip := int64((page - 1) * pageSize)
	limit := int64(pageSize)

	// 使用正则表达式搜索
	filter := bson.M{
		"$or": []bson.M{
			{"data": bson.M{"$regex": keyword, "$options": "i"}},
		},
	}

	total, err := s.collection.CountDocuments(context.Background(), filter)
	if err != nil {
		return nil, 0, err
	}

	cursor, err := s.collection.Find(context.Background(),
		filter,
		options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.D{{Key: "create_at", Value: -1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(context.Background())

	var resources []*models.Resource
	if err := cursor.All(context.Background(), &resources); err != nil {
		return nil, 0, err
	}

	return resources, total, nil
}

// SearchByKeyword 全局搜索
func (s *ResourceService) SearchByKeyword(keyword string) ([]map[string]interface{}, error) {
	if keyword == "" {
		return nil, nil
	}

	// 获取所有模型
	modelService := NewModelService()
	models, err := modelService.List()
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}

	for _, model := range models {
		filter := bson.M{
			"model_id": model.ID,
			"$or": []bson.M{
				{"data": bson.M{"$regex": keyword, "$options": "i"}},
			},
		}

		cursor, err := s.collection.Find(context.Background(), filter, options.Find().SetLimit(10))
		if err != nil {
			continue
		}

		var resources []*models.Resource
		if err := cursor.All(context.Background(), &resources); err != nil {
			cursor.Close(context.Background())
			continue
		}
		cursor.Close(context.Background())

		for _, r := range resources {
			results = append(results, map[string]interface{}{
				"id":            r.ID.Hex(),
				"model_id":      r.ModelID.Hex(),
				"model_name":    model.Name,
				"model_identify": model.Identify,
				"data":          r.Data,
			})
		}
	}

	return results, nil
}

// GetByRelation 根据关系获取资源
func (s *ResourceService) GetByRelation(targetModelID string, resourceID string) ([]*models.Resource, error) {
	objectID, err := primitive.ObjectIDFromHex(resourceID)
	if err != nil {
		return nil, err
	}

	targetOID, err := primitive.ObjectIDFromHex(targetModelID)
	if err != nil {
		return nil, err
	}

	filter := bson.M{
		"model_id": targetOID,
		"relations": bson.M{
			"$in": []primitive.ObjectID{objectID},
		},
	}

	cursor, err := s.collection.Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var resources []*models.Resource
	if err := cursor.All(context.Background(), &resources); err != nil {
		return nil, err
	}

	return resources, nil
}

// AddTag 添加标签
func (s *ResourceService) AddTag(resourceID string, tagID primitive.ObjectID) error {
	objectID, err := primitive.ObjectIDFromHex(resourceID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$addToSet": bson.M{"tags": tagID},
		"$set":      bson.M{"modify_at": time.Now()},
	}

	_, err = s.collection.UpdateOne(context.Background(), bson.M{"_id": objectID}, update)
	return err
}

// RemoveTag 移除标签
func (s *ResourceService) RemoveTag(resourceID string, tagID primitive.ObjectID) error {
	objectID, err := primitive.ObjectIDFromHex(resourceID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$pull": bson.M{"tags": tagID},
		"$set":   bson.M{"modify_at": time.Now()},
	}

	_, err = s.collection.UpdateOne(context.Background(), bson.M{"_id": objectID}, update)
	return err
}

// CreateRelation 创建关系
func (s *ResourceService) CreateRelation(resourceID, relationIdentify string, targetIDs []primitive.ObjectID) error {
	objectID, err := primitive.ObjectIDFromHex(resourceID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{"modify_at": time.Now()},
	}

	if len(targetIDs) > 0 {
		update["$addToSet"] = bson.M{"relations." + relationIdentify: bson.M{"$each": targetIDs}}
	}

	_, err = s.collection.UpdateOne(context.Background(), bson.M{"_id": objectID}, update)
	return err
}

// DeleteRelation 删除关系
func (s *ResourceService) DeleteRelation(resourceID, relationIdentify string, targetIDs []primitive.ObjectID) error {
	objectID, err := primitive.ObjectIDFromHex(resourceID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$pull": bson.M{"relations." + relationIdentify: bson.M{"$in": targetIDs}},
		"$set":   bson.M{"modify_at": time.Now()},
	}

	_, err = s.collection.UpdateOne(context.Background(), bson.M{"_id": objectID}, update)
	return err
}

// ========== Tag Service ==========

type TagService struct {
	keyCollection   *mongo.Collection
	valueCollection *mongo.Collection
}

func NewTagService() *TagService {
	return &TagService{
		keyCollection:   database.GetCollection("tag_keys"),
		valueCollection: database.GetCollection("tag_values"),
	}
}

func (s *TagService) CreateTagKey(key *models.TagKey) error {
	key.CreatedAt = time.Now()
	key.UpdatedAt = time.Now()

	result, err := s.keyCollection.InsertOne(context.Background(), key)
	if err != nil {
		return err
	}
	key.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *TagService) GetTagKeyByID(id string) (*models.TagKey, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var key models.TagKey
	err = s.keyCollection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&key)
	if err != nil {
		return nil, err
	}
	return &key, nil
}

func (s *TagService) UpdateTagKey(key *models.TagKey) error {
	key.UpdatedAt = time.Now()
	_, err := s.keyCollection.ReplaceOne(context.Background(), bson.M{"_id": key.ID}, key)
	return err
}

func (s *TagService) DeleteTagKey(id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	// 检查是否有标签值
	count, err := s.valueCollection.CountDocuments(context.Background(), bson.M{"tag_key_id": objectID})
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("cannot delete tag key with tag values")
	}

	_, err = s.keyCollection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	return err
}

func (s *TagService) ListTagKeys() ([]*models.TagKey, error) {
	cursor, err := s.keyCollection.Find(context.Background(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var keys []*models.TagKey
	if err := cursor.All(context.Background(), &keys); err != nil {
		return nil, err
	}
	return keys, nil
}

func (s *TagService) CreateTagValue(value *models.TagValue) error {
	value.CreatedAt = time.Now()
	value.UpdatedAt = time.Now()

	result, err := s.valueCollection.InsertOne(context.Background(), value)
	if err != nil {
		return err
	}
	value.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *TagService) GetTagValueByID(id string) (*models.TagValue, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var value models.TagValue
	err = s.valueCollection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&value)
	if err != nil {
		return nil, err
	}
	return &value, nil
}

func (s *TagService) UpdateTagValue(value *models.TagValue) error {
	value.UpdatedAt = time.Now()
	_, err := s.valueCollection.ReplaceOne(context.Background(), bson.M{"_id": value.ID}, value)
	return err
}

func (s *TagService) DeleteTagValue(id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	// 检查是否有关联资源
	value, err := s.GetTagValueByID(id)
	if err != nil {
		return err
	}
	if len(value.Resources) > 0 {
		return errors.New("cannot delete tag value with associated resources")
	}

	_, err = s.valueCollection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	return err
}

func (s *TagService) ListTagValuesByKey(keyID string) ([]*models.TagValue, error) {
	objectID, err := primitive.ObjectIDFromHex(keyID)
	if err != nil {
		return nil, err
	}

	cursor, err := s.valueCollection.Find(context.Background(), bson.M{"tag_key_id": objectID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var values []*models.TagValue
	if err := cursor.All(context.Background(), &values); err != nil {
		return nil, err
	}
	return values, nil
}

func (s *TagService) BindResource(tagValueID string, resourceIDs []primitive.ObjectID) error {
	objectID, err := primitive.ObjectIDFromHex(tagValueID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$addToSet": bson.M{"resources": bson.M{"$each": resourceIDs}},
		"$set":      bson.M{"modify_at": time.Now()},
	}

	_, err = s.valueCollection.UpdateOne(context.Background(), bson.M{"_id": objectID}, update)
	return err
}

func (s *TagService) UnbindResource(tagValueID string, resourceIDs []primitive.ObjectID) error {
	objectID, err := primitive.ObjectIDFromHex(tagValueID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$pull": bson.M{"resources": bson.M{"$in": resourceIDs}},
		"$set":   bson.M{"modify_at": time.Now()},
	}

	_, err = s.valueCollection.UpdateOne(context.Background(), bson.M{"_id": objectID}, update)
	return err
}

func (s *TagService) SearchByTag(tagKeyID, tagValueID string) ([]*models.Resource, error) {
	tagValue, err := s.GetTagValueByID(tagValueID)
	if err != nil {
		return nil, err
	}

	resourceService := NewResourceService()
	var resources []*models.Resource

	for _, resourceID := range tagValue.Resources {
		r, err := resourceService.GetByID(resourceID.Hex())
		if err != nil {
			continue
		}
		resources = append(resources, r)
	}

	return resources, nil
}

// ========== Relation Service ==========

type RelationService struct {
	collection *mongo.Collection
}

func NewRelationService() *RelationService {
	return &RelationService{
		collection: database.GetCollection("relations"),
	}
}

func (s *RelationService) Create(relation *models.Relation) error {
	relation.CreatedAt = time.Now()

	result, err := s.collection.InsertOne(context.Background(), relation)
	if err != nil {
		return err
	}
	relation.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *RelationService) GetByID(id string) (*models.Relation, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var relation models.Relation
	err = s.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&relation)
	if err != nil {
		return nil, err
	}
	return &relation, nil
}

func (s *RelationService) Update(relation *models.Relation) error {
	_, err := s.collection.ReplaceOne(context.Background(), bson.M{"_id": relation.ID}, relation)
	return err
}

func (s *RelationService) Delete(id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = s.collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	return err
}

func (s *RelationService) ListByModel(modelID string) ([]*models.Relation, error) {
	objectID, err := primitive.ObjectIDFromHex(modelID)
	if err != nil {
		return nil, err
	}

	cursor, err := s.collection.Find(context.Background(), bson.M{"model_id": objectID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var relations []*models.Relation
	if err := cursor.All(context.Background(), &relations); err != nil {
		return nil, err
	}
	return relations, nil
}

// ========== Helper ==========

// ListAllModels 获取所有模型（用于下拉选择）
func ListAllModels() ([]map[string]string, error) {
	modelService := NewModelService()
	models, err := modelService.List()
	if err != nil {
		return nil, err
	}

	var result []map[string]string
	for _, m := range models {
		result = append(result, map[string]string{
			"id":   m.ID.Hex(),
			"name": m.Name,
			"identify": m.Identify,
		})
	}
	return result, nil
}

// GetModelDetails 获取模型详情（包含字段分组和字段）
func GetModelDetails(modelID string) (map[string]interface{}, error) {
	modelService := NewModelService()
	fieldGroupService := NewFieldGroupService()
	fieldService := NewFieldService()
	relationService := NewRelationService()

	model, err := modelService.GetByID(modelID)
	if err != nil {
		return nil, err
	}

	fieldGroups, err := fieldGroupService.ListByModel(modelID)
	if err != nil {
		return nil, err
	}

	// 获取每个字段分组的字段
	type FieldWithGroup struct {
		Group  *models.FieldGroup
		Fields []*models.Field
	}

	var groupsWithFields []FieldWithGroup
	for _, fg := range fieldGroups {
		fields, err := fieldService.ListByFieldGroup(fg.ID.Hex())
		if err != nil {
			continue
		}
		groupsWithFields = append(groupsWithFields, FieldWithGroup{
			Group:  fg,
			Fields: fields,
		})
	}

	// 获取关系定义
	relations, _ := relationService.ListByModel(modelID)

	return map[string]interface{}{
		"model":     model,
		"groups":    groupsWithFields,
		"relations": relations,
	}, nil
}
