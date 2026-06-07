package routers

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// TestEncryptDecryptRoundTrip 验证 DES 加解密往返
func TestEncryptDecryptRoundTrip(t *testing.T) {
	cases := []string{
		"hello world",
		"中文密码 123",
		"!@#$%^&*()_+-=[]{}|;:',.<>?/`~",
		strings.Repeat("a", 100),
		"",
		"a", // 1 字节（最小填充场景）
	}
	for _, plain := range cases {
		// 空字符串加密后 base64 仍是合法非空（DES block=8 字节 padding）
		// 但解密边界情况单独覆盖
		if plain == "" {
			continue
		}
		encrypted := encryptValue(plain)
		if encrypted == plain {
			t.Errorf("expected encrypted to differ from plain for %q", plain)
		}
		decrypted := decryptValue(encrypted)
		if decrypted != plain {
			t.Errorf("round trip failed: got %q want %q", decrypted, plain)
		}
	}
}

// TestEncryptPaddingBoundary 验证恰好 8 字节边界（padding 仍能正确加 8 字节）
func TestEncryptPaddingBoundary(t *testing.T) {
	for _, n := range []int{7, 8, 9, 15, 16, 17} {
		plain := strings.Repeat("x", n)
		got := decryptValue(encryptValue(plain))
		if got != plain {
			t.Errorf("padding boundary n=%d: got %q want %q", n, got, plain)
		}
	}
}

// TestDecryptInvalidBase64 非法 base64 应返回原 ciphertext（不崩溃）
func TestDecryptInvalidBase64(t *testing.T) {
	got := decryptValue("!!!not-base64!!!")
	if got != "!!!not-base64!!!" {
		t.Errorf("expected to return original on bad base64, got %q", got)
	}
}

// TestDecryptWrongLength 长度不是 8 的倍数应返回原值
func TestDecryptWrongLength(t *testing.T) {
	// "abc" base64 = "YWJj"，长度 3 字节非 8 倍数
	got := decryptValue("YWJj")
	if got != "YWJj" {
		t.Errorf("expected to return original on wrong block length, got %q", got)
	}
}

// TestValidateField 验证正则校验
func TestValidateField(t *testing.T) {
	cases := []struct {
		name  string
		value string
		rule  string
		want  bool
	}{
		{"empty rule always passes", "anything", "", true},
		{"invalid regex falls through to true", "v", "[invalid(", true},
		{"email simple match", "user@example.com", `^[\w.+-]+@[\w-]+\.[\w.-]+$`, true},
		{"email simple mismatch", "no-at-sign", `^[\w.+-]+@[\w-]+\.[\w.-]+$`, false},
		{"digits only", "12345", `^\d+$`, true},
		{"digits only reject letters", "1234a", `^\d+$`, false},
		{"chinese chars match", "主机", `^[\p{Han}]+$`, true},
		{"phone zh", "13800001111", `^1[3-9]\d{9}$`, true},
		{"phone zh reject", "23800001111", `^1[3-9]\d{9}$`, false},
	}
	for _, tc := range cases {
		got := validateField(tc.value, tc.rule)
		if got != tc.want {
			t.Errorf("%s: got %v want %v (value=%q rule=%q)", tc.name, got, tc.want, tc.value, tc.rule)
		}
	}
}

// TestGetQueryInt 验证查询参数解析
func TestGetQueryInt(t *testing.T) {
	cases := []struct {
		name     string
		query    string
		key      string
		def      int
		expected int
	}{
		{"missing param returns default", "/?_=1", "page", 1, 1},
		{"valid number", "/?page=5", "page", 1, 5},
		{"zero value returns default", "/?page=0", "page", 7, 7},
		{"non-numeric returns default", "/?page=abc", "page", 3, 3},
		{"mixed alphanum: leading digits parsed", "/?page=12abc", "page", 1, 12},
		{"negative number parses only leading digit", "/?page=-5", "page", 1, 5},
		{"empty value returns default", "/?page=", "page", 2, 2},
		{"large value", "/?page=10000", "page", 1, 10000},
	}
	for _, tc := range cases {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", tc.query, nil)
		got := getQueryInt(c, tc.key, tc.def)
		if got != tc.expected {
			t.Errorf("%s: got %d want %d", tc.name, got, tc.expected)
		}
	}
}
