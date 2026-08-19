package discovery

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"cmdb/internal/models"
	"cmdb/internal/services"

	"go.mongodb.org/mongo-driver/bson"
)

// Scheduler 简易调度器（Phase 3）
// 设计：
//   - 30s 周期 tick，扫描所有 status=enabled 的规则
//   - 每条规则独立 lastRun 跟踪；到点执行
//   - Schedule 格式：
//     "interval:30s"  / "interval:5m"  / "interval:1h"  / "interval:24h"
//     完整 cron 表达式留待后续接入 robfig/cron/v3（当前环境网络受限）
//
// 调用方式：
//
//	sched := discovery.NewScheduler(svc, reg, 30*time.Second)
//	sched.Start()
//	defer sched.Stop()
type Scheduler struct {
	svc       *services.DiscoveryService
	reg       *Registry
	tickEvery time.Duration

	mu       sync.Mutex
	runTimes map[string]time.Time // rule.ID.Hex() 上次执行时间
	stop     chan struct{}
	running  bool
}

func NewScheduler(svc *services.DiscoveryService, reg *Registry, tickEvery time.Duration) *Scheduler {
	if tickEvery < time.Second {
		tickEvery = 30 * time.Second
	}
	return &Scheduler{
		svc:       svc,
		reg:       reg,
		tickEvery: tickEvery,
		runTimes:  make(map[string]time.Time),
		stop:      make(chan struct{}),
	}
}

// Start 启动后台调度 goroutine
func (s *Scheduler) Start() {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	s.running = true
	s.mu.Unlock()

	go func() {
		t := time.NewTicker(s.tickEvery)
		defer t.Stop()
		// 启动时立即跑一轮（避免刚启动空等 tickEvery）
		s.tick()
		for {
			select {
			case <-s.stop:
				return
			case <-t.C:
				s.tick()
			}
		}
	}()
}

// Stop 停止调度
func (s *Scheduler) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.running {
		return
	}
	s.running = false
	close(s.stop)
}

// tick 扫描所有 enabled 规则，判断是否到期
func (s *Scheduler) tick() {
	rules, err := s.svc.ListEnabled()
	if err != nil {
		log.Printf("[discovery] list enabled rules: %v", err)
		return
	}
	now := time.Now()
	for i := range rules {
		r := &rules[i]
		interval, err := ParseInterval(r.Schedule)
		if err != nil {
			log.Printf("[discovery] rule %s invalid schedule %q: %v", r.Identify, r.Schedule, err)
			continue
		}
		s.mu.Lock()
		last, ok := s.runTimes[r.ID.Hex()]
		s.mu.Unlock()
		if !ok || now.Sub(last) >= interval {
			go s.runRule(r)
		}
	}
}

// runRule 执行一条规则（独立 goroutine，错误写回 LastRunMsg）
func (s *Scheduler) runRule(rule *models.DiscoveryRule) {
	s.mu.Lock()
	s.runTimes[rule.ID.Hex()] = time.Now()
	s.mu.Unlock()

	exec, ok := s.reg.Get(rule.SourceType)
	if !ok {
		err := fmt.Sprintf("no executor registered for source_type=%q", rule.SourceType)
		log.Printf("[discovery] %s rule=%s", err, rule.Identify)
		s.svc.RecordRun(rule.ID.Hex(), models.DiscoveryRunFailed, err)
		return
	}

	modelSvc := services.NewModelService()
	target, err := modelSvc.GetByID(rule.TargetModelID.Hex())
	if err != nil {
		msg := fmt.Sprintf("target model not found: %v", err)
		log.Printf("[discovery] rule=%s %s", rule.Identify, msg)
		s.svc.RecordRun(rule.ID.Hex(), models.DiscoveryRunFailed, msg)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	result, err := exec.Execute(ctx, rule, target)
	if err != nil {
		msg := err.Error()
		log.Printf("[discovery] rule=%s execute failed: %s", rule.Identify, msg)
		s.svc.RecordRun(rule.ID.Hex(), models.DiscoveryRunFailed, msg)
		return
	}
	msg := fmt.Sprintf("created=%d updated=%d failed=%d", result.Created, result.Updated, result.Failed)
	log.Printf("[discovery] rule=%s %s", rule.Identify, msg)
	s.svc.RecordRun(rule.ID.Hex(), models.DiscoveryRunSuccess, msg)
}

// ParseInterval 解析 "interval:30s" / "interval:5m" / "interval:1h" / "interval:24h"
func ParseInterval(s string) (time.Duration, error) {
	if s == "" {
		return 0, fmt.Errorf("empty schedule")
	}
	if !strings.HasPrefix(s, "interval:") {
		return 0, fmt.Errorf("unsupported schedule format %q (Phase 3 only accepts interval:Ns/Nm/Nh)", s)
	}
	val := strings.TrimPrefix(s, "interval:")
	d, err := time.ParseDuration(val)
	if err != nil {
		return 0, fmt.Errorf("parse duration %q: %w", val, err)
	}
	if d < time.Second {
		return 0, fmt.Errorf("interval too small (min 1s), got %s", d)
	}
	return d, nil
}

// MustParseInterval 测试辅助：解析失败 panic
func MustParseInterval(s string) time.Duration {
	d, err := ParseInterval(s)
	if err != nil {
		panic(err)
	}
	return d
}

// 防止 strconv 未使用告警（保留扩展点）
var _ = strconv.Itoa

// 防止 bson 未使用告警（保留扩展点：未来按规则 tag 过滤）
var _ = bson.M{}
