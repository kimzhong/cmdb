import { useState } from 'react';
import { Card, Input, Space, Select, Tag, Typography, List, Empty, Skeleton, Alert } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useGlobalSearch } from '@/hooks/useSearch';
import { useModels, type Model } from '@/hooks/useModels';

const { Text } = Typography;

export function GlobalSearchPage() {
  const [keyword, setKeyword] = useState('');
  const [modelUid, setModelUid] = useState<string | undefined>();
  const { data: models } = useModels();
  const { data, isLoading, error } = useGlobalSearch({
    keyword,
    modelUid,
    limit: 50,
  });

  return (
    <Card
      title={
        <Space>
          <span>全局搜索</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            空格=AND；/a/b=OR；-word=排除
          </Text>
        </Space>
      }
    >
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input
          size="large"
          prefix={<SearchOutlined />}
          placeholder="输入关键字，例如：阿里云 /ecs/ -test"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => undefined}
          allowClear
        />
        <Select
          size="large"
          placeholder="按模型过滤（可选）"
          allowClear
          style={{ minWidth: 200 }}
          value={modelUid}
          onChange={setModelUid}
          options={(models ?? []).map((m: Model) => ({ label: m.name, value: m.uid }))}
        />
      </Space.Compact>

      {error && <Alert type="error" showIcon message={(error as { message?: string }).message} />}
      {isLoading ? (
        <Skeleton active />
      ) : !keyword ? (
        <Empty description="输入关键字开始搜索" />
      ) : !data || data.length === 0 ? (
        <Empty description="无匹配结果" />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={data}
          renderItem={(hit) => (
            <List.Item
              key={`${hit.modelUid}-${hit._id}`}
              actions={[
                <Tag key="m" color="blue">{(models ?? []).find((m: Model) => m.uid === hit.modelUid)?.name ?? hit.modelUid}</Tag>,
                <Tag key="s" color="default">score {hit.score.toFixed(3)}</Tag>,
                <a key="o" href={`/resources?modelUid=${hit.modelUid}&openId=${hit._id}`} target="_blank" rel="noreferrer">
                  打开
                </a>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    {hit.name ?? hit.uid ?? hit._id}
                    {hit.uid && hit.name && <Text type="secondary" style={{ fontSize: 12 }}>({hit.uid})</Text>}
                  </Space>
                }
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {Object.entries(hit.raw)
                      .filter(([k]) => !['_id', '__v', 'score', '_score', 'createdAt', 'updatedAt'].includes(k))
                      .slice(0, 4)
                      .map(([k, v]) => (
                        <span key={k} style={{ marginRight: 8 }}>
                          {k}={typeof v === 'string' ? v.slice(0, 40) : JSON.stringify(v).slice(0, 40)}
                        </span>
                      ))}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
