import { useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Skeleton,
  App,
  Popconfirm,
  Empty,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  useTagKeys,
  useTagValues,
  useCreateTagKey,
  useDeleteTagKey,
  useCreateTagValue,
  useDeleteTagValue,
  useTagSearch,
} from '@/hooks/useTags';
import { useModels, type Model } from '@/hooks/useModels';
import type { TagKey, TagValue } from '@/api/tags';

export function TagsPage() {
  return (
    <Card title="标签管理（K-V 结构 + 跨模型资源绑定）">
      <Tabs
        items={[
          { key: 'keys', label: '标签键', children: <KeysTab /> },
          { key: 'values', label: '标签值', children: <ValuesTab /> },
          { key: 'search', label: '标签搜索', children: <SearchTab /> },
        ]}
      />
    </Card>
  );
}

function KeysTab() {
  const { data, isLoading, refetch } = useTagKeys();
  const create = useCreateTagKey();
  const remove = useDeleteTagKey();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ uid: string; name: string; description?: string }>();

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          新建标签键
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          刷新
        </Button>
      </Space>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <Table
          rowKey="_id"
          dataSource={data ?? []}
          pagination={false}
          columns={[
            { title: 'uid', dataIndex: 'uid', render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: '名称', dataIndex: 'name' },
            { title: '描述', dataIndex: 'description' },
            {
              title: '操作',
              width: 100,
              render: (_, k: TagKey) => (
                <Popconfirm title="确认删除？" onConfirm={() => remove.mutate(k._id)}>
                  <a style={{ color: '#ff4d4f' }}>删除</a>
                </Popconfirm>
              ),
            },
          ]}
        />
      )}
      <Modal
        title="新建标签键"
        open={open}
        onOk={async () => {
          const v = await form.validateFields();
          await create.mutateAsync(v);
          form.resetFields();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
        confirmLoading={create.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item label="uid" name="uid" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母/数字/下划线' }]}>
            <Input placeholder="例如：environment" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, max: 32 }]}>
            <Input placeholder="例如：环境" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function ValuesTab() {
  const { data: keys } = useTagKeys();
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const { data, isLoading, refetch } = useTagValues(selectedKey);
  const create = useCreateTagValue();
  const remove = useDeleteTagValue();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ keyId: string; value: string; description?: string }>();

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Select
          placeholder="选择标签键"
          allowClear
          value={selectedKey}
          onChange={(v) => setSelectedKey(v)}
          style={{ width: 240 }}
          options={(keys ?? []).map((k) => ({ label: k.name, value: k._id }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} disabled={!selectedKey}>
          新建值
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
      </Space>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <Table
          rowKey="_id"
          dataSource={data ?? []}
          pagination={false}
          columns={[
            {
              title: '所属键',
              dataIndex: 'keyId',
              render: (kid: string) => (keys ?? []).find((k) => k._id === kid)?.name ?? kid,
            },
            { title: '值', dataIndex: 'value', render: (v: string) => <Tag color="cyan">{v}</Tag> },
            { title: '描述', dataIndex: 'description' },
            {
              title: '操作',
              width: 100,
              render: (_, v: TagValue) => (
                <Popconfirm title="确认删除？" onConfirm={() => remove.mutate(v._id)}>
                  <a style={{ color: '#ff4d4f' }}>删除</a>
                </Popconfirm>
              ),
            },
          ]}
        />
      )}
      <Modal
        title="新建标签值"
        open={open}
        onOk={async () => {
          const v = await form.validateFields();
          await create.mutateAsync({ ...v, keyId: selectedKey! });
          form.resetFields();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
        confirmLoading={create.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={{ keyId: selectedKey }}>
          <Form.Item label="所属键" name="keyId" rules={[{ required: true }]}>
            <Select
              disabled
              options={(keys ?? []).map((k) => ({ label: k.name, value: k._id }))}
            />
          </Form.Item>
          <Form.Item label="值" name="value" rules={[{ required: true, max: 64 }]}>
            <Input placeholder="例如：prod" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function SearchTab() {
  const { data: keys } = useTagKeys();
  const { data: models } = useModels();
  const [keyId, setKeyId] = useState<string | undefined>();
  const { data: values } = useTagValues(keyId);
  const [selectedValueIds, setSelectedValueIds] = useState<string[]>([]);
  const [modelUid, setModelUid] = useState<string | undefined>();
  const search = useTagSearch();
  const { modal } = App.useApp();

  const onSearch = async () => {
    if (selectedValueIds.length === 0) {
      modal.info({ title: '提示', content: '请至少选择一个标签值' });
      return;
    }
    await search.mutateAsync({ tagValueIds: selectedValueIds, modelUid });
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small" title="筛选条件">
        <Space wrap>
          <Select
            placeholder="标签键"
            allowClear
            style={{ width: 200 }}
            value={keyId}
            onChange={(v) => {
              setKeyId(v);
              setSelectedValueIds([]);
            }}
            options={(keys ?? []).map((k) => ({ label: k.name, value: k._id }))}
          />
          <Select
            placeholder="选择标签值（多选 = AND）"
            mode="multiple"
            style={{ width: 360 }}
            value={selectedValueIds}
            onChange={setSelectedValueIds}
            options={(values ?? []).map((v) => ({ label: v.value, value: v._id }))}
            disabled={!keyId}
          />
          <Select
            placeholder="资源类型（可选）"
            allowClear
            style={{ width: 200 }}
            value={modelUid}
            onChange={setModelUid}
            options={(models ?? []).map((m: Model) => ({ label: m.name, value: m.uid }))}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={onSearch} loading={search.isPending}>
            搜索
          </Button>
        </Space>
      </Card>

      <Card size="small" title="结果（按模型分栏）">
        {!search.data ? (
          <Empty description="尚无结果" />
        ) : search.data.length === 0 ? (
          <Empty description="没找到匹配资源" />
        ) : (
          search.data.map((g) => (
            <div key={g.modelUid} style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '8px 0' }}>
                {(models ?? []).find((m: Model) => m.uid === g.modelUid)?.name ?? g.modelUid}{' '}
                <Tag color="blue">{g.resources.length} 条</Tag>
              </h4>
              {g.resources.map((r) => (
                <Tag key={r._id} style={{ marginBottom: 4 }}>
                  <a href={`/resources?modelUid=${g.modelUid}&openId=${r._id}`} target="_blank" rel="noreferrer">
                    {r._id}
                  </a>
                </Tag>
              ))}
            </div>
          ))
        )}
      </Card>
    </Space>
  );
}
