import { useState, useMemo } from 'react';
import {
  Card,
  Tree,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Skeleton,
  Empty,
  App,
  Tag,
  Descriptions,
  List,
  Tabs,
} from 'antd';
import { PlusOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useBiz, useAppList, useCreateBiz, useCreateApp, useAppResources, useRemoveApp } from '@/hooks/useApps';
import { useTagValues } from '@/hooks/useTags';
import { useModels, type Model } from '@/hooks/useModels';
import type { Biz } from '@/api/apps';

export function AppsExplorer() {
  const { data: bizList, isLoading } = useBiz();
  const { data: appList } = useAppList();
  const createBiz = useCreateBiz();
  const createApp = useCreateApp();
  const [bizOpen, setBizOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const [bizForm] = Form.useForm<{ uid: string; name: string; description?: string }>();
  const [appForm] = Form.useForm<{ bizId: string; uid: string; name: string; status?: string }>();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const tree = useMemo(() => {
    return (bizList ?? []).map((b) => ({
      key: `biz:${b._id}`,
      title: (
        <Space>
          <ApartmentOutlined />
          <strong>{b.name}</strong>
          <Tag color="default">{(appList ?? []).filter((a) => a.bizId === b._id).length} 应用</Tag>
        </Space>
      ),
      children: (appList ?? [])
        .filter((a) => a.bizId === b._id)
        .map((a) => ({
          key: `app:${a._id}`,
          title: (
            <Space>
              <span>{a.name}</span>
              <Tag color={a.status === 'running' ? 'green' : a.status === 'pending' ? 'gold' : 'default'}>
                {a.status}
              </Tag>
            </Space>
          ),
        })),
    }));
  }, [bizList, appList]);

  const onSelect = (keys: React.Key[]) => {
    const k = String(keys[0] ?? '');
    if (k.startsWith('app:')) setSelectedApp(k.slice(4));
  };

  return (
    <>
      <Card
        title="应用视图（业务 → 应用 → 资源 + 环境过滤）"
        extra={
          <Space>
            <Button icon={<PlusOutlined />} onClick={() => setBizOpen(true)}>新建业务</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAppOpen(true)}>
              新建应用
            </Button>
          </Space>
        }
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ width: 360, borderRight: '1px solid #f0f0f0', paddingRight: 16 }}>
            {isLoading ? (
              <Skeleton active />
            ) : tree.length === 0 ? (
              <Empty description="暂无业务" />
            ) : (
              <Tree treeData={tree} defaultExpandAll onSelect={onSelect} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            {selectedApp ? (
              <AppDetail appId={selectedApp} />
            ) : (
              <Empty description="请在左侧选择一个应用" />
            )}
          </div>
        </div>
      </Card>

      <Modal
        title="新建业务"
        open={bizOpen}
        onOk={async () => {
          const v = await bizForm.validateFields();
          await createBiz.mutateAsync(v);
          bizForm.resetFields();
          setBizOpen(false);
        }}
        onCancel={() => setBizOpen(false)}
        confirmLoading={createBiz.isPending}
        destroyOnClose
      >
        <Form form={bizForm} layout="vertical" preserve={false}>
          <Form.Item label="uid" name="uid" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/ }]}>
            <Input placeholder="例如：payments" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, max: 32 }]}>
            <Input placeholder="例如：支付业务" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新建应用"
        open={appOpen}
        onOk={async () => {
          const v = await appForm.validateFields();
          await createApp.mutateAsync(v);
          appForm.resetFields();
          setAppOpen(false);
        }}
        onCancel={() => setAppOpen(false)}
        confirmLoading={createApp.isPending}
        destroyOnClose
      >
        <Form form={appForm} layout="vertical" preserve={false} initialValues={{ status: 'pending' }}>
          <Form.Item label="所属业务" name="bizId" rules={[{ required: true }]}>
            <Select options={(bizList ?? []).map((b: Biz) => ({ label: b.name, value: b._id }))} />
          </Form.Item>
          <Form.Item label="uid" name="uid" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/ }]}>
            <Input placeholder="例如：payweb" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, max: 32 }]}>
            <Input placeholder="例如：支付前端" />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select options={['pending', 'running', 'offline'].map((s) => ({ label: s, value: s }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function AppDetail({ appId }: { appId: string }) {
  const [env, setEnv] = useState<string | undefined>();
  const { data: envKey } = useTagKeys();
  const envKeyId = (envKey ?? []).find((k) => k.uid === 'environment')?._id;
  const { data: envValues } = useTagValues(envKeyId);
  const { data, isLoading } = useAppResources(appId, env);
  const { data: models } = useModels();
  const remove = useRemoveApp();
  const { modal } = App.useApp();

  if (isLoading || !data) return <Skeleton active />;
  const { app, byModel } = data;
  const total = byModel.reduce((s, g) => s + g.resources.length, 0);

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{app.name}</h3>
        <Tag color={app.status === 'running' ? 'green' : app.status === 'pending' ? 'gold' : 'default'}>
          {app.status}
        </Tag>
        <Button
          danger
          size="small"
          onClick={() =>
            modal.confirm({
              title: `确认删除应用 "${app.name}"？`,
              okButtonProps: { danger: true },
              onOk: () => remove.mutateAsync(app._id),
            })
          }
        >
          删除应用
        </Button>
      </Space>
      <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="uid">{app.uid}</Descriptions.Item>
        <Descriptions.Item label="业务">{app.bizId}</Descriptions.Item>
        <Descriptions.Item label="描述" span={2}>
          {app.description || '—'}
        </Descriptions.Item>
      </Descriptions>

      <Tabs
        items={[
          {
            key: 'res',
            label: `关联资源 (${total})`,
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <span>环境过滤：</span>
                  <Select
                    placeholder="不限"
                    allowClear
                    value={env}
                    onChange={setEnv}
                    style={{ width: 160 }}
                    options={(envValues ?? []).map((v) => ({ label: v.value, value: v.value }))}
                  />
                </Space>
                {byModel.length === 0 ? (
                  <Empty description="未绑定资源" />
                ) : (
                  byModel.map((g) => (
                    <div key={g.modelUid} style={{ marginBottom: 16 }}>
                      <h4>
                        {(models ?? []).find((m: Model) => m.uid === g.modelUid)?.name ?? g.modelUid}{' '}
                        <Tag>{g.resources.length}</Tag>
                      </h4>
                      <List
                        size="small"
                        dataSource={g.resources}
                        renderItem={(r) => (
                          <List.Item>
                            <Space>
                              <a
                                href={`/resources?modelUid=${g.modelUid}&openId=${String(r._id)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {(r as { name?: string }).name ?? (r as { uid?: string }).uid ?? String(r._id)}
                              </a>
                              <span style={{ fontSize: 12, color: '#999' }}>{String(r._id)}</span>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </div>
                  ))
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
