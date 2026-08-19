package main

import (
	"fmt"
	"log"
	"time"

	"cmdb/config"
	"cmdb/database"
	"cmdb/internal/discovery"
	"cmdb/internal/routers"
	"cmdb/internal/services"
)

func main() {
	// 初始化配置
	if err := config.InitConfig(); err != nil {
		log.Fatalf("Failed to init config: %v", err)
	}

	// 初始化MongoDB
	if err := database.InitMongoDB(); err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer database.CloseMongoDB()

	// Phase 4: 幂等创建所有集合的索引
	if err := database.EnsureIndexesDefault(database.DB); err != nil {
		log.Fatalf("Failed to ensure indexes: %v", err)
	}

	// Phase 3: 启动自动发现调度器
	discoverySvc := services.NewDiscoveryService()
	reg := discovery.NewRegistry()
	reg.Register(discovery.NewStaticExecutor())
	scheduler := discovery.NewScheduler(discoverySvc, reg, 30*time.Second)
	scheduler.Start()
	defer scheduler.Stop()
	log.Printf("Discovery scheduler started (tick=30s)")

	// 设置路由
	r := routers.SetupRouter()

	// 启动服务器
	addr := fmt.Sprintf("%s:%d", config.AppConfig.Server.Host, config.AppConfig.Server.Port)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
