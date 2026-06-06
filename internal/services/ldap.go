package services

import (
	"crypto/tls"
	"fmt"

	"cmdb/config"
	"cmdb/internal/models"

	"github.com/go-ldap/ldap/v3"
)

type LdapService struct {
	conn *ldap.Conn
}

func NewLdapService() (*LdapService, error) {
	if !config.AppConfig.Ldap.Enabled {
		return nil, fmt.Errorf("LDAP is not enabled")
	}

	var conn *ldap.Conn
	var err error

	ldapHost := config.AppConfig.Ldap.Host
	ldapPort := config.AppConfig.Ldap.Port

	if config.AppConfig.Ldap.UseSSL {
		conn, err = ldap.DialTLS("tcp", fmt.Sprintf("%s:%d", ldapHost, ldapPort), &tls.Config{InsecureSkipVerify: true})
	} else {
		conn, err = ldap.Dial("tcp", fmt.Sprintf("%s:%d", ldapHost, ldapPort))
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to LDAP server: %w", err)
	}

	// 绑定管理员账号
	if config.AppConfig.Ldap.Password != "" {
		err = conn.Bind(config.AppConfig.Ldap.UserDN, config.AppConfig.Ldap.Password)
		if err != nil {
			conn.Close()
			return nil, fmt.Errorf("failed to bind LDAP: %w", err)
		}
	}

	return &LdapService{conn: conn}, nil
}

func (s *LdapService) Close() {
	if s.conn != nil {
		s.conn.Close()
	}
}

// Authenticate 验证用户
func (s *LdapService) Authenticate(username, password string) (*models.User, error) {
	if s.conn == nil {
		return nil, fmt.Errorf("LDAP connection not initialized")
	}

	// AD域用户格式: username@domain 或 CN=username,OU=xxx,DC=domain
	var userDN string
	if config.AppConfig.Ldap.AD.Enabled && config.AppConfig.Ldap.AD.Domain != "" {
		userDN = fmt.Sprintf("%s@%s", username, config.AppConfig.Ldap.AD.Domain)
	} else {
		// 先搜索用户DN
		searchRequest := ldap.NewSearchRequest(
			config.AppConfig.Ldap.BaseDN,
			ldap.ScopeWholeSubtree, ldap.NeverDerefAliases, 0, 0, false,
			fmt.Sprintf("(|(uid=%s)(cn=%s)(sAMAccountName=%s))", username, username, username),
			[]string{"dn", "cn", "uid", "mail", "telephoneNumber", "sn", "givenName"},
			nil,
		)

		result, err := s.conn.Search(searchRequest)
		if err != nil {
			return nil, fmt.Errorf("failed to search user: %w", err)
		}

		if len(result.Entries) == 0 {
			return nil, fmt.Errorf("user not found")
		}

		userDN = result.Entries[0].DN
	}

	// 验证密码
	err := s.conn.Bind(userDN, password)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials: %w", err)
	}

	// 获取用户信息
	searchRequest := ldap.NewSearchRequest(
		userDN,
		ldap.ScopeBaseObject, ldap.NeverDerefAliases, 0, 0, false,
		"(objectClass=*)",
		[]string{"cn", "uid", "mail", "telephoneNumber", "sn", "givenName", "distinguishedName"},
		nil,
	)

	result, err := s.conn.Search(searchRequest)
	if err != nil || len(result.Entries) == 0 {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	entry := result.Entries[0]

	source := "ldap"
	if config.AppConfig.Ldap.AD.Enabled {
		source = "ad"
	}

	user := &models.User{
		Username: username,
		Nickname: entry.GetAttributeValue("cn"),
		Email:    entry.GetAttributeValue("mail"),
		Phone:    entry.GetAttributeValue("telephoneNumber"),
		Role:     "user",
		Status:   1,
		Source:   source,
		DN:       entry.GetAttributeValue("distinguishedName"),
	}

	return user, nil
}

// GetAllUsers 获取所有LDAP用户
func (s *LdapService) GetAllUsers() ([]*models.User, error) {
	if s.conn == nil {
		return nil, fmt.Errorf("LDAP connection not initialized")
	}

	searchRequest := ldap.NewSearchRequest(
		config.AppConfig.Ldap.BaseDN,
		ldap.ScopeWholeSubtree, ldap.NeverDerefAliases, 0, 0, false,
		"(objectClass=person)",
		[]string{"cn", "uid", "mail", "telephoneNumber", "distinguishedName"},
		nil,
	)

	result, err := s.conn.Search(searchRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to search users: %w", err)
	}

	source := "ldap"
	if config.AppConfig.Ldap.AD.Enabled {
		source = "ad"
	}

	users := make([]*models.User, 0)
	for _, entry := range result.Entries {
		user := &models.User{
			Username: entry.GetAttributeValue("uid"),
			Nickname: entry.GetAttributeValue("cn"),
			Email:    entry.GetAttributeValue("mail"),
			Phone:    entry.GetAttributeValue("telephoneNumber"),
			Source:   source,
			DN:       entry.GetAttributeValue("distinguishedName"),
		}
		if user.Username != "" {
			users = append(users, user)
		}
	}

	return users, nil
}
