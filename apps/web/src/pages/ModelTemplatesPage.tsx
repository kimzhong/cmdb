/**
 * 预置模型库
 */
import { useEffect, useState } from 'react';
import { Row, Col, Card, Tag, Button, Space, App, Empty, List, Divider } from 'antd';

import { AppstoreAddOutlined, DatabaseOutlined, ClusterOutlined, CloudOutlined, CodeOutlined, DesktopOutlined, ApartmentOutlined, RocketOutlined } from '@ant-design/icons';
import { modelTemplatesApi } from '@/api/model-templates';

const iconForCategory: Record<string, any> = {
  compute: <DesktopOutlined />,
  network: <ClusterOutlined />,
  storage: <DatabaseOutlined />,
  database: <DatabaseOutlined />,
  middleware: <CloudOutlined />,
  application: <CodeOutlined />,
  service: <RocketOutlined />,
};

const colorForCategory: Record<string, string> = {
  compute: 'blue',
  network: 'cyan',
  storage: 'green',
  database: 'purple',
  middleware: 'orange',
  application: 'magenta',
  service: 'red',
};

export function ModelTemplatesPage() {
  const [list, setList] = useState<any[]>([]);
  const { message: msgApi } = App.useApp();

  const load = async () => {
    try {
      const data = await modelTemplatesApi.list();
      setList(data as any[]);
    } catch (e: any) {
      msgApi.error(e.message || '加载失败');
    }
  };

  useEffect(() => { load(); }, []);

  const onImport = async (code: string) => {
    try {
      await modelTemplatesApi.import(code, 'admin');
      msgApi.success(`已导入 ${code}`);
    } catch (e: any) {
      msgApi.error(e.message || '导入失败');
    }
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <AppstoreAddOutlined />
            <span>预置模型库</span>
            <Tag color="blue">F12 · 模型模板</Tag>
          </Space>
        }
        extra={<Tag color="purple">{list.length} 个模板</Tag>}
      >
        {list.length === 0 ? (
          <Empty description="暂无模型模板" />
        ) : (
          <Row gutter={[16, 16]}>
            {list.map((t: any) => (
              <Col span={8} key={t.code}>
                <Card
                  size="small"
                  hoverable
                  title={
                    <Space>
                      {iconForCategory[t.category] || <ApartmentOutlined />}
                      <span>{t.name}</span>
                    </Space>
                  }
                  extra={<Tag color={colorForCategory[t.category]}>{t.category}</Tag>}
                >
                  <div style={{ marginBottom: 8 }}>
                    <Tag>{t.code}</Tag>
                    {t.isSystem && <Tag color="red">系统</Tag>}
                  </div>
                  <List
                    size="small"
                    dataSource={(t.fields || []).slice(0, 5)}
                    renderItem={(f: any) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <Space size={4}>
                          <Tag color="blue" style={{ margin: 0 }}>{f.code}</Tag>
                          {f.required && <Tag color="red" style={{ margin: 0 }}>必填</Tag>}
                          <span style={{ fontSize: 12, color: '#666' }}>{f.name}</span>
                        </Space>
                      </List.Item>
                    )}
                  />
                  {t.fields && t.fields.length > 5 && (
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                      还有 {t.fields.length - 5} 个字段...
                    </div>
                  )}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button block type="primary" size="small" onClick={() => onImport(t.code)}>
                    一键导入
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </div>
  );
}
