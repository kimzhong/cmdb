package models

// 术语对齐（参考 易维/veops CMDB）：
//   User         - 用户（保持不变）
//   ModelGroup   ↔ CITypeGroup   模型分组（CMDB 中 CI 类型的分类容器）
//   Model        ↔ CIType        模型（CI 类型定义）
//   FieldGroup   ↔ AttributeGroup 字段分组（属性在 UI 上的分组）
//   Field        ↔ Attribute     字段（CI 的属性定义）
//   Relation     ↔ RelationType  关系定义（关系 schema，含 belong/connect 与基数）
//   Resource     ↔ CI            资源（配置项实例）
//   Resource.Relations ↔ RelationInstance（实例化双向边；后续 Phase 2 升级为独立集合）
//   TagKey/TagValue    - 标签键值（CMDB 的灵活打标能力）
//   SyncTask     ↔ DiscoveryRule 自动发现/同步任务（后续 Phase 3 升级为规则引擎）
//   Application  - 应用（业务侧实体）
//   Business     - 业务线
//
// 本文件只追加别名注释，不改动 BSON tag 与字段，保持向后兼容。

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User 用户模型（保持不变）
type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username  string             `bson:"username" json:"username"`
	Password  string             `bson:"password" json:"-"`
	Nickname  string             `bson:"nickname" json:"nickname"`
	Email     string             `bson:"email" json:"email"`
	Phone     string             `bson:"phone" json:"phone"`
	Role      string             `bson:"role" json:"role"`                 // admin, user
	Status    int                `bson:"status" json:"status"`             // 0: 禁用, 1: 启用
	Source    string             `bson:"source" json:"source"`             // local, ldap, ad
	DN        string             `bson:"dn,omitempty" json:"dn,omitempty"` // LDAP/AD DN
	CreatedAt time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt time.Time          `bson:"modify_at" json:"modify_at"`
}

// ModelGroup 模型分组（易维别名：CITypeGroup）
type ModelGroup struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Identify    string             `bson:"model_group_identify" json:"model_group_identify"`
	Name        string             `bson:"model_group_name" json:"model_group_name"`
	Category    string             `bson:"category" json:"category"` // 资产模型, 应用模型, 组织模型, 其他
	Description string             `bson:"description" json:"description"`
	Sort        int                `bson:"sort" json:"sort"`
	Status      int                `bson:"status" json:"status"` // 0: 停用, 1: 启用
	IsBuiltin   bool               `bson:"is_builtin" json:"is_builtin"`
	CreatedAt   time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt   time.Time          `bson:"modify_at" json:"modify_at"`
}

// Model 模型（易维别名：CIType）
type Model struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Identify     string             `bson:"model_identify" json:"model_identify"`
	Name         string             `bson:"model_name" json:"model_name"`
	ModelGroupID primitive.ObjectID `bson:"model_group_id" json:"model_group_id"`
	Description  string             `bson:"description" json:"description"`
	Sort         int                `bson:"sort" json:"sort"`
	Status       int                `bson:"status" json:"status"` // 0: 停用, 1: 启用
	IsBuiltin    bool               `bson:"is_builtin" json:"is_builtin"`
	CreatedAt    time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt    time.Time          `bson:"modify_at" json:"modify_at"`
}

// FieldGroup 字段分组（易维别名：AttributeGroup）
type FieldGroup struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ModelID   primitive.ObjectID `bson:"model_id" json:"model_id"`
	Name      string             `bson:"field_group_name" json:"field_group_name"`
	Identify  string             `bson:"field_group_identify" json:"field_group_identify"`
	Sort      int                `bson:"sort" json:"sort"`
	CreatedAt time.Time          `bson:"create_at" json:"create_at"`
}

// Field 字段（易维别名：Attribute）
type Field struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ModelID      primitive.ObjectID `bson:"model_id" json:"model_id"`
	FieldGroupID primitive.ObjectID `bson:"field_group_id" json:"field_group_id"`
	Name         string             `bson:"field_name" json:"field_name"`
	Identify     string             `bson:"field_identify" json:"field_identify"`
	Type         string             `bson:"field_type" json:"field_type"` // string, number, date, select, password, relation
	Required     bool               `bson:"required" json:"required"`
	IsBuiltin    bool               `bson:"is_builtin" json:"is_builtin"`
	Sort         int                `bson:"sort" json:"sort"`
	Description  string             `bson:"description" json:"description"`
	Options      string             `bson:"options" json:"options"`             // 下拉选项JSON
	ValidateRule string             `bson:"validate_rule" json:"validate_rule"` // 校验规则（正则表达式）
	CreatedAt    time.Time          `bson:"create_at" json:"create_at"`
}

// Relation 关系定义（易维别名：RelationType）
type Relation struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ModelID     primitive.ObjectID `bson:"model_id" json:"model_id"`
	Name        string             `bson:"relation_name" json:"relation_name"`
	Identify    string             `bson:"relation_identify" json:"relation_identify"`
	TargetModel primitive.ObjectID `bson:"target_model_id" json:"target_model_id"`
	Type        string             `bson:"relation_type" json:"relation_type"` // belong: 从属, connect: 连接
	Cardinality string             `bson:"cardinality" json:"cardinality"`     // one-to-one, one-to-many, many-to-many
	CreatedAt   time.Time          `bson:"create_at" json:"create_at"`
}

// RelationInstance 关系实例（双向边）
// 易维别名：RelationInstance
// 说明：独立集合 relation_instances，存储 CI 之间关系实例化的双向边。
// 与 Resource.Relations（旧嵌入式字段）的关系：
//   - Phase 2 起所有 Bind/Unbind 走此集合
//   - Resource.Relations 保留只读，不再写入（1-2 个版本后清理）
//
// 基数语义：
//   - belong（从属）: 多为 one-to-one，两侧都应唯一
//   - connect（连接）: 允许 one-to-many / many-to-many
type RelationInstance struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	RelationID       primitive.ObjectID `bson:"relation_id" json:"relation_id"`             // 关联到 Relation (schema)
	RelationIdentify string             `bson:"relation_identify" json:"relation_identify"` // 冗余便于查询
	FromResourceID   primitive.ObjectID `bson:"from_resource_id" json:"from_resource_id"`
	FromModelID      primitive.ObjectID `bson:"from_model_id" json:"from_model_id"` // 冗余便于按模型过滤
	ToResourceID     primitive.ObjectID `bson:"to_resource_id" json:"to_resource_id"`
	ToModelID        primitive.ObjectID `bson:"to_model_id" json:"to_model_id"`
	RelationType     string             `bson:"relation_type" json:"relation_type"` // belong | connect
	CreatedAt        time.Time          `bson:"create_at" json:"create_at"`
}

// Resource 资源（易维别名：CI）
type Resource struct {
	ID            primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	ModelID       primitive.ObjectID     `bson:"model_id" json:"model_id"`
	ModelIdentify string                 `bson:"model_identify" json:"model_identify"`
	Data          map[string]interface{} `bson:"data" json:"data"`
	// Deprecated: Phase 2 起新代码不再写入此字段；保留只为兼容旧读路径。
	// 新关系实例请使用独立集合 relation_instances（见 RelationInstance）。
	Relations map[string][]primitive.ObjectID `bson:"relations" json:"relations"`
	Tags      []primitive.ObjectID            `bson:"tags" json:"tags"`
	CreatedAt time.Time                       `bson:"create_at" json:"create_at"`
	UpdatedAt time.Time                       `bson:"modify_at" json:"modify_at"`
}

// TagKey 标签键
type TagKey struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"tag_name" json:"tag_name"`
	Identify    string             `bson:"tag_identify" json:"tag_identify"`
	Description string             `bson:"description" json:"description"`
	CreatedAt   time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt   time.Time          `bson:"modify_at" json:"modify_at"`
}

// TagValue 标签值
type TagValue struct {
	ID        primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	TagKeyID  primitive.ObjectID   `bson:"tag_key_id" json:"tag_key_id"`
	Name      string               `bson:"tag_value_name" json:"tag_value_name"`
	Resources []primitive.ObjectID `bson:"resources" json:"resources"`
	CreatedAt time.Time            `bson:"create_at" json:"create_at"`
	UpdatedAt time.Time            `bson:"modify_at" json:"modify_at"`
}

// SyncTask 同步任务（易维别名：DiscoveryRule，Phase 3 将升级为规则引擎）
type SyncTask struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"task_name" json:"task_name"`
	Identify  string             `bson:"task_identify" json:"task_identify"`
	ModelID   primitive.ObjectID `bson:"model_id" json:"model_id"`
	CloudType string             `bson:"cloud_type" json:"cloud_type"` // cloud, other
	SyncType  string             `bson:"sync_type" json:"sync_type"`   // full, incremental
	Schedule  string             `bson:"schedule" json:"schedule"`     // cron expression
	Status    int                `bson:"status" json:"status"`         // 0: 停用, 1: 启用
	LastRunAt *time.Time         `bson:"last_run_at" json:"last_run_at"`
	CreatedAt time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt time.Time          `bson:"modify_at" json:"modify_at"`
}

// Application 应用（业务侧实体）
type Application struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Name        string               `bson:"app_name" json:"app_name"`
	Identify    string               `bson:"app_identify" json:"app_identify"`
	BusinessID  primitive.ObjectID   `bson:"business_id" json:"business_id"`
	Resources   []primitive.ObjectID `bson:"resources" json:"resources"`
	Description string               `bson:"description" json:"description"`
	Owner       string               `bson:"owner" json:"owner"`
	Status      string               `bson:"status" json:"status"` // planning, developing, testing, running, stopped
	CreatedAt   time.Time            `bson:"create_at" json:"create_at"`
	UpdatedAt   time.Time            `bson:"modify_at" json:"modify_at"`
}

// Business 业务线
type Business struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"business_name" json:"business_name"`
	Identify    string             `bson:"business_identify" json:"business_identify"`
	Description string             `bson:"description" json:"description"`
	Owner       string             `bson:"owner" json:"owner"`
	Status      int                `bson:"status" json:"status"`
	CreatedAt   time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt   time.Time          `bson:"modify_at" json:"modify_at"`
}
