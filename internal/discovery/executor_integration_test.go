//go:build integration
// +build integration

package discovery

import (
	"testing"

	"cmdb/internal/models"
)

// TestParseInterval 校验 interval 解析
func TestParseInterval(t *testing.T) {
	cases := []struct {
		in     string
		wantOk bool
		desc   string
	}{
		{"interval:30s", true, "seconds"},
		{"interval:5m", true, "minutes"},
		{"interval:1h", true, "hour"},
		{"interval:24h", true, "day"},
		{"interval:500ms", false, "too small (<1s)"},
		{"interval:0s", false, "zero"},
		{"", false, "empty"},
		{"*/5 * * * *", false, "cron expr not yet supported"},
		{"interval:abc", false, "bad duration"},
	}
	for _, tc := range cases {
		_, err := ParseInterval(tc.in)
		if tc.wantOk && err != nil {
			t.Errorf("%s: ParseInterval(%q) error: %v", tc.desc, tc.in, err)
		}
		if !tc.wantOk && err == nil {
			t.Errorf("%s: ParseInterval(%q) expected error, got nil", tc.desc, tc.in)
		}
	}
}

// TestStaticExecutor_RequiresConfigItems 校验缺 config.items 时报错
func TestStaticExecutor_RequiresConfigItems(t *testing.T) {
	e := NewStaticExecutor()
	if e.Type() != "static" {
		t.Errorf("expected type=static, got %q", e.Type())
	}
	rule := &models.DiscoveryRule{
		SourceType: "static",
		Config:     map[string]interface{}{}, // 缺 items
	}
	m := &models.Model{}
	_, err := e.Execute(nil, rule, m)
	if err == nil {
		t.Fatal("expected error when config.items missing")
	}
}
