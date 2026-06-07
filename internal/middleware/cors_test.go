package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestCORSHeadersSet 验证普通请求应设置 CORS 响应头
func TestCORSHeadersSet(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/test", nil)
	CORS()(c)
	// 走完 c.Next() 后 headers 应该已经被 set
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Allow-Origin: got %q want *", got)
	}
	if got := w.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Errorf("Allow-Credentials: got %q want true", got)
	}
	if got := w.Header().Get("Access-Control-Allow-Methods"); got == "" {
		t.Error("Allow-Methods should not be empty")
	}
	if got := w.Header().Get("Access-Control-Allow-Headers"); got == "" {
		t.Error("Allow-Headers should not be empty")
	}
}

// TestCORSNoLongerPollutesContentType 验证 CORS 中间件不再硬设 Content-Type
// （修复 review 中发现的污染 204 预检与未来非 JSON 端点的问题）
func TestCORSNoLongerPollutesContentType(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/test", nil)
	CORS()(c)
	if got := w.Header().Get("Content-Type"); got != "" {
		t.Errorf("CORS must not set Content-Type, got %q", got)
	}
}

// TestCORSPreflight 验证 OPTIONS 预检返回 204
func TestCORSPreflight(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("OPTIONS", "/api/v1/test", nil)
	CORS()(c)
	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204 for OPTIONS preflight, got %d", w.Code)
	}
	if !c.IsAborted() {
		t.Error("expected OPTIONS handler to abort")
	}
}
