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
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	collection *mongo.Collection
}

func NewUserService() *UserService {
	return &UserService{
		collection: database.GetCollection("users"),
	}
}

func (s *UserService) Create(user *models.User) error {
	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.Password = string(hashedPassword)
	user.Status = 1
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	_, err = s.collection.InsertOne(context.Background(), user)
	return err
}

func (s *UserService) GetByID(id string) (*models.User, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var user models.User
	err = s.collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) GetByUsername(username string) (*models.User, error) {
	var user models.User
	err := s.collection.FindOne(context.Background(), bson.M{"username": username}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) Update(user *models.User) error {
	user.UpdatedAt = time.Now()
	_, err := s.collection.ReplaceOne(context.Background(), bson.M{"_id": user.ID}, user)
	return err
}

func (s *UserService) Delete(id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = s.collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	return err
}

func (s *UserService) List(page, pageSize int) ([]*models.User, int64, error) {
	skip := (page - 1) * pageSize

	total, err := s.collection.CountDocuments(context.Background(), bson.M{})
	if err != nil {
		return nil, 0, err
	}

	cursor, err := s.collection.Find(context.Background(), bson.M{}, mongoopts(pageSize, skip))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(context.Background())

	var users []*models.User
	if err := cursor.All(context.Background(), &users); err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (s *UserService) Login(username, password string) (*models.User, error) {
	user, err := s.GetByUsername(username)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// 本地用户验证密码
	if user.Source == "local" {
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
			return nil, errors.New("invalid password")
		}
	} else {
		// LDAP/AD用户需要通过LDAP验证
		ldapService, err := NewLdapService()
		if err != nil {
			return nil, errors.New("LDAP service unavailable")
		}
		defer ldapService.Close()

		ldapUser, err := ldapService.Authenticate(username, password)
		if err != nil {
			return nil, err
		}

		// 同步LDAP用户信息到本地
		user.Nickname = ldapUser.Nickname
		user.Email = ldapUser.Email
		user.Phone = ldapUser.Phone
		_ = s.Update(user)
	}

	if user.Status == 0 {
		return nil, errors.New("user is disabled")
	}

	return user, nil
}

// CreateDefaultAdmin 创建默认管理员
func (s *UserService) CreateDefaultAdmin() error {
	count, err := s.collection.CountDocuments(context.Background(), bson.M{"role": "admin"})
	if err != nil {
		return err
	}

	if count == 0 {
		admin := &models.User{
			Username: "admin",
			Password: "admin123",
			Nickname: "Administrator",
			Email:    "admin@cmdb.local",
			Role:     "admin",
			Status:   1,
			Source:   "local",
		}
		return s.Create(admin)
	}

	return nil
}

func mongoopts(limit, skip int64) *mongo.FindOptions {
	return &mongo.FindOptions{
		Limit: &limit,
		Skip:  &skip,
		Sort:  bson.D{{Key: "create_at", Value: -1}},
	}
}
