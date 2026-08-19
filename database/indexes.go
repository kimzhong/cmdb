package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// EnsureIndexes 幂等创建所有集合的索引（Phase 4）
// 设计原则：
//   - 后台建索引（Background: true），不阻塞启动
//   - 重复调用安全（同名索引 MongoDB 自动忽略）
//   - 命名清晰，便于后续 db.collection.getIndexes() 排查
//
// 索引清单：
//
//	resources
//	  - idx_resources_model       {model_id:1, model_identify:1}
//	  - idx_resources_unique_id   {model_identify:1, "data.唯一标识":1}
//	  - idx_resources_name        {"data.名称":1}
//	  - idx_resources_tags        {tags:1}
//	  - idx_resources_data_text   {data: "text"} （中文检索弱，正则兜底）
//	relation_instances
//	  - idx_ri_relation_from      {relation_id:1, from_resource_id:1}
//	  - idx_ri_relation_to        {relation_id:1, to_resource_id:1}
//	  - idx_ri_from_relation      {from_resource_id:1, relation_id:1}
//	  - idx_ri_to_relation        {to_resource_id:1, relation_id:1}
//	models
//	  - idx_models_identify_uniq  {model_identify:1} unique
//	fields
//	  - idx_fields_model_group_sort {model_id:1, field_group_id:1, sort:1}
//	model_groups
//	  - idx_groups_category_sort  {category:1, sort:1}
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	type indexJob struct {
		collection string
		indexes    []mongo.IndexModel
	}

	jobs := []indexJob{
		{
			collection: "resources",
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "model_id", Value: 1}, {Key: "model_identify", Value: 1}},
					Options: options.Index().SetName("idx_resources_model").SetBackground(true)},
				{Keys: bson.D{{Key: "model_identify", Value: 1}, {Key: "data.唯一标识", Value: 1}},
					Options: options.Index().SetName("idx_resources_unique_id").SetBackground(true)},
				{Keys: bson.D{{Key: "data.名称", Value: 1}},
					Options: options.Index().SetName("idx_resources_name").SetBackground(true)},
				{Keys: bson.D{{Key: "tags", Value: 1}},
					Options: options.Index().SetName("idx_resources_tags").SetBackground(true)},
				{Keys: bson.D{{Key: "data", Value: "text"}},
					Options: options.Index().SetName("idx_resources_data_text").SetBackground(true)},
			},
		},
		{
			collection: "relation_instances",
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "relation_id", Value: 1}, {Key: "from_resource_id", Value: 1}},
					Options: options.Index().SetName("idx_ri_relation_from").SetBackground(true)},
				{Keys: bson.D{{Key: "relation_id", Value: 1}, {Key: "to_resource_id", Value: 1}},
					Options: options.Index().SetName("idx_ri_relation_to").SetBackground(true)},
				{Keys: bson.D{{Key: "from_resource_id", Value: 1}, {Key: "relation_id", Value: 1}},
					Options: options.Index().SetName("idx_ri_from_relation").SetBackground(true)},
				{Keys: bson.D{{Key: "to_resource_id", Value: 1}, {Key: "relation_id", Value: 1}},
					Options: options.Index().SetName("idx_ri_to_relation").SetBackground(true)},
			},
		},
		{
			collection: "models",
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "model_identify", Value: 1}},
					Options: options.Index().SetName("idx_models_identify_uniq").SetUnique(true).SetBackground(true)},
			},
		},
		{
			collection: "fields",
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "model_id", Value: 1}, {Key: "field_group_id", Value: 1}, {Key: "sort", Value: 1}},
					Options: options.Index().SetName("idx_fields_model_group_sort").SetBackground(true)},
			},
		},
		{
			collection: "model_groups",
			indexes: []mongo.IndexModel{
				{Keys: bson.D{{Key: "category", Value: 1}, {Key: "sort", Value: 1}},
					Options: options.Index().SetName("idx_groups_category_sort").SetBackground(true)},
			},
		},
	}

	for _, job := range jobs {
		c := db.Collection(job.collection)
		if _, err := c.Indexes().CreateMany(ctx, job.indexes); err != nil {
			return fmt.Errorf("ensure indexes on %s: %w", job.collection, err)
		}
		log.Printf("[Phase 4] ensured %d indexes on collection %q", len(job.indexes), job.collection)
	}
	return nil
}

// EnsureIndexesDefault 使用默认 30s 超时调用 EnsureIndexes（供 main.go 启动使用）
func EnsureIndexesDefault(db *mongo.Database) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return EnsureIndexes(ctx, db)
}
