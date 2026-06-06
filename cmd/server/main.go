package main

import (
	"fmt"
	"log"

	"cmdb/config"
	"cmdb/database"
	"cmdb/internal/routers"
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

	// 设置路由
	r := routers.SetupRouter()

	// 启动服务器
	addr := fmt.Sprintf("%s:%d", config.AppConfig.Server.Host, config.AppConfig.Server.Port)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
