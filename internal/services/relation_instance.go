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

// RelationInstanceService 关系实例服务（双向边）
// Phase 2 引入：取代 Resource.Relations 嵌入式字段，写入独立集合 relation_instances。
// 调用约定：
//   - 所有 Bind/Unbind 必须经过本 service，禁止直接写 resources.relations
//   - 读取时优先读 relation_instances；旧数据兼容读 resources.relations
type RelationInstanceService struct {
	collection *mongo.Collection
}

func NewRelationInstanceService() *RelationInstanceService {
	return &RelationInstanceService{
		collection: database.GetCollection("relation_instances"),
	}
}

// Bind 在 from→to 之间建立一条关系实例（单向写入；按 relation_type 决定是否反向建立）
//   - belong（从属）: 建立双向两条记录（from→to 和 to→from），便于反查
//   - connect（连接）: 仅建立 from→to（默认不对称），如需对称调用方自行 Bind(to, from)
//
// 入参：
//   - relation: Relation schema（必须含 ID 与 Type）
//   - fromResource: 源资源（必须含 ID 与 ModelID）
//   - toResource:   目标资源
func (s *RelationInstanceService) Bind(relation *models.Relation, fromResource, toResource *models.Resource) error {
	if relation == nil || relation.ID.IsZero() {
		return errors.New("relation is required")
	}
	if fromResource == nil || fromResource.ID.IsZero() || toResource == nil || toResource.ID.IsZero() {
		return errors.New("fromResource and toResource are required")
	}
	if fromResource.ID == toResource.ID {
		return errors.New("cannot bind a resource to itself")
	}

	now := time.Now()
	docs := []interface{}{
		models.RelationInstance{
			RelationID:       relation.ID,
			RelationIdentify: relation.Identify,
			FromResourceID:   fromResource.ID,
			FromModelID:      fromResource.ModelID,
			ToResourceID:     toResource.ID,
			ToModelID:        toResource.ModelID,
			RelationType:     relation.Type,
			CreatedAt:        now,
		},
	}

	// belong 类型：双向建边，便于反查"谁从属于我"
	if relation.Type == "belong" {
		docs = append(docs, models.RelationInstance{
			RelationID:       relation.ID,
			RelationIdentify: relation.Identify,
			FromResourceID:   toResource.ID,
			FromModelID:      toResource.ModelID,
			ToResourceID:     fromResource.ID,
			ToModelID:        fromResource.ModelID,
			RelationType:     relation.Type,
			CreatedAt:        now,
		})
	}

	_, err := s.collection.InsertMany(context.Background(), docs)
	return err
}

// Unbind 删除一对资源之间的所有匹配关系实例
// 入参：
//   - fromResourceID, toResourceID: 资源 ObjectID 字符串
//   - relationIdentify: 可选；为空时删除该 from↔to 之间所有关系
func (s *RelationInstanceService) Unbind(fromResourceID, toResourceID, relationIdentify string) error {
	fromOID, err := primitive.ObjectIDFromHex(fromResourceID)
	if err != nil {
		return err
	}
	toOID, err := primitive.ObjectIDFromHex(toResourceID)
	if err != nil {
		return err
	}

	filter := bson.M{
		"from_resource_id": fromOID,
		"to_resource_id":   toOID,
	}
	if relationIdentify != "" {
		filter["relation_identify"] = relationIdentify
	}

	// 同时尝试删除对称边（属于同一对资源的两个方向记录）
	symFilter := bson.M{
		"from_resource_id": toOID,
		"to_resource_id":   fromOID,
	}
	if relationIdentify != "" {
		symFilter["relation_identify"] = relationIdentify
	}

	_, err = s.collection.DeleteMany(context.Background(), filter)
	if err != nil {
		return err
	}
	_, err = s.collection.DeleteMany(context.Background(), symFilter)
	return err
}

// GetByResource 获取资源的所有关系实例（含出向与入向，按 RelationIdentify 分组）
func (s *RelationInstanceService) GetByResource(resourceID string) ([]*models.RelationInstance, error) {
	oid, err := primitive.ObjectIDFromHex(resourceID)
	if err != nil {
		return nil, err
	}

	filter := bson.M{
		"$or": []bson.M{
			{"from_resource_id": oid},
			{"to_resource_id": oid},
		},
	}
	cursor, err := s.collection.Find(context.Background(), filter, options.Find().SetSort(bson.D{{Key: "create_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var instances []*models.RelationInstance
	if err := cursor.All(context.Background(), &instances); err != nil {
		return nil, err
	}
	return instances, nil
}

// ListByRelationType 按关系定义 ID 列出全部实例
func (s *RelationInstanceService) ListByRelationType(relationID string, page, pageSize int) ([]*models.RelationInstance, int64, error) {
	oid, err := primitive.ObjectIDFromHex(relationID)
	if err != nil {
		return nil, 0, err
	}

	skip := int64((page - 1) * pageSize)
	if skip < 0 {
		skip = 0
	}
	limit := int64(pageSize)
	if limit <= 0 {
		limit = 50
	}

	total, err := s.collection.CountDocuments(context.Background(), bson.M{"relation_id": oid})
	if err != nil {
		return nil, 0, err
	}

	cursor, err := s.collection.Find(context.Background(),
		bson.M{"relation_id": oid},
		options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.D{{Key: "create_at", Value: -1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(context.Background())

	var instances []*models.RelationInstance
	if err := cursor.All(context.Background(), &instances); err != nil {
		return nil, 0, err
	}
	return instances, total, nil
}

// GraphNode 图节点
type GraphNode struct {
	ID    string                 `json:"id"`
	Label string                 `json:"label"`
	Group string                 `json:"group"`
	Data  map[string]interface{} `json:"data,omitempty"`
}

// GraphEdge 图边
type GraphEdge struct {
	From   string `json:"from"`
	To     string `json:"to"`
	Label  string `json:"label"`
	Type   string `json:"type"`
	Arrows string `json:"arrows"`
}

// GraphResult 图查询结果
type GraphResult struct {
	Center string      `json:"center"`
	Depth  int         `json:"depth"`
	Nodes  []GraphNode `json:"nodes"`
	Edges  []GraphEdge `json:"edges"`
}

// Graph 以 center 为中心 BFS depth 层，返回 nodes + edges（Phase 6 前端关系图）
func (s *RelationInstanceService) Graph(centerID string, depth int) (*GraphResult, error) {
	if depth < 0 {
		depth = 1
	}
	if depth > 3 {
		depth = 3
	}
	centerOID, err := primitive.ObjectIDFromHex(centerID)
	if err != nil {
		return nil, err
	}

	resSvc := NewResourceService()

	visited := make(map[string]bool)
	nodeInfos := make(map[string]struct {
		label string
		group string
		data  map[string]interface{}
	})
	edges := []GraphEdge{}
	queue := []struct {
		id    primitive.ObjectID
		level int
	}{{centerOID, 0}}
	visited[centerOID.Hex()] = true

	for len(queue) > 0 {
		head := queue[0]
		queue = queue[1:]
		r, err := resSvc.GetByID(head.id.Hex())
		if err != nil {
			continue
		}
		nodeInfos[r.ID.Hex()] = struct {
			label string
			group string
			data  map[string]interface{}
		}{label: labelOf(r), group: r.ModelIdentify, data: r.Data}
		if head.level >= depth {
			continue
		}
		instances, _ := s.GetByResource(r.ID.Hex())
		for _, inst := range instances {
			var neighborID primitive.ObjectID
			if inst.FromResourceID == r.ID {
				neighborID = inst.ToResourceID
			} else if inst.ToResourceID == r.ID {
				neighborID = inst.FromResourceID
			} else {
				continue
			}
			if !visited[neighborID.Hex()] {
				visited[neighborID.Hex()] = true
				queue = append(queue, struct {
					id    primitive.ObjectID
					level int
				}{neighborID, head.level + 1})
			}
			edges = append(edges, GraphEdge{
				From:   inst.FromResourceID.Hex(),
				To:     inst.ToResourceID.Hex(),
				Label:  inst.RelationIdentify,
				Type:   inst.RelationType,
				Arrows: "to",
			})
		}
	}

	// 按 visited 顺序产出 nodes（中心优先）
	nodes := make([]GraphNode, 0, len(nodeInfos))
	for id := range visited {
		if info, ok := nodeInfos[id]; ok {
			nodes = append(nodes, GraphNode{ID: id, Label: info.label, Group: info.group, Data: info.data})
		}
	}
	return &GraphResult{Center: centerOID.Hex(), Depth: depth, Nodes: nodes, Edges: edges}, nil
}

// labelOf 从资源 data 中提取显示名
func labelOf(r *models.Resource) string {
	if r.Data != nil {
		if v, ok := r.Data["名称"].(string); ok && v != "" {
			return v
		}
		if v, ok := r.Data["唯一标识"].(string); ok && v != "" {
			return v
		}
	}
	return r.ID.Hex()
}

// CountByResource 统计资源的关系实例数（出向 + 入向）
func (s *RelationInstanceService) CountByResource(resourceID string) (int64, error) {
	oid, err := primitive.ObjectIDFromHex(resourceID)
	if err != nil {
		return 0, err
	}
	return s.collection.CountDocuments(context.Background(), bson.M{
		"$or": []bson.M{
			{"from_resource_id": oid},
			{"to_resource_id": oid},
		},
	})
}
