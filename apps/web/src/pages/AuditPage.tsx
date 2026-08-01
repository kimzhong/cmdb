import { useState } from 'react';
import { Card, Table, Tag, Input, Space, Button, Skeleton } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/api/audit';

const METHOD_COLOR: Record<string, string> = {
  POST: 'green',
  PUT: 'blue',
  PATCH: 'cyan',
  DELETE: 'red',
};

export function AuditPage() {
  const [username, setUsername] = useState<string | undefined>();
  const [path, setPath] = useState<string | undefined>();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit', 'logs', { username, path }],
    queryFn: () => auditApi.list({ username, path, page: 1, pageSize: 50 }),
  });

  return (
    <Card title="审计日志（所有 POST/PUT/PATCH/DELETE 自动记录）">
      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="按用户名过滤"
          prefix={<SearchOutlined />}
          value={username}
          onChange={(e) => setUsername(e.target.value || undefined)}
          allowClear
          style={{ width: 200 }}
        />
        <Input
          placeholder="按路径过滤（支持子串）"
          value={path}
          onChange={(e) => setPath(e.target.value || undefined)}
          allowClear
          style={{ width: 280 }}
        />
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
      </Space>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <Table
          rowKey="_id"
          dataSource={data?.list ?? []}
          pagination={false}
          size="small"
          columns={[
            { title: '时间', dataIndex: 'createdAt', width: 170 },
            { title: '用户', dataIndex: 'username', width: 100 },
            {
              title: '方法',
              dataIndex: 'method',
              width: 70,
              render: (v: string) => <Tag color={METHOD_COLOR[v] ?? 'default'}>{v}</Tag>,
            },
            { title: '路径', dataIndex: 'path' },
            {
              title: '状态',
              dataIndex: 'status',
              width: 70,
              render: (v: number) => (
                <Tag color={v >= 500 ? 'red' : v >= 400 ? 'orange' : 'green'}>{v}</Tag>
              ),
            },
            { title: '耗时(ms)', dataIndex: 'durationMs', width: 90 },
            { title: 'IP', dataIndex: 'ip', width: 120 },
            {
              title: 'body',
              dataIndex: 'body',
              ellipsis: true,
              render: (v?: string) => (v ? <code style={{ fontSize: 12 }}>{v.slice(0, 100)}</code> : '—'),
            },
          ]}
        />
      )}
    </Card>
  );
}
