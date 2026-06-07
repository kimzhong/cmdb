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

type ModelGroupService struct {
	collection *mongo.Collection
}

func NewModelGroupService() *ModelGroupService {
	return &ModelGroupService{
		collection: database.GetCollection("model_groups"),
	}
}

func (s *ModelGroupService) Create(group *models.ModelGroup) error {
	group.CreatedAt = time.Now()
	group.UpdatedAt = time.Now()
	group.Status = 1

	result, err := s.collection.InsertOne(context.Background(), group)
	if err != nil {
		return err
	}
	group.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *ModelGroupService) GetByID(id string) (*models.ModelGroup, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var group models.ModelGroup
	err = s.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&group)
	if err != nil {
		return nil, err
	}
	return &group, nil
}

func (s *ModelGroupService) Update(group *models.ModelGroup) error {
	group.UpdatedAt = time.Now()
	_, err := s.collection.ReplaceOne(context.Background(), bson.M{"_id": group.ID}, group)
	return err
}

func (s *ModelGroupService) Delete(id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	// 检查是否有模型
	modelService := NewModelService()
	count, _ := modelService.CountByGroup(id)
	if count > 0 {
		return errors.New("cannot delete group with models")
	}

	_, err = s.collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	return err
}

func (s *ModelGroupService) List() ([]*models.ModelGroup, error) {
	cursor, err := s.collection.Find(context.Background(), bson.M{}, options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var groups []*models.ModelGroup
	if err := cursor.All(context.Background(), &groups); err != nil {
		return nil, err
	}
	return groups, nil
}

func (s *ModelGroupService) GetByCategory(category string) ([]*models.ModelGroup, error) {
	cursor, err := s.collection.Find(context.Background(), bson.M{"category": category}, options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var groups []*models.ModelGroup
	if err := cursor.All(context.Background(), &groups); err != nil {
		return nil, err
	}
	return groups, nil
}

// ========== Model Service ==========

type ModelService struct {
	collection *mongo.Collection
}

func NewModelService() *ModelService {
	return &ModelService{
		collection: database.GetCollection("models"),
	}
}

func (s *ModelService) Create(model *models.Model) error {
	// 检查标识是否重复
	count, err := s.collection.CountDocuments(context.Background(), bson.M{"model_identify": model.Identify})
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("model identify already exists")
	}

	model.CreatedAt = time.Now()
	model.UpdatedAt = time.Now()
	model.Status = 1

	result, err := s.collection.InsertOne(context.Background(), model)
	if err != nil {
		return err
	}
	model.ID = result.InsertedID.(primitive.ObjectID)

	// 自动创建默认字段分组
	fieldGroupService := NewFieldGroupService()
	fieldGroups := []string{"基本属性", "关系属性"}
	for i, name := range fieldGroups {
		fg := &models.FieldGroup{
			ModelID:  model.ID,
			Name:     name,
			Identify: "basic",
			Sort:     i,
		}
		if i == 1 {
			fg.Identify = "relation"
		}
		fieldGroupService.Create(fg)
	}

	// 创建默认字段
	fieldService := NewFieldService()
	defaultFields := []struct {
		Name     string
		Identify string
		Type     string
		Required bool
	}{
		{"唯一标识", "唯一标识", "string", true},
		{"名称", "名称", "string", true},
	}

	fieldGroupBasic, _ := fieldGroupService.GetByModelAndIdentify(model.ID.Hex(), "basic")
	for _, f := range defaultFields {
		field := &models.Field{
			ModelID:      model.ID,
			FieldGroupID: fieldGroupBasic.ID,
			Name:         f.Name,
			Identify:     f.Identify,
			Type:         f.Type,
			Required:     f.Required,
			IsBuiltin:    true,
		}
		fieldService.Create(field)
	}

	return nil
}

func (s *ModelService) GetByID(id string) (*models.Model, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var model models.Model
	err = s.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&model)
	if err != nil {
		return nil, err
	}
	return &model, nil
}

func (s *ModelService) GetByIdentify(identify string) (*models.Model, error) {
	var model models.Model
	err := s.collection.FindOne(context.Background(), bson.M{"model_identify": identify}).Decode(&model)
	if err != nil {
		return nil, err
	}
	return &model, nil
}

func (s *ModelService) Update(model *models.Model) error {
	model.UpdatedAt = time.Now()
	_, err := s.collection.ReplaceOne(context.Background(), bson.M{"_id": model.ID}, model)
	return err
}

func (s *ModelService) Delete(id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	// 检查是否有数据
	resourceService := NewResourceService()
	count, _ := resourceService.CountByModel(id)
	if count > 0 {
		return errors.New("cannot delete model with data")
	}

	// 删除字段和字段分组
	fieldService := NewFieldService()
	fieldGroupService := NewFieldGroupService()
	fieldService.DeleteByModel(id)
	fieldGroupService.DeleteByModel(id)

	_, err = s.collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	return err
}

func (s *ModelService) List() ([]*models.Model, error) {
	cursor, err := s.collection.Find(context.Background(), bson.M{}, options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var models []*models.Model
	if err := cursor.All(context.Background(), &models); err != nil {
		return nil, err
	}
	return models, nil
}

func (s *ModelService) ListByGroup(groupID string) ([]*models.Model, error) {
	objectID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return nil, err
	}

	cursor, err := s.collection.Find(context.Background(), bson.M{"model_group_id": objectID}, options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var models []*models.Model
	if err := cursor.All(context.Background(), &models); err != nil {
		return nil, err
	}
	return models, nil
}

func (s *ModelService) CountByGroup(groupID string) (int64, error) {
	objectID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return 0, err
	}
	return s.collection.CountDocuments(context.Background(), bson.M{"model_group_id": objectID})
}

// ========== FieldGroup Service ==========

type FieldGroupService struct {
	collection *mongo.Collection
}

func NewFieldGroupService() *FieldGroupService {
	return &FieldGroupService{
		collection: database.GetCollection("field_groups"),
	}
}

func (s *FieldGroupService) Create(fg *models.FieldGroup) error {
	fg.CreatedAt = time.Now()
	result, err := s.collection.InsertOne(context.Background(), fg)
	if err != nil {
		return err
	}
	fg.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *FieldGroupService) GetByID(id string) (*models.FieldGroup, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var fg models.FieldGroup
	err = s.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&fg)
	if err != nil {
		return nil, err
	}
	return &fg, nil
}

func (s *FieldGroupService) GetByModelAndIdentify(modelID, identify string) (*models.FieldGroup, error) {
	objectID, err := primitive.ObjectIDFromHex(modelID)
	if err != nil {
		return nil, err
	}

	var fg models.FieldGroup
	err = s.collection.FindOne(context.Background(), bson.M{"model_id": objectID, "field_group_identify": identify}).Decode(&fg)
	if err != nil {
		return nil, err
	}
	return &fg, nil
}

func (s *FieldGroupService) Update(fg *models.FieldGroup) error {
	_, err := s.collection.ReplaceOne(context.Background(), bson.M{"_id": fg.ID}, fg)
	return err
}

func (s *FieldGroupService) Delete(id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	// 检查是否有字段
	fieldService := NewFieldService()
	count, _ := fieldService.CountByGroup(id)
	if count > 0 {
		return errors.New("cannot delete field group with fields")
	}

	_, err = s.collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	return err
}

func (s *FieldGroupService) ListByModel(modelID string) ([]*models.FieldGroup, error) {
	objectID, err := primitive.ObjectIDFromHex(modelID)
	if err != nil {
		return nil, err
	}

	cursor, err := s.collection.Find(context.Background(), bson.M{"model_id": objectID}, options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var groups []*models.FieldGroup
	if err := cursor.All(context.Background(), &groups); err != nil {
		return nil, err
	}
	return groups, nil
}

func (s *FieldGroupService) DeleteByModel(modelID string) error {
	objectID, err := primitive.ObjectIDFromHex(modelID)
	if err != nil {
		return err
	}
	_, err = s.collection.DeleteMany(context.Background(), bson.M{"model_id": objectID})
	return err
}

// ========== Field Service ==========

type FieldService struct {
	collection *mongo.Collection
}

func NewFieldService() *FieldService {
	return &FieldService{
		collection: database.GetCollection("fields"),
	}
}

func (s *FieldService) Create(field *models.Field) error {
	field.CreatedAt = time.Now()
	result, err := s.collection.InsertOne(context.Background(), field)
	if err != nil {
		return err
	}
	field.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *FieldService) GetByID(id string) (*models.Field, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var field models.Field
	err = s.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&field)
	if err != nil {
		return nil, err
	}
	return &field, nil
}

func (s *FieldService) Update(field *models.Field) error {
	_, err := s.collection.ReplaceOne(context.Background(), bson.M{"_id": field.ID}, field)
	return err
}

func (s *FieldService) Delete(id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = s.collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	return err
}

func (s *FieldService) ListByModel(modelID string) ([]*models.Field, error) {
	objectID, err := primitive.ObjectIDFromHex(modelID)
	if err != nil {
		return nil, err
	}

	cursor, err := s.collection.Find(context.Background(), bson.M{"model_id": objectID}, options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var fields []*models.Field
	if err := cursor.All(context.Background(), &fields); err != nil {
		return nil, err
	}
	return fields, nil
}

func (s *FieldService) ListByFieldGroup(fieldGroupID string) ([]*models.Field, error) {
	objectID, err := primitive.ObjectIDFromHex(fieldGroupID)
	if err != nil {
		return nil, err
	}

	cursor, err := s.collection.Find(context.Background(), bson.M{"field_group_id": objectID}, options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var fields []*models.Field
	if err := cursor.All(context.Background(), &fields); err != nil {
		return nil, err
	}
	return fields, nil
}

func (s *FieldService) CountByGroup(fieldGroupID string) (int64, error) {
	objectID, err := primitive.ObjectIDFromHex(fieldGroupID)
	if err != nil {
		return 0, err
	}
	return s.collection.CountDocuments(context.Background(), bson.M{"field_group_id": objectID})
}

func (s *FieldService) DeleteByModel(modelID string) error {
	objectID, err := primitive.ObjectIDFromHex(modelID)
	if err != nil {
		return err
	}
	_, err = s.collection.DeleteMany(context.Background(), bson.M{"model_id": objectID})
	return err
}

// 注：原文件末尾曾有 `func errors.New(...)` 的非合法 Go 语法（与标准库命名冲突）
// 已在 code review 阶段删除。如需自定义错误，请使用 `var ErrXxx = errors.New(...)` 模式。
