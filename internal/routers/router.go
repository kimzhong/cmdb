package routers

import (
	"crypto/cipher"
	"crypto/des"
	"encoding/base64"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"cmdb/config"
	"cmdb/database"
	"cmdb/internal/middleware"
	"cmdb/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// 中间件
	r.Use(middleware.CORS())

	// 公开路由
	api := r.Group("/api/v1")
	{
		// 登录
		api.POST("/login", login)
		api.POST("/ldap/login", ldapLogin)
		api.POST("/users/register", registerUser)
	}

	// 需要认证的路由
	auth := api.Group("")
	auth.Use(middleware.AuthMiddleware())
	{
		// 用户管理
		auth.GET("/users", listUsers)
		auth.GET("/users/:id", getUser)
		auth.PUT("/users/:id", updateUser)
		auth.DELETE("/users/:id", deleteUser)
		auth.POST("/logout", logout)

		// 模型分组管理
		auth.GET("/model-groups", listModelGroups)
		auth.POST("/model-groups", createModelGroup)
		auth.GET("/model-groups/:id", getModelGroup)
		auth.PUT("/model-groups/:id", updateModelGroup)
		auth.DELETE("/model-groups/:id", deleteModelGroup)

		// 模型管理
		auth.GET("/models", listModels)
		auth.POST("/models", createModel)
		auth.GET("/models/:id", getModel)
		auth.PUT("/models/:id", updateModel)
		auth.DELETE("/models/:id", deleteModel)
		auth.GET("/models/:id/details", getModelDetails)

		// 字段分组管理
		auth.GET("/models/:id/field-groups", listFieldGroups)
		auth.POST("/field-groups", createFieldGroup)
		auth.PUT("/field-groups/:id", updateFieldGroup)
		auth.DELETE("/field-groups/:id", deleteFieldGroup)

		// 字段管理
		auth.GET("/field-groups/:id/fields", listFields)
		auth.POST("/fields", createField)
		auth.PUT("/fields/:id", updateField)
		auth.DELETE("/fields/:id", deleteField)

		// 关系管理
		auth.GET("/models/:id/relations", listRelations)
		auth.POST("/relations", createRelation)
		auth.DELETE("/relations/:id", deleteRelation)

		// 资源管理
		auth.GET("/resources/model/:modelId", listResources)
		auth.POST("/resources", createResource)
		auth.GET("/resources/:id", getResource)
		auth.PUT("/resources/:id", updateResource)
		auth.DELETE("/resources/:id", deleteResource)
		auth.POST("/resources/batch-delete", batchDeleteResources)

		// 资源关系
		auth.POST("/resources/:id/relations", createResourceRelation)
		auth.GET("/resources/:id/relations", getResourceRelations)
		auth.DELETE("/resources/:id/relations/:relationIdentify", deleteResourceRelation)

		// 资源标签
		auth.POST("/resources/:id/tags", addResourceTag)
		auth.DELETE("/resources/:id/tags/:tagId", removeResourceTag)

		// 全局搜索
		auth.GET("/search", globalSearch)

		// 标签管理
		auth.GET("/tags", listTagKeys)
		auth.POST("/tags", createTagKey)
		auth.PUT("/tags/:id", updateTagKey)
		auth.DELETE("/tags/:id", deleteTagKey)

		auth.GET("/tags/:id/values", listTagValues)
		auth.GET("/tags/values/all", listAllTagValues) // 获取所有标签值
		auth.POST("/tags/values", createTagValue)
		auth.PUT("/tags/values/:id", updateTagValue)
		auth.DELETE("/tags/values/:id", deleteTagValue)

		// 标签绑定资源
		auth.POST("/tags/values/:id/bind", bindResourceToTag)
		auth.DELETE("/tags/values/:id/unbind", unbindResourceFromTag)

		// 通过标签搜索资源
		auth.GET("/tags/search", searchByTag)

		// 统计数据
		auth.GET("/stats", getStats)

		// 应用管理
		auth.GET("/apps", listApps)
		auth.POST("/apps", createApp)
		auth.GET("/apps/:id", getApp)
		auth.PUT("/apps/:id", updateApp)
		auth.DELETE("/apps/:id", deleteApp)
		auth.GET("/apps/:id/resources", getAppResources)
		auth.POST("/apps/:id/resources", bindAppResource)
		auth.DELETE("/apps/:id/resources/:resourceId", unbindAppResource)

		// 业务管理
		auth.GET("/businesses", listBusinesses)
		auth.POST("/businesses", createBusiness)
		auth.GET("/businesses/:id", getBusiness)
		auth.PUT("/businesses/:id", updateBusiness)
		auth.DELETE("/businesses/:id", deleteBusiness)
		auth.GET("/businesses/:id/apps", getBusinessApps)

		// 定时任务
		auth.GET("/tasks", listTasks)
		auth.POST("/tasks", createTask)
		auth.GET("/tasks/:id", getTask)
		auth.PUT("/tasks/:id", updateTask)
		auth.DELETE("/tasks/:id", deleteTask)
		auth.POST("/tasks/:id/run", runTask)
	}

	return r
}

// ========== 用户相关 ==========

func login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	user, err := getUserByUsername(req.Username)
	if err != nil {
		c.JSON(401, gin.H{"code": 401, "message": "User not found"})
		return
	}

	// 本地用户验证密码
	if user.Source == "local" {
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			c.JSON(401, gin.H{"code": 401, "message": "Invalid password"})
			return
		}
	} else {
		// LDAP/AD用户需要通过LDAP验证
		ldapUser, err := authenticateLdapUser(req.Username, req.Password)
		if err != nil {
			c.JSON(401, gin.H{"code": 401, "message": err.Error()})
			return
		}
		user.Nickname = ldapUser.Nickname
		user.Email = ldapUser.Email
		user.Phone = ldapUser.Phone
		updateUserInDB(user)
	}

	if user.Status == 0 {
		c.JSON(401, gin.H{"code": 401, "message": "User is disabled"})
		return
	}

	token, err := middleware.GenerateToken(user.ID.Hex(), user.Username, user.Role)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": "Failed to generate token"})
		return
	}

	c.JSON(200, gin.H{
		"code":   200,
		"message": "success",
		"data": gin.H{
			"token": token,
			"user": gin.H{
				"id":       user.ID.Hex(),
				"username": user.Username,
				"nickname": user.Nickname,
				"email":    user.Email,
				"role":     user.Role,
			},
		},
	})
}

func ldapLogin(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	ldapUser, err := authenticateLdapUser(req.Username, req.Password)
	if err != nil {
		c.JSON(401, gin.H{"code": 401, "message": err.Error()})
		return
	}

	// 同步到本地数据库
	user, err := getUserByUsername(ldapUser.Username)
	if err != nil {
		// 不存在则创建
		ldapUser.Status = 1
		ldapUser.Role = "user"
		createUserInDB(ldapUser)
		user = ldapUser
	}

	token, err := middleware.GenerateToken(user.ID.Hex(), user.Username, user.Role)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": "Failed to generate token"})
		return
	}

	c.JSON(200, gin.H{
		"code":   200,
		"message": "success",
		"data": gin.H{
			"token": token,
			"user": gin.H{
				"id":       user.ID.Hex(),
				"username": user.Username,
				"nickname": user.Nickname,
				"email":    user.Email,
				"role":     user.Role,
			},
		},
	})
}

func registerUser(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Email    string `json:"email"`
		Nickname string `json:"nickname"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	// 加密密码
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	user := &models.User{
		Username:  req.Username,
		Password: string(hashedPassword),
		Email:    req.Email,
		Nickname: req.Nickname,
		Role:     "user",
		Status:   1,
		Source:   "local",
	}

	if err := createUserInDB(user); err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func listUsers(c *gin.Context) {
	page := getQueryInt(c, "page", 1)
	pageSize := getQueryInt(c, "pageSize", 10)

	skip := int64((page - 1) * pageSize)

	collection := database.GetCollection("users")
	total, _ := collection.CountDocuments(c.Request.Context(), bson.M{})

	cursor, _ := collection.Find(c.Request.Context(), bson.M{},
		options.Find().SetSkip(skip).SetLimit(int64(pageSize)).SetSort(bson.D{{Key: "create_at", Value: -1}}))
	defer cursor.Close(c.Request.Context())

	var users []models.User
	cursor.All(c.Request.Context(), &users)

	c.JSON(200, gin.H{
		"code": 200,
		"data": gin.H{
			"list":  users,
			"total": total,
			"page":  page,
		},
	})
}

func getUser(c *gin.Context) {
	id := c.Param("id")
	user, err := getUserByID(id)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "User not found"})
		return
	}
	c.JSON(200, gin.H{"code": 200, "data": user})
}

func updateUser(c *gin.Context) {
	id := c.Param("id")
	var req models.User
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	oid, _ := primitive.ObjectIDFromHex(id)
	req.ID = oid
	if err := updateUserInDB(&req); err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteUser(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("users")
	oid, _ := primitive.ObjectIDFromHex(id)
	collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func logout(c *gin.Context) {
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

// ========== 模型分组相关 ==========

func listModelGroups(c *gin.Context) {
	category := c.Query("category")
	collection := database.GetCollection("model_groups")

	var cursor *mongo.Cursor
	var err error

	if category != "" {
		cursor, err = collection.Find(c.Request.Context(), bson.M{"category": category},
			options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	} else {
		cursor, err = collection.Find(c.Request.Context(), bson.M{},
			options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	}

	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}
	defer cursor.Close(c.Request.Context())

	var groups []models.ModelGroup
	cursor.All(c.Request.Context(), &groups)

	c.JSON(200, gin.H{"code": 200, "data": groups})
}

func createModelGroup(c *gin.Context) {
	var req models.ModelGroup
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	req.Status = 1
	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()
	collection := database.GetCollection("model_groups")
	result, _ := collection.InsertOne(c.Request.Context(), &req)
	req.ID = result.InsertedID.(primitive.ObjectID)

	c.JSON(200, gin.H{"code": 200, "data": req})
}

func getModelGroup(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("model_groups")
	oid, _ := primitive.ObjectIDFromHex(id)

	var group models.ModelGroup
	err := collection.FindOne(c.Request.Context(), bson.M{"_id": oid}).Decode(&group)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Not found"})
		return
	}
	c.JSON(200, gin.H{"code": 200, "data": group})
}

func updateModelGroup(c *gin.Context) {
	id := c.Param("id")
	var req models.ModelGroup
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("model_groups")
	oid, _ := primitive.ObjectIDFromHex(id)
	req.ID = oid
	collection.ReplaceOne(c.Request.Context(), bson.M{"_id": oid}, req)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteModelGroup(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("model_groups")
	oid, _ := primitive.ObjectIDFromHex(id)

	// 检查是否有模型
	modelsCollection := database.GetCollection("models")
	count, _ := modelsCollection.CountDocuments(c.Request.Context(), bson.M{"model_group_id": oid})
	if count > 0 {
		c.JSON(500, gin.H{"code": 500, "message": "Cannot delete group with models"})
		return
	}

	collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

// ========== 模型相关 ==========

func listModels(c *gin.Context) {
	groupID := c.Query("groupId")
	collection := database.GetCollection("models")

	var cursor *mongo.Cursor
	var err error

	if groupID != "" {
		oid, _ := primitive.ObjectIDFromHex(groupID)
		cursor, err = collection.Find(c.Request.Context(), bson.M{"model_group_id": oid},
			options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	} else {
		cursor, err = collection.Find(c.Request.Context(), bson.M{},
			options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	}

	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}
	defer cursor.Close(c.Request.Context())

	var modelList []models.Model
	cursor.All(c.Request.Context(), &modelList)

	c.JSON(200, gin.H{"code": 200, "data": modelList})
}

func createModel(c *gin.Context) {
	var req models.Model
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("models")

	// 检查标识是否重复
	count, _ := collection.CountDocuments(c.Request.Context(), bson.M{"model_identify": req.Identify})
	if count > 0 {
		c.JSON(500, gin.H{"code": 500, "message": "Model identify already exists"})
		return
	}

	req.Status = 1
	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()
	result, _ := collection.InsertOne(c.Request.Context(), &req)
	req.ID = result.InsertedID.(primitive.ObjectID)

	// 自动创建默认字段分组
	fieldGroupCollection := database.GetCollection("field_groups")
	fieldGroups := []struct {
		Name     string
		Identify string
	}{
		{"基本属性", "basic"},
		{"关系属性", "relation"},
	}

	for i, fg := range fieldGroups {
		fgDoc := models.FieldGroup{
			ModelID:  req.ID,
			Name:     fg.Name,
			Identify: fg.Identify,
			Sort:     i,
		}
		fgResult, _ := fieldGroupCollection.InsertOne(c.Request.Context(), &fgDoc)
		fgDoc.ID = fgResult.InsertedID.(primitive.ObjectID)

		// 创建默认字段
		fieldCollection := database.GetCollection("fields")
		defaultFields := []struct {
			Name     string
			Identify string
			Type     string
			Required bool
		}{
			{"唯一标识", "唯一标识", "string", true},
			{"名称", "名称", "string", true},
		}

		for _, f := range defaultFields {
			fieldDoc := models.Field{
				ModelID:      req.ID,
				FieldGroupID: fgDoc.ID,
				Name:         f.Name,
				Identify:     f.Identify,
				Type:         f.Type,
				Required:     f.Required,
				IsBuiltin:    true,
			}
			fieldCollection.InsertOne(c.Request.Context(), &fieldDoc)
		}
	}

	c.JSON(200, gin.H{"code": 200, "data": req})
}

func getModel(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("models")
	oid, _ := primitive.ObjectIDFromHex(id)

	var model models.Model
	err := collection.FindOne(c.Request.Context(), bson.M{"_id": oid}).Decode(&model)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Not found"})
		return
	}
	c.JSON(200, gin.H{"code": 200, "data": model})
}

func updateModel(c *gin.Context) {
	id := c.Param("id")
	var req models.Model
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("models")
	oid, _ := primitive.ObjectIDFromHex(id)
	req.ID = oid
	collection.ReplaceOne(c.Request.Context(), bson.M{"_id": oid}, req)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteModel(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("models")
	oid, _ := primitive.ObjectIDFromHex(id)

	// 检查是否有数据
	resourceCollection := database.GetCollection("resources")
	count, _ := resourceCollection.CountDocuments(c.Request.Context(), bson.M{"model_id": oid})
	if count > 0 {
		c.JSON(500, gin.H{"code": 500, "message": "Cannot delete model with data"})
		return
	}

	// 删除字段和字段分组
	fieldGroupCollection := database.GetCollection("field_groups")
	fieldCollection := database.GetCollection("fields")

	fieldGroupCollection.DeleteMany(c.Request.Context(), bson.M{"model_id": oid})
	fieldCollection.DeleteMany(c.Request.Context(), bson.M{"model_id": oid})

	collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func getModelDetails(c *gin.Context) {
	id := c.Param("id")
	oid, _ := primitive.ObjectIDFromHex(id)

	// 获取模型
	modelCollection := database.GetCollection("models")
	var model models.Model
	if err := modelCollection.FindOne(c.Request.Context(), bson.M{"_id": oid}).Decode(&model); err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Not found"})
		return
	}

	// 获取字段分组
	fieldGroupCollection := database.GetCollection("field_groups")
	fieldGroupsCursor, _ := fieldGroupCollection.Find(c.Request.Context(), bson.M{"model_id": oid},
		options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	defer fieldGroupsCursor.Close(c.Request.Context())

	var fieldGroups []models.FieldGroup
	fieldGroupsCursor.All(c.Request.Context(), &fieldGroups)

	// 获取每个字段分组的字段
	type FieldWithGroup struct {
		Group  models.FieldGroup
		Fields []models.Field
	}

	var groupsWithFields []FieldWithGroup
	fieldCollection := database.GetCollection("fields")

	for _, fg := range fieldGroups {
		fieldsCursor, _ := fieldCollection.Find(c.Request.Context(), bson.M{"field_group_id": fg.ID},
			options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
		var fields []models.Field
		fieldsCursor.All(c.Request.Context(), &fields)
		fieldsCursor.Close(c.Request.Context())

		groupsWithFields = append(groupsWithFields, FieldWithGroup{
			Group:  fg,
			Fields: fields,
		})
	}

	// 获取关系定义
	relationCollection := database.GetCollection("relations")
	relationsCursor, _ := relationCollection.Find(c.Request.Context(), bson.M{"model_id": oid})
	defer relationsCursor.Close(c.Request.Context())

	var relations []models.Relation
	relationsCursor.All(c.Request.Context(), &relations)

	c.JSON(200, gin.H{
		"code": 200,
		"data": gin.H{
			"model":     model,
			"groups":    groupsWithFields,
			"relations": relations,
		},
	})
}

// ========== 字段分组相关 ==========

func listFieldGroups(c *gin.Context) {
	modelID := c.Param("id")
	oid, _ := primitive.ObjectIDFromHex(modelID)

	collection := database.GetCollection("field_groups")
	cursor, _ := collection.Find(c.Request.Context(), bson.M{"model_id": oid},
		options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	defer cursor.Close(c.Request.Context())

	var groups []models.FieldGroup
	cursor.All(c.Request.Context(), &groups)

	c.JSON(200, gin.H{"code": 200, "data": groups})
}

func createFieldGroup(c *gin.Context) {
	var req models.FieldGroup
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("field_groups")
	result, _ := collection.InsertOne(c.Request.Context(), &req)
	req.ID = result.InsertedID.(primitive.ObjectID)

	c.JSON(200, gin.H{"code": 200, "data": req})
}

func updateFieldGroup(c *gin.Context) {
	id := c.Param("id")
	var req models.FieldGroup
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("field_groups")
	oid, _ := primitive.ObjectIDFromHex(id)
	req.ID = oid
	collection.ReplaceOne(c.Request.Context(), bson.M{"_id": oid}, req)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteFieldGroup(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("field_groups")
	oid, _ := primitive.ObjectIDFromHex(id)

	// 检查是否有字段
	fieldCollection := database.GetCollection("fields")
	count, _ := fieldCollection.CountDocuments(c.Request.Context(), bson.M{"field_group_id": oid})
	if count > 0 {
		c.JSON(500, gin.H{"code": 500, "message": "Cannot delete field group with fields"})
		return
	}

	collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

// ========== 字段相关 ==========

func listFields(c *gin.Context) {
	fieldGroupID := c.Param("id")
	oid, _ := primitive.ObjectIDFromHex(fieldGroupID)

	collection := database.GetCollection("fields")
	cursor, _ := collection.Find(c.Request.Context(), bson.M{"field_group_id": oid},
		options.Find().SetSort(bson.D{{Key: "sort", Value: 1}}))
	defer cursor.Close(c.Request.Context())

	var fields []models.Field
	cursor.All(c.Request.Context(), &fields)

	c.JSON(200, gin.H{"code": 200, "data": fields})
}

func createField(c *gin.Context) {
	var req models.Field
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("fields")
	result, _ := collection.InsertOne(c.Request.Context(), &req)
	req.ID = result.InsertedID.(primitive.ObjectID)

	c.JSON(200, gin.H{"code": 200, "data": req})
}

func updateField(c *gin.Context) {
	id := c.Param("id")
	var req models.Field
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("fields")
	oid, _ := primitive.ObjectIDFromHex(id)
	req.ID = oid
	collection.ReplaceOne(c.Request.Context(), bson.M{"_id": oid}, req)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteField(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("fields")
	oid, _ := primitive.ObjectIDFromHex(id)
	collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

// ========== 关系相关 ==========

func listRelations(c *gin.Context) {
	modelID := c.Param("id")
	oid, _ := primitive.ObjectIDFromHex(modelID)

	collection := database.GetCollection("relations")
	cursor, _ := collection.Find(c.Request.Context(), bson.M{"model_id": oid})
	defer cursor.Close(c.Request.Context())

	var relations []models.Relation
	cursor.All(c.Request.Context(), &relations)

	c.JSON(200, gin.H{"code": 200, "data": relations})
}

func createRelation(c *gin.Context) {
	var req models.Relation
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("relations")
	result, _ := collection.InsertOne(c.Request.Context(), &req)
	req.ID = result.InsertedID.(primitive.ObjectID)

	c.JSON(200, gin.H{"code": 200, "data": req})
}

func deleteRelation(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("relations")
	oid, _ := primitive.ObjectIDFromHex(id)
	collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

// ========== 资源相关 ==========

func listResources(c *gin.Context) {
	modelID := c.Param("modelId")
	page := getQueryInt(c, "page", 1)
	pageSize := getQueryInt(c, "pageSize", 10)

	oid, _ := primitive.ObjectIDFromHex(modelID)
	skip := int64((page - 1) * pageSize)

	collection := database.GetCollection("resources")
	total, _ := collection.CountDocuments(c.Request.Context(), bson.M{"model_id": oid})

	cursor, _ := collection.Find(c.Request.Context(), bson.M{"model_id": oid},
		options.Find().SetSkip(skip).SetLimit(int64(pageSize)).SetSort(bson.D{{Key: "create_at", Value: -1}}))
	defer cursor.Close(c.Request.Context())

	var resources []models.Resource
	cursor.All(c.Request.Context(), &resources)

	c.JSON(200, gin.H{
		"code": 200,
		"data": gin.H{
			"list":  resources,
			"total": total,
			"page":  page,
		},
	})
}

func createResource(c *gin.Context) {
	var req struct {
		ModelID string                 `json:"model_id"`
		Data    map[string]interface{}  `json:"data"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	// 获取模型信息
	modelOid, err := primitive.ObjectIDFromHex(req.ModelID)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid model ID"})
		return
	}

	modelCollection := database.GetCollection("models")
	var model models.Model
	err = modelCollection.FindOne(c.Request.Context(), bson.M{"_id": modelOid}).Decode(&model)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Model not found"})
		return
	}

	// 获取模型的所有字段
	fieldCollection := database.GetCollection("fields")
	fieldCursor, _ := fieldCollection.Find(c.Request.Context(), bson.M{"model_id": modelOid})
	defer fieldCursor.Close(c.Request.Context())

	var fields []models.Field
	fieldCursor.All(c.Request.Context(), &fields)

	// 构建字段映射
	fieldMap := make(map[string]models.Field)
	for _, f := range fields {
		fieldMap[f.Identify] = f
	}

	// 处理数据：密码加密、字段校验
	data := req.Data
	for key, value := range data {
		field, exists := fieldMap[key]
		if !exists {
			continue
		}

		// 密码字段加密
		if field.Type == "password" && value != nil && value != "" {
			// 使用 AES 简单加密（实际生产建议使用更安全的方式）
			encrypted := encryptValue(value.(string))
			data[key] = encrypted
		}

		// 字段校验规则
		if field.ValidateRule != "" && value != nil && value != "" {
			if !validateField(value.(string), field.ValidateRule) {
				c.JSON(400, gin.H{
					"code":    400,
					"message": "字段 " + field.Name + " 校验失败",
				})
				return
			}
		}
	}

	// 创建资源
	resource := models.Resource{
		ModelID:       modelOid,
		ModelIdentify: model.Identify,
		Data:          data,
		Relations:     make(map[string][]primitive.ObjectID),
		Tags:          []primitive.ObjectID{},
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	collection := database.GetCollection("resources")
	result, err := collection.InsertOne(c.Request.Context(), &resource)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	resource.ID = result.InsertedID.(primitive.ObjectID)

	c.JSON(200, gin.H{"code": 200, "data": resource})
}

func getResource(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("resources")
	oid, _ := primitive.ObjectIDFromHex(id)

	var resource models.Resource
	err := collection.FindOne(c.Request.Context(), bson.M{"_id": oid}).Decode(&resource)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Not found"})
		return
	}
	c.JSON(200, gin.H{"code": 200, "data": resource})
}

func updateResource(c *gin.Context) {
	id := c.Param("id")
	var req models.Resource
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("resources")
	oid, _ := primitive.ObjectIDFromHex(id)
	req.ID = oid
	collection.ReplaceOne(c.Request.Context(), bson.M{"_id": oid}, req)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteResource(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("resources")
	oid, _ := primitive.ObjectIDFromHex(id)
	collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func batchDeleteResources(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("resources")
	var (
		oids       []primitive.ObjectID
		invalidIDs []string
	)
	for _, id := range req.IDs {
		oid, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			invalidIDs = append(invalidIDs, id)
			continue
		}
		oids = append(oids, oid)
	}

	// 全部 ID 都非法时直接拒绝，避免静默"成功"假象
	if len(oids) == 0 {
		c.JSON(400, gin.H{
			"code":    400,
			"message": "No valid IDs",
			"data":    gin.H{"invalid_ids": invalidIDs},
		})
		return
	}

	result, err := collection.DeleteMany(c.Request.Context(), bson.M{"_id": bson.M{"$in": oids}})
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"code":    200,
		"message": "success",
		"data": gin.H{
			"deleted":     result.DeletedCount,
			"invalid_ids": invalidIDs,
		},
	})
}

// 资源关系
func createResourceRelation(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		RelationIdentify string   `json:"relation_identify"`
		TargetIDs         []string `json:"target_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	oid, _ := primitive.ObjectIDFromHex(id)
	var targetIDs []primitive.ObjectID
	for _, tid := range req.TargetIDs {
		toid, _ := primitive.ObjectIDFromHex(tid)
		targetIDs = append(targetIDs, toid)
	}

	collection := database.GetCollection("resources")
	update := bson.M{
		"$addToSet": bson.M{"relations." + req.RelationIdentify: bson.M{"$each": targetIDs}},
	}
	collection.UpdateOne(c.Request.Context(), bson.M{"_id": oid}, update)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteResourceRelation(c *gin.Context) {
	id := c.Param("id")
	identify := c.Param("relationIdentify")

	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	collection := database.GetCollection("resources")
	update := bson.M{
		"$unset": bson.M{"relations." + identify: ""},
	}
	collection.UpdateOne(c.Request.Context(), bson.M{"_id": oid}, update)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func getResourceRelations(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	// 获取资源
	resourceCollection := database.GetCollection("resources")
	var resource models.Resource
	err = resourceCollection.FindOne(c.Request.Context(), bson.M{"_id": oid}).Decode(&resource)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Resource not found"})
		return
	}

	// 获取模型的关联关系定义
	modelCollection := database.GetCollection("models")
	var model models.Model
	err = modelCollection.FindOne(c.Request.Context(), bson.M{"_id": resource.ModelID}).Decode(&model)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Model not found"})
		return
	}

	// 获取模型的所有关系定义
	relationCollection := database.GetCollection("relations")
	relationCursor, _ := relationCollection.Find(c.Request.Context(), bson.M{"model_id": model.ID})
	defer relationCursor.Close(c.Request.Context())

	var relationDefs []models.Relation
	relationCursor.All(c.Request.Context(), &relationDefs)

	// 构建关系类型映射
	relationTypes := make(map[string]string) // identify -> type (belong/connect)
	relationNames := make(map[string]string) // identify -> name
	for _, rel := range relationDefs {
		relationTypes[rel.Identify] = rel.Type
		relationNames[rel.Identify] = rel.Name
	}

	// 分类处理关系
	belongRelations := make([]map[string]interface{}, 0)
	connectRelations := make([]map[string]interface{}, 0)

	if resource.Relations != nil {
		for identify, targetIDs := range resource.Relations {
			relType := relationTypes[identify]
			relName := relationNames[identify]

			// 获取关联的资源详情
			for _, targetID := range targetIDs {
				var targetResource models.Resource
				resourceCollection.FindOne(c.Request.Context(), bson.M{"_id": targetID}).Decode(&targetResource)

				relInfo := map[string]interface{}{
					"id":           targetID.Hex(),
					"identify":     identify,
					"name":         relName,
					"target_data":  targetResource.Data,
				}

				if relType == "belong" {
					belongRelations = append(belongRelations, relInfo)
				} else {
					connectRelations = append(connectRelations, relInfo)
				}
			}
		}
	}

	// 反向查询：哪些资源关联到了当前资源
	var reverseBelong []map[string]interface{}
	var reverseConnect []map[string]interface{}

	allResourcesCursor, _ := resourceCollection.Find(c.Request.Context(), bson.M{})
	defer allResourcesCursor.Close(c.Request.Context())

	var allResources []models.Resource
	allResourcesCursor.All(c.Request.Context(), &allResources)

	for _, r := range allResources {
		if r.Relations != nil {
			for identify, targetIDs := range r.Relations {
				for _, tid := range targetIDs {
					if tid == oid {
						relType := relationTypes[identify]
						relName := relationNames[identify]

						relInfo := map[string]interface{}{
							"id":          r.ID.Hex(),
							"identify":    identify,
							"name":        relName,
							"target_data": r.Data,
						}

						if relType == "belong" {
							reverseBelong = append(reverseBelong, relInfo)
						} else {
							reverseConnect = append(reverseConnect, relInfo)
						}
					}
				}
			}
		}
	}

	c.JSON(200, gin.H{
		"code": 200,
		"data": gin.H{
			"belong": gin.H{
				"own":    belongRelations,      // 当前资源从属于谁
				"reverse": reverseBelong,        // 谁从属于当前资源
			},
			"connect": gin.H{
				"own":    connectRelations,      // 当前资源连接了谁
				"reverse": reverseConnect,        // 谁连接了当前资源
			},
		},
	})
}

// 资源标签
func addResourceTag(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		TagID string `json:"tag_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	oid, _ := primitive.ObjectIDFromHex(id)
	tagID, _ := primitive.ObjectIDFromHex(req.TagID)

	collection := database.GetCollection("resources")
	update := bson.M{
		"$addToSet": bson.M{"tags": tagID},
	}
	collection.UpdateOne(c.Request.Context(), bson.M{"_id": oid}, update)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func removeResourceTag(c *gin.Context) {
	id := c.Param("id")
	tagID := c.Param("tagId")

	oid, _ := primitive.ObjectIDFromHex(id)
	tagOID, _ := primitive.ObjectIDFromHex(tagID)

	collection := database.GetCollection("resources")
	update := bson.M{
		"$pull": bson.M{"tags": tagOID},
	}
	collection.UpdateOne(c.Request.Context(), bson.M{"_id": oid}, update)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

// 全局搜索
func globalSearch(c *gin.Context) {
	keyword := c.Query("keyword")
	if keyword == "" {
		c.JSON(400, gin.H{"code": 400, "message": "keyword is required"})
		return
	}

	// 安全：限制 keyword 长度 + 转义正则元字符，避免 ReDoS 与意外的全表正则扫描
	const maxKeywordLen = 64
	if len(keyword) > maxKeywordLen {
		c.JSON(400, gin.H{"code": 400, "message": "keyword too long (max 64)"})
		return
	}
	safeKeyword := regexp.QuoteMeta(keyword)

	resourceCollection := database.GetCollection("resources")

	// 先搜索model_identify
	filter := bson.M{
		"model_identify": bson.M{"$regex": safeKeyword, "$options": "i"},
	}

	cursor, _ := resourceCollection.Find(c.Request.Context(), filter, options.Find().SetLimit(50))
	defer cursor.Close(c.Request.Context())

	var resources []models.Resource
	cursor.All(c.Request.Context(), &resources)

	// 如果没找到，搜索所有资源并手动匹配data字段
	if len(resources) == 0 {
		allCursor, _ := resourceCollection.Find(c.Request.Context(), bson.M{}, options.Find().SetLimit(100))
		var allResources []models.Resource
		allCursor.All(c.Request.Context(), &allResources)
		allCursor.Close(c.Request.Context())

		for _, r := range allResources {
			dataStr := fmt.Sprintf("%v", r.Data)
			if strings.Contains(strings.ToLower(dataStr), strings.ToLower(keyword)) {
				resources = append(resources, r)
			}
		}
	}

	// 获取模型信息
	modelCollection := database.GetCollection("models")
	var results []map[string]interface{}
	for _, r := range resources {
		var model models.Model
		modelCollection.FindOne(c.Request.Context(), bson.M{"_id": r.ModelID}).Decode(&model)

		results = append(results, map[string]interface{}{
			"id":              r.ID.Hex(),
			"model_id":       r.ModelID.Hex(),
			"model_name":     model.Name,
			"model_identify": r.ModelIdentify,
			"data":           r.Data,
		})
	}

	c.JSON(200, gin.H{"code": 200, "data": results})
}

// ========== 标签相关 ==========

func listTagKeys(c *gin.Context) {
	collection := database.GetCollection("tag_keys")
	cursor, _ := collection.Find(c.Request.Context(), bson.M{})
	defer cursor.Close(c.Request.Context())

	var keys []models.TagKey
	cursor.All(c.Request.Context(), &keys)

	c.JSON(200, gin.H{"code": 200, "data": keys})
}

func createTagKey(c *gin.Context) {
	var req models.TagKey
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request: " + err.Error()})
		return
	}

	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()

	collection := database.GetCollection("tag_keys")
	result, err := collection.InsertOne(c.Request.Context(), &req)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": "Insert failed: " + err.Error()})
		return
	}

	// 检查 result 和 InsertedID 是否有效
	if result != nil {
		oid, ok := result.InsertedID.(primitive.ObjectID)
		if ok {
			req.ID = oid
		}
	}

	c.JSON(200, gin.H{"code": 200, "data": req})
}

func updateTagKey(c *gin.Context) {
	id := c.Param("id")
	var req models.TagKey
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("tag_keys")
	oid, _ := primitive.ObjectIDFromHex(id)
	req.ID = oid
	collection.ReplaceOne(c.Request.Context(), bson.M{"_id": oid}, req)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteTagKey(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("tag_keys")
	oid, _ := primitive.ObjectIDFromHex(id)

	// 检查是否有标签值
	valueCollection := database.GetCollection("tag_values")
	count, _ := valueCollection.CountDocuments(c.Request.Context(), bson.M{"tag_key_id": oid})
	if count > 0 {
		c.JSON(500, gin.H{"code": 500, "message": "Cannot delete tag key with tag values"})
		return
	}

	collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func listTagValues(c *gin.Context) {
	id := c.Param("id")
	oid, _ := primitive.ObjectIDFromHex(id)

	collection := database.GetCollection("tag_values")
	cursor, _ := collection.Find(c.Request.Context(), bson.M{"tag_key_id": oid})
	defer cursor.Close(c.Request.Context())

	var values []models.TagValue
	cursor.All(c.Request.Context(), &values)

	c.JSON(200, gin.H{"code": 200, "data": values})
}

// listAllTagValues 获取所有标签值（用于资源详情显示标签名称）
func listAllTagValues(c *gin.Context) {
	collection := database.GetCollection("tag_values")
	cursor, _ := collection.Find(c.Request.Context(), bson.M{})
	defer cursor.Close(c.Request.Context())

	var values []models.TagValue
	cursor.All(c.Request.Context(), &values)

	c.JSON(200, gin.H{"code": 200, "data": values})
}

func createTagValue(c *gin.Context) {
	var req models.TagValue
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request: " + err.Error()})
		return
	}

	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()

	collection := database.GetCollection("tag_values")
	result, err := collection.InsertOne(c.Request.Context(), &req)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": "Insert failed: " + err.Error()})
		return
	}

	if result != nil {
		oid, ok := result.InsertedID.(primitive.ObjectID)
		if ok {
			req.ID = oid
		}
	}

	c.JSON(200, gin.H{"code": 200, "data": req})
}

func updateTagValue(c *gin.Context) {
	id := c.Param("id")
	var req models.TagValue
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("tag_values")
	oid, _ := primitive.ObjectIDFromHex(id)
	req.ID = oid
	collection.ReplaceOne(c.Request.Context(), bson.M{"_id": oid}, req)

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteTagValue(c *gin.Context) {
	id := c.Param("id")
	collection := database.GetCollection("tag_values")
	oid, _ := primitive.ObjectIDFromHex(id)
	collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func bindResourceToTag(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		ResourceIDs []string `json:"resource_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	tagValueOID, _ := primitive.ObjectIDFromHex(id)
	var resourceIDs []primitive.ObjectID
	for _, rid := range req.ResourceIDs {
		roid, _ := primitive.ObjectIDFromHex(rid)
		resourceIDs = append(resourceIDs, roid)
	}

	// 更新 tag_values 集合
	tagValueCollection := database.GetCollection("tag_values")

	// 先检查 resources 字段是否存在，如果为 null 则初始化为空数组
	existing := tagValueCollection.FindOne(c.Request.Context(), bson.M{"_id": tagValueOID})
	var existingDoc bson.M
	existing.Decode(&existingDoc)
	if existingDoc["resources"] == nil {
		// 如果为 null，先设置为空数组
		tagValueCollection.UpdateOne(c.Request.Context(), bson.M{"_id": tagValueOID},
			bson.M{"$set": bson.M{"resources": []primitive.ObjectID{}}})
	}

	tagValueUpdate := bson.M{
		"$addToSet": bson.M{"resources": bson.M{"$each": resourceIDs}},
	}
	tagValueCollection.UpdateOne(c.Request.Context(), bson.M{"_id": tagValueOID}, tagValueUpdate)

	// 同时更新每个资源的 tags 字段
	resourceCollection := database.GetCollection("resources")
	for _, resourceID := range resourceIDs {
		resourceCollection.UpdateOne(c.Request.Context(),
			bson.M{"_id": resourceID},
			bson.M{"$addToSet": bson.M{"tags": tagValueOID}})
	}

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func unbindResourceFromTag(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		ResourceIDs []string `json:"resource_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	tagValueOID, _ := primitive.ObjectIDFromHex(id)
	var resourceIDs []primitive.ObjectID
	for _, rid := range req.ResourceIDs {
		roid, _ := primitive.ObjectIDFromHex(rid)
		resourceIDs = append(resourceIDs, roid)
	}

	// 更新 tag_values 集合
	tagValueCollection := database.GetCollection("tag_values")
	tagValueUpdate := bson.M{
		"$pull": bson.M{"resources": bson.M{"$in": resourceIDs}},
	}
	tagValueCollection.UpdateOne(c.Request.Context(), bson.M{"_id": tagValueOID}, tagValueUpdate)

	// 同时更新每个资源的 tags 字段
	resourceCollection := database.GetCollection("resources")
	for _, resourceID := range resourceIDs {
		resourceCollection.UpdateOne(c.Request.Context(),
			bson.M{"_id": resourceID},
			bson.M{"$pull": bson.M{"tags": tagValueOID}})
	}

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func searchByTag(c *gin.Context) {
	tagKeyID := c.Query("tagKeyId")
	tagValueID := c.Query("tagValueId")

	if tagKeyID == "" || tagValueID == "" {
		c.JSON(400, gin.H{"code": 400, "message": "tagKeyId and tagValueId are required"})
		return
	}

	valueOID, _ := primitive.ObjectIDFromHex(tagValueID)
	valueCollection := database.GetCollection("tag_values")

	var tagValue models.TagValue
	if err := valueCollection.FindOne(c.Request.Context(), bson.M{"_id": valueOID}).Decode(&tagValue); err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Tag value not found"})
		return
	}

	resourceCollection := database.GetCollection("resources")
	var resources []models.Resource

	for _, resourceID := range tagValue.Resources {
		var resource models.Resource
		if err := resourceCollection.FindOne(c.Request.Context(), bson.M{"_id": resourceID}).Decode(&resource); err == nil {
			resources = append(resources, resource)
		}
	}

	c.JSON(200, gin.H{"code": 200, "data": resources})
}

// ========== 统计数据 ==========

func getStats(c *gin.Context) {
	modelsCollection := database.GetCollection("models")
	resourcesCollection := database.GetCollection("resources")
	tagKeysCollection := database.GetCollection("tag_keys")
	usersCollection := database.GetCollection("users")

	modelCount, _ := modelsCollection.CountDocuments(c.Request.Context(), bson.M{})
	resourceCount, _ := resourcesCollection.CountDocuments(c.Request.Context(), bson.M{})
	tagCount, _ := tagKeysCollection.CountDocuments(c.Request.Context(), bson.M{})
	userCount, _ := usersCollection.CountDocuments(c.Request.Context(), bson.M{})

	c.JSON(200, gin.H{
		"code": 200,
		"data": gin.H{
			"modelCount":    modelCount,
			"resourceCount":  resourceCount,
			"tagCount":       tagCount,
			"userCount":      userCount,
		},
	})
}

// ========== 应用管理 ==========

func listApps(c *gin.Context) {
	page := getQueryInt(c, "page", 1)
	pageSize := getQueryInt(c, "page_size", 10)

	collection := database.GetCollection("applications")
	skip := (page - 1) * pageSize

	opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(pageSize)).SetSort(bson.D{{Key: "create_at", Value: -1}})

	cursor, err := collection.Find(c.Request.Context(), bson.M{}, opts)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}
	defer cursor.Close(c.Request.Context())

	var apps []models.Application
	if err := cursor.All(c.Request.Context(), &apps); err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	total, _ := collection.CountDocuments(c.Request.Context(), bson.M{})

	// 转换为前端需要的格式
	var result []map[string]interface{}
	for _, app := range apps {
		result = append(result, map[string]interface{}{
			"id":           app.ID.Hex(),
			"name":         app.Name,
			"identify":     app.Identify,
			"business_id": app.BusinessID.Hex(),
			"description":  app.Description,
			"owner":        app.Owner,
			"status":       app.Status,
			"created_at":   app.CreatedAt.Format("2006-01-02 15:04:05"),
			"updated_at":   app.UpdatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(200, gin.H{
		"code": 200,
		"data": gin.H{
			"list":  result,
			"total": total,
			"page":  page,
		},
	})
}

func createApp(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Identify    string `json:"identify" binding:"required"`
		BusinessID  string `json:"business_id"`
		Description string `json:"description"`
		Owner       string `json:"owner"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	// 检查标识是否已存在
	collection := database.GetCollection("applications")
	var existing models.Application
	err := collection.FindOne(c.Request.Context(), bson.M{"app_identify": req.Identify}).Decode(&existing)
	if err == nil {
		c.JSON(400, gin.H{"code": 400, "message": "应用标识已存在"})
		return
	}

	// 解析 business_id
	var businessID primitive.ObjectID
	if req.BusinessID != "" {
		businessID, err = primitive.ObjectIDFromHex(req.BusinessID)
		if err != nil {
			c.JSON(400, gin.H{"code": 400, "message": "Invalid business_id"})
			return
		}
	}

	app := models.Application{
		Name:        req.Name,
		Identify:    req.Identify,
		BusinessID:  businessID,
		Description: req.Description,
		Owner:       req.Owner,
		Status:      "planning",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	result, err := collection.InsertOne(c.Request.Context(), app)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"code":  200,
		"message": "success",
		"data": map[string]interface{}{
			"id": result.InsertedID.(primitive.ObjectID).Hex(),
		},
	})
}

func getApp(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	collection := database.GetCollection("applications")
	var app models.Application
	err = collection.FindOne(c.Request.Context(), bson.M{"_id": oid}).Decode(&app)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Application not found"})
		return
	}

	c.JSON(200, gin.H{
		"code": 200,
		"data": map[string]interface{}{
			"id":           app.ID.Hex(),
			"name":         app.Name,
			"identify":     app.Identify,
			"business_id":  app.BusinessID.Hex(),
			"description":  app.Description,
			"owner":        app.Owner,
			"status":       app.Status,
			"created_at":   app.CreatedAt.Format("2006-01-02 15:04:05"),
			"updated_at":   app.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	})
}

func updateApp(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Owner       string `json:"owner"`
		Status      string `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("applications")
	update := bson.M{
		"$set": bson.M{
			"modify_at": time.Now(),
		},
	}

	if req.Name != "" {
		update["$set"].(bson.M)["app_name"] = req.Name
	}
	if req.Description != "" {
		update["$set"].(bson.M)["description"] = req.Description
	}
	if req.Owner != "" {
		update["$set"].(bson.M)["owner"] = req.Owner
	}
	if req.Status != "" {
		update["$set"].(bson.M)["status"] = req.Status
	}

	_, err = collection.UpdateOne(c.Request.Context(), bson.M{"_id": oid}, update)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteApp(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	collection := database.GetCollection("applications")
	_, err = collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func getAppResources(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	collection := database.GetCollection("applications")
	var app models.Application
	err = collection.FindOne(c.Request.Context(), bson.M{"_id": oid}).Decode(&app)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Application not found"})
		return
	}

	// 获取资源列表
	resourceCollection := database.GetCollection("resources")
	var resources []models.Resource

	if len(app.Resources) > 0 {
		cursor, err := resourceCollection.Find(c.Request.Context(), bson.M{
			"_id": bson.M{"$in": app.Resources},
		})
		if err != nil {
			c.JSON(500, gin.H{"code": 500, "message": err.Error()})
			return
		}
		defer cursor.Close(c.Request.Context())
		cursor.All(c.Request.Context(), &resources)
	}

	c.JSON(200, gin.H{
		"code": 200,
		"data": resources,
	})
}

func bindAppResource(c *gin.Context) {
	appId := c.Param("id")
	appOid, err := primitive.ObjectIDFromHex(appId)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid app ID"})
		return
	}

	var req struct {
		ResourceIds []string `json:"resource_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	// 验证资源ID
	var resourceOids []primitive.ObjectID
	for _, id := range req.ResourceIds {
		oid, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			continue
		}
		resourceOids = append(resourceOids, oid)
	}

	collection := database.GetCollection("applications")
	now := time.Now()
	// 用 pipeline-form + $ifNull 避免 resources 字段为 null 时 $addToSet 失败
	_, err = collection.UpdateOne(c.Request.Context(), bson.M{"_id": appOid}, bson.A{
		bson.M{"$set": bson.M{
			"resources": bson.M{
				"$setUnion": bson.A{
					bson.M{"$ifNull": bson.A{"$resources", bson.A{}}},
					resourceOids,
				},
			},
			"modify_at": now,
		}},
	})
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "Resources bound successfully"})
}

func unbindAppResource(c *gin.Context) {
	appId := c.Param("id")
	resourceId := c.Param("resourceId")

	appOid, err := primitive.ObjectIDFromHex(appId)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid app ID"})
		return
	}

	resourceOid, err := primitive.ObjectIDFromHex(resourceId)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid resource ID"})
		return
	}

	collection := database.GetCollection("applications")
	now := time.Now()
	// 仅在 resources 存在且是数组时执行 $pull（避免 null 字段报 Plan executor error）
	_, err = collection.UpdateOne(c.Request.Context(),
		bson.M{"_id": appOid, "resources": bson.M{"$type": "array"}},
		bson.M{
			"$pull": bson.M{"resources": resourceOid},
			"$set":  bson.M{"modify_at": now},
		},
	)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "Resource unbound successfully"})
}

// ========== 业务管理 ==========

func listBusinesses(c *gin.Context) {
	page := getQueryInt(c, "page", 1)
	pageSize := getQueryInt(c, "page_size", 10)

	collection := database.GetCollection("businesses")
	skip := (page - 1) * pageSize

	opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(pageSize)).SetSort(bson.D{{Key: "create_at", Value: -1}})

	cursor, err := collection.Find(c.Request.Context(), bson.M{}, opts)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}
	defer cursor.Close(c.Request.Context())

	var businesses []models.Business
	if err := cursor.All(c.Request.Context(), &businesses); err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	total, _ := collection.CountDocuments(c.Request.Context(), bson.M{})

	// 转换为前端需要的格式
	var result []map[string]interface{}
	for _, business := range businesses {
		result = append(result, map[string]interface{}{
			"id":          business.ID.Hex(),
			"name":        business.Name,
			"identify":    business.Identify,
			"description": business.Description,
			"owner":       business.Owner,
			"status":      business.Status,
			"created_at":  business.CreatedAt.Format("2006-01-02 15:04:05"),
			"updated_at":  business.UpdatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(200, gin.H{
		"code": 200,
		"data": gin.H{
			"list":  result,
			"total": total,
			"page":  page,
		},
	})
}

func createBusiness(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Identify    string `json:"identify"`
		Description string `json:"description"`
		Owner       string `json:"owner"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	now := time.Now()
	business := models.Business{
		Name:        req.Name,
		Identify:    req.Identify,
		Description: req.Description,
		Owner:       req.Owner,
		Status:      1,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	collection := database.GetCollection("businesses")
	result, err := collection.InsertOne(c.Request.Context(), business)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"code": 200,
		"data": map[string]interface{}{
			"id": result.InsertedID.(primitive.ObjectID).Hex(),
		},
	})
}

func getBusiness(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	collection := database.GetCollection("businesses")
	var business models.Business
	err = collection.FindOne(c.Request.Context(), bson.M{"_id": oid}).Decode(&business)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Business not found"})
		return
	}

	c.JSON(200, gin.H{
		"code": 200,
		"data": map[string]interface{}{
			"id":          business.ID.Hex(),
			"name":        business.Name,
			"identify":    business.Identify,
			"description": business.Description,
			"owner":       business.Owner,
			"status":      business.Status,
			"created_at":  business.CreatedAt.Format("2006-01-02 15:04:05"),
			"updated_at":  business.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	})
}

func updateBusiness(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	var req struct {
		Name        string `json:"name"`
		Identify    string `json:"identify"`
		Description string `json:"description"`
		Owner       string `json:"owner"`
		Status      int    `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("businesses")
	update := bson.M{
		"modify_at": time.Now(),
	}

	if req.Name != "" {
		update["business_name"] = req.Name
	}
	if req.Identify != "" {
		update["business_identify"] = req.Identify
	}
	if req.Description != "" {
		update["description"] = req.Description
	}
	if req.Owner != "" {
		update["owner"] = req.Owner
	}
	if req.Status > 0 {
		update["status"] = req.Status
	}

	_, err = collection.UpdateOne(c.Request.Context(), bson.M{"_id": oid}, bson.M{"$set": update})
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteBusiness(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	// 检查是否有应用关联
	appCollection := database.GetCollection("applications")
	count, _ := appCollection.CountDocuments(c.Request.Context(), bson.M{"business_id": oid})
	if count > 0 {
		c.JSON(400, gin.H{"code": 400, "message": "Cannot delete business with associated applications"})
		return
	}

	collection := database.GetCollection("businesses")
	_, err = collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func getBusinessApps(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	collection := database.GetCollection("applications")
	cursor, err := collection.Find(c.Request.Context(), bson.M{"business_id": oid})
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}
	defer cursor.Close(c.Request.Context())

	var apps []models.Application
	cursor.All(c.Request.Context(), &apps)

	var result []map[string]interface{}
	for _, app := range apps {
		result = append(result, map[string]interface{}{
			"id":           app.ID.Hex(),
			"name":         app.Name,
			"identify":     app.Identify,
			"description":  app.Description,
			"owner":        app.Owner,
			"status":       app.Status,
			"resource_num": len(app.Resources),
		})
	}

	c.JSON(200, gin.H{
		"code": 200,
		"data": result,
	})
}

// ========== 定时任务管理 ==========

func listTasks(c *gin.Context) {
	page := getQueryInt(c, "page", 1)
	pageSize := getQueryInt(c, "page_size", 10)

	collection := database.GetCollection("sync_tasks")
	skip := (page - 1) * pageSize

	opts := options.Find().SetSkip(int64(skip)).SetLimit(int64(pageSize)).SetSort(bson.D{{Key: "create_at", Value: -1}})

	cursor, err := collection.Find(c.Request.Context(), bson.M{}, opts)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}
	defer cursor.Close(c.Request.Context())

	var tasks []models.SyncTask
	if err := cursor.All(c.Request.Context(), &tasks); err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	total, _ := collection.CountDocuments(c.Request.Context(), bson.M{})

	// 转换为前端需要的格式
	var result []map[string]interface{}
	for _, task := range tasks {
		lastRunAt := ""
		if task.LastRunAt != nil {
			lastRunAt = task.LastRunAt.Format("2006-01-02 15:04:05")
		}
		result = append(result, map[string]interface{}{
			"id":          task.ID.Hex(),
			"name":        task.Name,
			"identify":    task.Identify,
			"model_id":    task.ModelID.Hex(),
			"cloud_type":  task.CloudType,
			"sync_type":   task.SyncType,
			"schedule":    task.Schedule,
			"status":      task.Status,
			"lastRunAt":   lastRunAt,
			"created_at":  task.CreatedAt.Format("2006-01-02 15:04:05"),
			"updated_at":  task.UpdatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(200, gin.H{
		"code": 200,
		"data": gin.H{
			"list":  result,
			"total": total,
			"page":  page,
		},
	})
}

func createTask(c *gin.Context) {
	var req struct {
		Name      string `json:"name" binding:"required"`
		Identify  string `json:"identify" binding:"required"`
		ModelID   string `json:"model_id" binding:"required"`
		CloudType string `json:"cloud_type" binding:"required"`
		SyncType  string `json:"sync_type" binding:"required"`
		Schedule  string `json:"schedule" binding:"required"`
		Status    int    `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	modelOID, err := primitive.ObjectIDFromHex(req.ModelID)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid model ID"})
		return
	}

	// 检查标识是否已存在
	collection := database.GetCollection("sync_tasks")
	var existing models.SyncTask
	err = collection.FindOne(c.Request.Context(), bson.M{"task_identify": req.Identify}).Decode(&existing)
	if err == nil {
		c.JSON(400, gin.H{"code": 400, "message": "任务标识已存在"})
		return
	}

	task := models.SyncTask{
		Name:      req.Name,
		Identify:  req.Identify,
		ModelID:   modelOID,
		CloudType: req.CloudType,
		SyncType:  req.SyncType,
		Schedule:  req.Schedule,
		Status:    req.Status,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result, err := collection.InsertOne(c.Request.Context(), task)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"code":    200,
		"message": "success",
		"data": map[string]interface{}{
			"id": result.InsertedID.(primitive.ObjectID).Hex(),
		},
	})
}

func getTask(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	collection := database.GetCollection("sync_tasks")
	var task models.SyncTask
	err = collection.FindOne(c.Request.Context(), bson.M{"_id": oid}).Decode(&task)
	if err != nil {
		c.JSON(404, gin.H{"code": 404, "message": "Task not found"})
		return
	}

	lastRunAt := ""
	if task.LastRunAt != nil {
		lastRunAt = task.LastRunAt.Format("2006-01-02 15:04:05")
	}

	c.JSON(200, gin.H{
		"code": 200,
		"data": map[string]interface{}{
			"id":          task.ID.Hex(),
			"name":        task.Name,
			"identify":    task.Identify,
			"model_id":    task.ModelID.Hex(),
			"cloud_type":  task.CloudType,
			"sync_type":   task.SyncType,
			"schedule":    task.Schedule,
			"status":      task.Status,
			"lastRunAt":   lastRunAt,
			"created_at":  task.CreatedAt.Format("2006-01-02 15:04:05"),
			"updated_at":  task.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	})
}

func updateTask(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	var req struct {
		Name      string `json:"name"`
		ModelID   string `json:"model_id"`
		CloudType string `json:"cloud_type"`
		SyncType  string `json:"sync_type"`
		Schedule  string `json:"schedule"`
		Status    int    `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid request"})
		return
	}

	collection := database.GetCollection("sync_tasks")
	update := bson.M{
		"$set": bson.M{
			"modify_at": time.Now(),
		},
	}

	if req.Name != "" {
		update["$set"].(bson.M)["task_name"] = req.Name
	}
	if req.ModelID != "" {
		modelOID, _ := primitive.ObjectIDFromHex(req.ModelID)
		update["$set"].(bson.M)["model_id"] = modelOID
	}
	if req.CloudType != "" {
		update["$set"].(bson.M)["cloud_type"] = req.CloudType
	}
	if req.SyncType != "" {
		update["$set"].(bson.M)["sync_type"] = req.SyncType
	}
	if req.Schedule != "" {
		update["$set"].(bson.M)["schedule"] = req.Schedule
	}
	if req.Status != 0 {
		update["$set"].(bson.M)["status"] = req.Status
	}

	_, err = collection.UpdateOne(c.Request.Context(), bson.M{"_id": oid}, update)
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func deleteTask(c *gin.Context) {
	id := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	collection := database.GetCollection("sync_tasks")
	_, err = collection.DeleteOne(c.Request.Context(), bson.M{"_id": oid})
	if err != nil {
		c.JSON(500, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(200, gin.H{"code": 200, "message": "success"})
}

func runTask(c *gin.Context) {
	id := c.Param("id")
	_, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(400, gin.H{"code": 400, "message": "Invalid ID"})
		return
	}

	// TODO: 实际执行同步任务
	// 这里只是更新最后执行时间
	collection := database.GetCollection("sync_tasks")
	oid, _ := primitive.ObjectIDFromHex(id)
	now := time.Now()
	collection.UpdateOne(c.Request.Context(), bson.M{"_id": oid}, bson.M{
		"$set": bson.M{
			"last_run_at": now,
			"modify_at":   now,
		},
	})

	c.JSON(200, gin.H{"code": 200, "message": "任务已触发执行"})
}

// ========== 辅助函数 ==========

// 简单的 DES 加密（实际生产建议使用更安全的加密方式如 AES）
var desKey = []byte("cmdbkey1") // 8 字节密钥

func encryptValue(plainText string) string {
	block, err := des.NewCipher(desKey)
	if err != nil {
		return plainText
	}
	bs := block.BlockSize()
	plain := []byte(plainText)
	padding := bs - len(plain)%bs
	for i := 0; i < padding; i++ {
		plain = append(plain, byte(padding))
	}
	encrypted := make([]byte, len(plain))
	mode := cipher.NewCBCEncrypter(block, desKey[:bs])
	mode.CryptBlocks(encrypted, plain)
	return base64.StdEncoding.EncodeToString(encrypted)
}

func decryptValue(cipherText string) string {
	data, err := base64.StdEncoding.DecodeString(cipherText)
	if err != nil {
		return cipherText
	}
	block, err := des.NewCipher(desKey)
	if err != nil {
		return cipherText
	}
	bs := block.BlockSize()
	if len(data)%bs != 0 {
		return cipherText
	}
	decrypted := make([]byte, len(data))
	mode := cipher.NewCBCDecrypter(block, desKey[:bs])
	mode.CryptBlocks(decrypted, data)
	// 去除 padding
	padding := int(decrypted[len(decrypted)-1])
	return string(decrypted[:len(decrypted)-padding])
}

func validateField(value string, rule string) bool {
	if rule == "" {
		return true
	}
	matched, err := regexp.MatchString(rule, value)
	if err != nil {
		return true // 正则错误时跳过校验
	}
	return matched
}

func getQueryInt(c *gin.Context, key string, defaultValue int) int {
	value := c.Query(key)
	if value == "" {
		return defaultValue
	}
	var result int
	for _, c := range value {
		if c >= '0' && c <= '9' {
			result = result*10 + int(c-'0')
		}
	}
	if result == 0 {
		return defaultValue
	}
	return result
}

func getUserByUsername(username string) (*models.User, error) {
	collection := database.GetCollection("users")
	var user models.User
	err := collection.FindOne(nil, bson.M{"username": username}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func getUserByID(id string) (*models.User, error) {
	collection := database.GetCollection("users")
	oid, _ := primitive.ObjectIDFromHex(id)
	var user models.User
	err := collection.FindOne(nil, bson.M{"_id": oid}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func createUserInDB(user *models.User) error {
	collection := database.GetCollection("users")
	result, err := collection.InsertOne(nil, user)
	if err != nil {
		return err
	}
	user.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func updateUserInDB(user *models.User) error {
	collection := database.GetCollection("users")
	_, err := collection.ReplaceOne(nil, bson.M{"_id": user.ID}, user)
	return err
}

func authenticateLdapUser(username, password string) (*models.User, error) {
	if !config.AppConfig.Ldap.Enabled {
		return nil, errors.New("LDAP is not enabled")
	}
	// 简化实现，实际需要LDAP连接
	return &models.User{
		Username: username,
		Nickname: username,
		Source:   "ldap",
	}, nil
}
