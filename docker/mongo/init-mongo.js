// MongoDB 初始化脚本（首次启动时执行）
// 用于创建应用用户和基础集合

db = db.getSiblingDB('cmdb');

db.createCollection('counters');
db.counters.insertOne({ _id: 'resource_id', seq: 0 });

print('✅ CMDB MongoDB initialized');
