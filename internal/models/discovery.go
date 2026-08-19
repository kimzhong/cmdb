package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DiscoveryRule 自动发现规则（易维别名：DiscoveryRule；本地原 SyncTask 是其云厂商特例）
// Phase 3 引入。通用数据源接入抽象，与模型解耦：
//   - SourceType = "static" | 后续 "ssh" | "http" | "cloud"
//   - Config 承载执行器私有配置
//   - Schedule 支持 "interval:30s" / "interval:5m" / "interval:1h"（Phase 3 起步）
//     完整 cron 表达式留待后续接入 robfig/cron（受网络限制暂未引入）
//
// 执行结果：
//   - LastRunAt / LastRunStatus / LastRunMsg 用于审计
type DiscoveryRule struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name          string             `bson:"rule_name" json:"rule_name"`
	Identify      string             `bson:"rule_identify" json:"rule_identify"`
	Description   string             `bson:"description" json:"description"`
	TargetModelID primitive.ObjectID `bson:"target_model_id" json:"target_model_id"`
	SourceType    string             `bson:"source_type" json:"source_type"`
	Schedule      string             `bson:"schedule" json:"schedule"`
	Status        int                `bson:"status" json:"status"`
	Config        bson.M             `bson:"config,omitempty" json:"config,omitempty"`
	LastRunAt     *time.Time         `bson:"last_run_at,omitempty" json:"last_run_at,omitempty"`
	LastRunStatus string             `bson:"last_run_status,omitempty" json:"last_run_status,omitempty"`
	LastRunMsg    string             `bson:"last_run_msg,omitempty" json:"last_run_msg,omitempty"`
	CreatedAt     time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt     time.Time          `bson:"modify_at" json:"modify_at"`
}

// DiscoveryRuleStatus 常量
const (
	DiscoveryRuleDisabled = 0
	DiscoveryRuleEnabled  = 1
)

// DiscoveryRunStatus 字符串常量
const (
	DiscoveryRunPending = ""
	DiscoveryRunSuccess = "success"
	DiscoveryRunFailed  = "failed"
)
