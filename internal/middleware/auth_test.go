package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cmdb/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// setupTestConfig 注入一个测试用的 config.AppConfig。
// 由于 main.go 通过 InitConfig() 设置全局配置，单测里需要手动设置以便
// GenerateToken / ParseToken / AuthMiddleware 能找到 JWT secret。
func setupTestConfig() {
	config.AppConfig = &config.Config{
		JWT: config.JWTConfig{
			Secret: "test-secret-for-unit-tests",
		},
	}
}

func init() {
	gin.SetMode(gin.TestMode)
	setupTestConfig()
}

// TestGenerateAndParseToken 验证 token 生成与解析一致
func TestGenerateAndParseToken(t *testing.T) {
	token, err := GenerateToken("user-123", "alice", "admin")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}

	claims, err := ParseToken(token)
	if err != nil {
		t.Fatalf("ParseToken failed: %v", err)
	}
	if claims.UserID != "user-123" {
		t.Errorf("UserID: got %q want %q", claims.UserID, "user-123")
	}
	if claims.Username != "alice" {
		t.Errorf("Username: got %q want %q", claims.Username, "alice")
	}
	if claims.Role != "admin" {
		t.Errorf("Role: got %q want %q", claims.Role, "admin")
	}
	if claims.Issuer != "cmdb" {
		t.Errorf("Issuer: got %q want %q", claims.Issuer, "cmdb")
	}
}

// TestParseTokenInvalidSignature 错误签名应被拒绝
func TestParseTokenInvalidSignature(t *testing.T) {
	// 用不同 secret 签发的 token
	config.AppConfig.JWT.Secret = "secret-a"
	token, err := GenerateToken("u1", "alice", "user")
	if err != nil {
		t.Fatal(err)
	}
	// 切换 secret 模拟签名不匹配
	config.AppConfig.JWT.Secret = "secret-b"
	_, err = ParseToken(token)
	if err == nil {
		t.Fatal("expected parse error for mismatched signature")
	}
	// 恢复
	setupTestConfig()
}

// TestParseTokenExpired 过期 token 应被拒绝
func TestParseTokenExpired(t *testing.T) {
	// 构造一个 1 秒前就过期的 token
	claims := &Claims{
		UserID:   "u1",
		Username: "alice",
		Role:     "user",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			Issuer:    "cmdb",
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := tok.SignedString([]byte(config.AppConfig.JWT.Secret))
	if err != nil {
		t.Fatal(err)
	}
	_, err = ParseToken(tokenStr)
	if err == nil {
		t.Fatal("expected parse error for expired token")
	}
}

// TestAuthMiddlewareScenarios 覆盖中间件各种拒绝/通过路径
func TestAuthMiddlewareScenarios(t *testing.T) {
	cases := []struct {
		name       string
		authHeader string
		wantCode   int
		wantMsg    string
	}{
		{
			name:       "no header rejected",
			authHeader: "",
			wantCode:   401,
			wantMsg:    "Authorization header is required",
		},
		{
			name:       "wrong scheme rejected",
			authHeader: "Basic abcdef",
			wantCode:   401,
			wantMsg:    "Invalid authorization header format",
		},
		{
			name:       "malformed (no scheme) rejected",
			authHeader: "just-a-token",
			wantCode:   401,
			wantMsg:    "Invalid authorization header format",
		},
		{
			name:       "valid token passes",
			authHeader: "", // 下面覆盖
			wantCode:   200,
			wantMsg:    "",
		},
		{
			name:       "garbage token rejected",
			authHeader: "Bearer not-a-jwt",
			wantCode:   401,
			wantMsg:    "Invalid or expired token",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			header := tc.authHeader
			if tc.name == "valid token passes" {
				tok, err := GenerateToken("u1", "alice", "user")
				if err != nil {
					t.Fatal(err)
				}
				header = "Bearer " + tok
			}
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/api/v1/test", nil)
			if header != "" {
				c.Request.Header.Set("Authorization", header)
			}

			AuthMiddleware()(c)

			if tc.wantCode == 200 {
				if c.IsAborted() {
					t.Errorf("expected not aborted for valid token, body=%s", w.Body.String())
				}
				// 验证 context 注入了 user_id
				if uid, ok := c.Get("user_id"); !ok || uid != "u1" {
					t.Errorf("expected user_id=u1 in context, got %v", uid)
				}
				if name, ok := c.Get("username"); !ok || name != "alice" {
					t.Errorf("expected username=alice in context, got %v", name)
				}
				return
			}

			if !c.IsAborted() {
				t.Errorf("expected aborted for case %q", tc.name)
			}
			// 验证响应 JSON
			var resp map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				t.Fatalf("response not JSON: %s", w.Body.String())
			}
			if int(resp["code"].(float64)) != tc.wantCode {
				t.Errorf("code: got %v want %d", resp["code"], tc.wantCode)
			}
			if msg, _ := resp["message"].(string); msg != tc.wantMsg {
				t.Errorf("message: got %q want %q", msg, tc.wantMsg)
			}
		})
	}
}

// TestAdminMiddleware 验证 admin 角色门禁
func TestAdminMiddleware(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("role", "user")
	AdminMiddleware()(c)
	if !c.IsAborted() {
		t.Error("expected admin middleware to abort for non-admin role")
	}
	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Set("role", "admin")
	AdminMiddleware()(c2)
	if c2.IsAborted() {
		t.Error("admin middleware should not abort for admin role")
	}
}
