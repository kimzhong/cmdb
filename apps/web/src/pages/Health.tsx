import { Card, Descriptions, Tag, Space, Skeleton, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { healthApi, type HealthResult } from '@/api/health';

export function Health() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.check(),
  });

  return (
    <Card
      title="后端健康检查"
      extra={
        <a onClick={() => refetch()} style={{ opacity: isFetching ? 0.5 : 1 }}>
          {isFetching ? '检查中…' : '重新检查'}
        </a>
      }
    >
      {isLoading && <Skeleton active />}

      {error && (
        <Alert
          type="error"
          showIcon
          message="无法连接后端"
          description={(error as { message?: string }).message || '请检查 NestJS 是否启动、/api 代理是否正常'}
        />
      )}

      {data && <HealthView data={data} />}
    </Card>
  );
}

function HealthView({ data }: { data: HealthResult }) {
  const ok = data.status === 'ok';
  const checks = Object.entries(data.info ?? {});
  const errors = Object.entries(data.error ?? {});

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="总体状态">
          {ok ? <Tag color="success">UP</Tag> : <Tag color="error">DOWN</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="依赖检查">
          {checks.length === 0 && errors.length === 0
            ? '—'
            : [...checks, ...errors].map(([k, v]) => (
                <Tag key={k} color={v.status === 'up' ? 'success' : 'error'} style={{ marginRight: 8 }}>
                  {k}: {v.status}
                </Tag>
              ))}
        </Descriptions.Item>
        <Descriptions.Item label="原始响应">
          <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(data, null, 2)}</pre>
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
}
