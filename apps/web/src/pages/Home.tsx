import { Card, Space, Typography, Tag } from 'antd';

const { Title, Paragraph } = Typography;

const phases = [
  { tag: '阶段零', color: 'default', text: '基础设施（脚手架 / Docker / 工程化）' },
  { tag: '阶段一', color: 'processing', text: '元模型 + 资源仓库（MVP）' },
  { tag: '阶段二', color: 'warning', text: '标签 + 应用视图 + 全局搜索' },
  { tag: '阶段三', color: 'error', text: '定时任务 + 云同步' },
  { tag: '阶段四', color: 'success', text: '扩展与治理' },
];

export function Home() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Title level={3}>欢迎使用 CMDB 平台</Title>
        <Paragraph type="secondary">
          基于 NestJS + React + MongoDB 全栈 TypeScript 实现，覆盖模型管理、资源仓库、标签、应用视图、定时同步等核心场景。
        </Paragraph>
      </Card>

      <Card title="建设进度">
        <Space wrap>
          {phases.map((p) => (
            <Tag key={p.tag} color={p.color} style={{ padding: '4px 12px', fontSize: 14 }}>
              {p.tag}：{p.text}
            </Tag>
          ))}
        </Space>
      </Card>

      <Card title="快速导航">
        <ul>
          <li>
            <a href="/api/docs" target="_blank" rel="noreferrer">
              Swagger API 文档
            </a>
          </li>
          <li>
            <a href="http://localhost:8081" target="_blank" rel="noreferrer">
              Mongo Express（仅开发环境）
            </a>
          </li>
          <li>
            <a href="/meta-model/categories">查看模型分类（联调示例）</a>
          </li>
          <li>
            <a href="/health">后端健康检查</a>
          </li>
        </ul>
      </Card>
    </Space>
  );
}
