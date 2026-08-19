// Package discovery 提供自动发现规则引擎（Phase 3）
// 架构：
//   - Executor 接口：每种数据源（static/ssh/http/cloud）的实现
//   - StaticExecutor：Phase 3 起步实现，从 rule.Config.items 直接 upsert
//   - Scheduler：按 rule.Schedule（interval:Ns/Nm/Nh）轮询调度
//   - DiscoveryService：规则 CRUD + 执行结果记录
package discovery

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cmdb/internal/models"
	"cmdb/internal/services"

	"go.mongodb.org/mongo-driver/bson"
)

// ExecuteResult 执行结果（结构化返回，便于审计与测试断言）
type ExecuteResult struct {
	Created int           `json:"created"`
	Updated int           `json:"updated"`
	Skipped int           `json:"skipped"`
	Failed  int           `json:"failed"`
	Items   []ExecuteItem `json:"items,omitempty"`
}

// ExecuteItem 单条资源处理明细
type ExecuteItem struct {
	Action   string `json:"action"`
	UniqueID string `json:"unique_id"`
	Message  string `json:"message,omitempty"`
}

// Executor 数据源执行器接口
type Executor interface {
	Type() string
	Execute(ctx context.Context, rule *models.DiscoveryRule, targetModel *models.Model) (*ExecuteResult, error)
}

// Registry 执行器注册表
type Registry struct {
	execs map[string]Executor
}

func NewRegistry() *Registry {
	return &Registry{execs: make(map[string]Executor)}
}

func (r *Registry) Register(e Executor) {
	r.execs[e.Type()] = e
}

func (r *Registry) Get(t string) (Executor, bool) {
	e, ok := r.execs[t]
	return e, ok
}

// ============== StaticExecutor ==============

// StaticExecutor 从 rule.Config.items 列表直接 upsert 到目标 model
// 配置 schema：
//
//	{ "items": [ { "unique_id": "host-01", "name": "Host 01", ... } ] }
//
// 唯一标识字段兼容 unique_id / 唯一标识
type StaticExecutor struct{}

func NewStaticExecutor() *StaticExecutor { return &StaticExecutor{} }

func (e *StaticExecutor) Type() string { return "static" }

func (e *StaticExecutor) Execute(ctx context.Context, rule *models.DiscoveryRule, targetModel *models.Model) (*ExecuteResult, error) {
	if rule == nil {
		return nil, errors.New("rule is nil")
	}
	if targetModel == nil || targetModel.ID.IsZero() {
		return nil, errors.New("targetModel is required")
	}

	rawItems, ok := rule.Config["items"]
	if !ok {
		return nil, errors.New("static executor requires config.items")
	}
	items, ok := rawItems.(bson.A)
	if !ok {
		if alt, ok2 := rawItems.([]interface{}); ok2 {
			items = bson.A(alt)
		} else {
			return nil, fmt.Errorf("config.items must be array, got %T", rawItems)
		}
	}

	resSvc := services.NewResourceService()
	result := &ExecuteResult{Items: make([]ExecuteItem, 0, len(items))}

	for _, raw := range items {
		item, ok := raw.(bson.M)
		if !ok {
			if alt, ok2 := raw.(map[string]interface{}); ok2 {
				item = bson.M(alt)
			} else {
				result.Failed++
				result.Items = append(result.Items, ExecuteItem{Action: "failed", Message: fmt.Sprintf("item must be object, got %T", raw)})
				continue
			}
		}

		uniqueID := stringOf(item["unique_id"])
		if uniqueID == "" {
			uniqueID = stringOf(item["唯一标识"])
		}
		if uniqueID == "" {
			result.Failed++
			result.Items = append(result.Items, ExecuteItem{Action: "failed", Message: "missing unique_id / 唯一标识"})
			continue
		}
		item["唯一标识"] = uniqueID

		existing, err := resSvc.GetByUniqueID(targetModel.Identify, uniqueID)
		if err != nil && err.Error() != "mongo: no documents in result" {
			result.Failed++
			result.Items = append(result.Items, ExecuteItem{Action: "failed", UniqueID: uniqueID, Message: err.Error()})
			continue
		}
		if existing != nil {
			existing.Data = item
			if err := resSvc.Update(existing); err != nil {
				result.Failed++
				result.Items = append(result.Items, ExecuteItem{Action: "failed", UniqueID: uniqueID, Message: err.Error()})
				continue
			}
			result.Updated++
			result.Items = append(result.Items, ExecuteItem{Action: "updated", UniqueID: uniqueID})
		} else {
			r := &models.Resource{
				ModelID:       targetModel.ID,
				ModelIdentify: targetModel.Identify,
				Data:          item,
				CreatedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			}
			if err := resSvc.Create(r); err != nil {
				result.Failed++
				result.Items = append(result.Items, ExecuteItem{Action: "failed", UniqueID: uniqueID, Message: err.Error()})
				continue
			}
			result.Created++
			result.Items = append(result.Items, ExecuteItem{Action: "created", UniqueID: uniqueID})
		}
	}
	return result, nil
}

func stringOf(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	if s, ok := v.(fmt.Stringer); ok {
		return s.String()
	}
	return ""
}
