package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// 用户模型
type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username  string             `bson:"username" json:"username"`
	Password  string             `bson:"password" json:"-"`
	Nickname  string             `bson:"nickname" json:"nickname"`
	Email     string             `bson:"email" json:"email"`
	Phone     string             `bson:"phone" json:"phone"`
	Role      string             `bson:"role" json:"role"` // admin, user
	Status    int                `bson:"status" json:"status"` // 0: 禁用, 1: 启用
	Source    string             `bson:"source" json:"source"` // local, ldap, ad
	DN        string             `bson:"dn,omitempty" json:"dn,omitempty"` // LDAP/AD DN
	CreatedAt time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt time.Time          `bson:"modify_at" json:"modify_at"`
}

// 模型分组
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

// 模型
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

// 字段分组
type FieldGroup struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ModelID  primitive.ObjectID `bson:"model_id" json:"model_id"`
	Name     string             `bson:"field_group_name" json:"field_group_name"`
	Identify string             `bson:"field_group_identify" json:"field_group_identify"`
	Sort     int                `bson:"sort" json:"sort"`
	CreatedAt time.Time         `bson:"create_at" json:"create_at"`
}

// 字段
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
	Options      string             `bson:"options" json:"options"` // 下拉选项JSON
	ValidateRule string             `bson:"validate_rule" json:"validate_rule"` // 校验规则（正则表达式）
	CreatedAt    time.Time          `bson:"create_at" json:"create_at"`
}

// 关系定义
type Relation struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ModelID     primitive.ObjectID `bson:"model_id" json:"model_id"`
	Name        string             `bson:"relation_name" json:"relation_name"`
	Identify    string             `bson:"relation_identify" json:"relation_identify"`
	TargetModel primitive.ObjectID `bson:"target_model_id" json:"target_model_id"`
	Type        string             `bson:"relation_type" json:"relation_type"` // belong: 从属, connect: 连接
	Cardinality string             `bson:"cardinality" json:"cardinality"` // one-to-one, one-to-many, many-to-many
	CreatedAt   time.Time          `bson:"create_at" json:"create_at"`
}

// 资源数据
type Resource struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ModelID    primitive.ObjectID `bson:"model_id" json:"model_id"`
	ModelIdentify string          `bson:"model_identify" json:"model_identify"`
	Data       map[string]interface{} `bson:"data" json:"data"`
	Relations  map[string][]primitive.ObjectID `bson:"relations" json:"relations"`
	Tags       []primitive.ObjectID `bson:"tags" json:"tags"`
	CreatedAt  time.Time           `bson:"create_at" json:"create_at"`
	UpdatedAt  time.Time           `bson:"modify_at" json:"modify_at"`
}

// 标签键
type TagKey struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"tag_name" json:"tag_name"`
	Identify    string             `bson:"tag_identify" json:"tag_identify"`
	Description string             `bson:"description" json:"description"`
	CreatedAt   time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt   time.Time          `bson:"modify_at" json:"modify_at"`
}

// 标签值
type TagValue struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TagKeyID  primitive.ObjectID `bson:"tag_key_id" json:"tag_key_id"`
	Name      string             `bson:"tag_value_name" json:"tag_value_name"`
	Resources []primitive.ObjectID `bson:"resources" json:"resources"`
	CreatedAt time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt time.Time          `bson:"modify_at" json:"modify_at"`
}

// 定时任务
type SyncTask struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"task_name" json:"task_name"`
	Identify    string             `bson:"task_identify" json:"task_identify"`
	ModelID     primitive.ObjectID `bson:"model_id" json:"model_id"`
	CloudType   string             `bson:"cloud_type" json:"cloud_type"` // cloud, other
	SyncType    string             `bson:"sync_type" json:"sync_type"` // full, incremental
	Schedule    string             `bson:"schedule" json:"schedule"` // cron expression
	Status      int                `bson:"status" json:"status"` // 0: 停用, 1: 启用
	LastRunAt   *time.Time        `bson:"last_run_at" json:"last_run_at"`
	CreatedAt   time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt   time.Time          `bson:"modify_at" json:"modify_at"`
}

// 应用
type Application struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"app_name" json:"app_name"`
	Identify    string             `bson:"app_identify" json:"app_identify"`
	BusinessID  primitive.ObjectID `bson:"business_id" json:"business_id"`
	Resources   []primitive.ObjectID `bson:"resources" json:"resources"`
	Description string             `bson:"description" json:"description"`
	Owner       string             `bson:"owner" json:"owner"`
	Status      string             `bson:"status" json:"status"` // planning, developing, testing, running, stopped
	CreatedAt   time.Time          `bson:"create_at" json:"create_at"`
	UpdatedAt   time.Time          `bson:"modify_at" json:"modify_at"`
}

// 业务
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
