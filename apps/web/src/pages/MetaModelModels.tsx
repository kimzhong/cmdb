import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
  Select,
  Skeleton,
  Alert,
  App,
  Popconfirm,
  Drawer,
  Descriptions,
  Tabs,
} from 'antd';
import { PlusOutlined, ReloadOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import { useCategories, type Category } from '@/hooks/useCategories';
import { useModelGroups, type ModelGroup } from '@/hooks/useModelGroups';
import {
  useModels,
  useModel,
  useCreateModel,
  useDeleteModel,
  useAddField,
  useRemoveField,
  useAddFieldGroup,
  useRemoveFieldGroup,
} from '@/hooks/useModels';
import { FieldType } from '@cmdb/shared';
import type { Model, FieldDef } from '@/api/models';

const FIELD_TYPE_LABELS: Record<string, string> = {
  string: '字符串',
  number: '数字',
  date: '日期',
  select: '下拉选项',
  password: '密码',
  relation: '关系',
};

export function MetaModelModels() {
  const { data: cats } = useCategories();
  const { data: groups } = useModelGroups();
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [filterGroup, setFilterGroup] = useState<string | undefined>();
  const { data, isLoading, error, refetch } = useModels({
    categoryId: filterCategory,
    groupId: filterGroup,
  });
  const create = useCreateModel();
  const remove = useDeleteModel();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ categoryId: string; groupId: string; uid: string; name: string; description?: string; order?: number }>();
  const { modal } = App.useApp();

  const [drawerId, setDrawerId] = useState<string | null>(null);

  const onSubmit = async () => {
    const v = await form.validateFields();
    await create.mutateAsync(v);
    form.resetFields();
    setOpen(false);
  };

  const onDelete = (m: Model) => {
    modal.confirm({
      title: `确认删除模型 "${m.name}"？`,
      content: '将一并删除其字段定义（数据校验放到资源模块进行）',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => remove.mutateAsync(m._id),
    });
  };

  return (
    <>
      <Card
        title="模型（动态建模核心：每个模型对应一个 MongoDB 集合）"
        extra={
          <Space>
            <Select
              placeholder="按分类筛选"
              allowClear
              style={{ width: 160 }}
              value={filterCategory}
              onChange={setFilterCategory}
              options={(cats ?? []).map((c: Category) => ({ label: c.name, value: c._id }))}
            />
            <Select
              placeholder="按分组筛选"
              allowClear
              style={{ width: 160 }}
              value={filterGroup}
              onChange={setFilterGroup}
              options={(groups ?? [])
                .filter((g: ModelGroup) => !filterCategory || g.categoryId === filterCategory)
                .map((g: ModelGroup) => ({ label: g.name, value: g._id }))}
            />
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              新建模型
            </Button>
          </Space>
        }
      >
        {error && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }} message={(error as { message?: string }).message} />
        )}
        {isLoading ? (
          <Skeleton active />
        ) : (
          <Table
            rowKey="_id"
            dataSource={data ?? []}
            pagination={false}
            columns={[
              { title: '名称', dataIndex: 'name' },
              { title: 'uid', dataIndex: 'uid', render: (v) => <Tag color="blue">{v}</Tag> },
              {
                title: '所属分类',
                dataIndex: 'categoryId',
                width: 120,
                render: (cid) => (cats ?? []).find((c: Category) => c._id === cid)?.name || '—',
              },
              {
                title: '所属分组',
                dataIndex: 'groupId',
                width: 120,
                render: (gid) => (groups ?? []).find((g: ModelGroup) => g._id === gid)?.name || '—',
              },
              { title: '字段', dataIndex: 'fields', width: 80, render: (f: unknown[]) => (f ?? []).length },
              { title: '排序', dataIndex: 'order', width: 70 },
              {
                title: '操作',
                width: 160,
                render: (_, r) => (
                  <Space>
                    <a onClick={() => setDrawerId(r._id)}>详情</a>
                    <Popconfirm title="确认删除？" onConfirm={() => onDelete(r)}>
                      <a style={{ color: '#ff4d4f' }}>删除</a>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title="新建模型"
        open={open}
        onOk={onSubmit}
        onCancel={() => setOpen(false)}
        confirmLoading={create.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item label="所属分类" name="categoryId" rules={[{ required: true }]}>
            <Select
              placeholder="选择分类"
              options={(cats ?? []).map((c: Category) => ({ label: c.name, value: c._id }))}
              onChange={() => form.setFieldValue('groupId', undefined)}
            />
          </Form.Item>
          <Form.Item label="所属模型分组" name="groupId" rules={[{ required: true }]}>
            <Select
              placeholder="选择模型分组"
              options={(groups ?? [])
                .filter((g: ModelGroup) => !form.getFieldValue('categoryId') || g.categoryId === form.getFieldValue('categoryId'))
                .map((g: ModelGroup) => ({ label: g.name, value: g._id }))}
            />
          </Form.Item>
          <Form.Item label="uid" name="uid" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母/数字/下划线' }]}>
            <Input placeholder="例如：ecs / mysql / domain" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, max: 32 }]}>
            <Input placeholder="例如：云服务器" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} maxLength={200} showCount />
          </Form.Item>
          <Form.Item label="排序" name="order" initialValue={0}>
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="创建后将自动注入字段分组 [基本属性, 关系属性] 和字段 [uid, name]"
          />
        </Form>
      </Modal>

      <ModelDetailDrawer id={drawerId} onClose={() => setDrawerId(null)} />
    </>
  );
}

function ModelDetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useModel(id ?? '');
  const addField = useAddField(id ?? '');
  const removeField = useRemoveField(id ?? '');
  const addFieldGroup = useAddFieldGroup(id ?? '');
  const removeFieldGroup = useRemoveFieldGroup(id ?? '');

  const [fieldOpen, setFieldOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [fieldForm] = Form.useForm<FieldDef>();
  const [groupForm] = Form.useForm<{ uid: string; name: string; order?: number }>();

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      width={760}
      title={data ? `模型：${data.name}（${data.uid}）` : '模型详情'}
      destroyOnClose
    >
      {isLoading || !data ? (
        <Skeleton active />
      ) : (
        <Tabs
          items={[
            {
              key: 'basic',
              label: '基础信息',
              children: (
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="名称">{data.name}</Descriptions.Item>
                  <Descriptions.Item label="uid"><Tag color="blue">{data.uid}</Tag></Descriptions.Item>
                  <Descriptions.Item label="描述">{data.description || '—'}</Descriptions.Item>
                  <Descriptions.Item label="排序">{data.order}</Descriptions.Item>
                  <Descriptions.Item label="创建时间">{data.createdAt}</Descriptions.Item>
                  <Descriptions.Item label="更新时间">{data.updatedAt}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'fieldGroups',
              label: `字段分组 (${data.fieldGroups?.length ?? 0})`,
              children: (
                <>
                  <Space style={{ marginBottom: 12 }}>
                    <Button icon={<AppstoreAddOutlined />} onClick={() => setGroupOpen(true)}>
                      新增字段分组
                    </Button>
                  </Space>
                  <Table
                    rowKey="uid"
                    pagination={false}
                    dataSource={data.fieldGroups ?? []}
                    columns={[
                      { title: 'uid', dataIndex: 'uid' },
                      { title: '名称', dataIndex: 'name' },
                      { title: '排序', dataIndex: 'order', width: 80 },
                      {
                        title: '内置',
                        dataIndex: 'builtin',
                        width: 80,
                        render: (v) => (v ? <Tag color="gold">内置</Tag> : <Tag>自定义</Tag>),
                      },
                      {
                        title: '操作',
                        width: 100,
                        render: (_, g) =>
                          g.builtin ? (
                            <Tag>不可删</Tag>
                          ) : (
                            <Popconfirm title="确认删除？" onConfirm={() => removeFieldGroup.mutate(g.uid)}>
                              <a style={{ color: '#ff4d4f' }}>删除</a>
                            </Popconfirm>
                          ),
                      },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'fields',
              label: `字段 (${data.fields?.length ?? 0})`,
              children: (
                <>
                  <Space style={{ marginBottom: 12 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setFieldOpen(true)}>
                      新增字段
                    </Button>
                  </Space>
                  <Table
                    rowKey="uid"
                    pagination={false}
                    dataSource={data.fields ?? []}
                    columns={[
                      { title: 'uid', dataIndex: 'uid' },
                      { title: '名称', dataIndex: 'name' },
                      {
                        title: '类型',
                        dataIndex: 'type',
                        render: (t: string) => <Tag color="cyan">{FIELD_TYPE_LABELS[t] ?? t}</Tag>,
                      },
                      { title: '所属分组', dataIndex: 'groupUid' },
                      { title: '必填', dataIndex: 'required', width: 70, render: (v) => (v ? '✓' : '—') },
                      { title: '排序', dataIndex: 'order', width: 70 },
                      {
                        title: '内置',
                        dataIndex: 'builtin',
                        width: 80,
                        render: (v) => (v ? <Tag color="gold">内置</Tag> : <Tag>自定义</Tag>),
                      },
                      {
                        title: '操作',
                        width: 100,
                        render: (_, f) =>
                          f.builtin ? (
                            <Tag>不可删</Tag>
                          ) : (
                            <Popconfirm title="确认删除？" onConfirm={() => removeField.mutate(f.uid)}>
                              <a style={{ color: '#ff4d4f' }}>删除</a>
                            </Popconfirm>
                          ),
                      },
                    ]}
                  />
                </>
              ),
            },
          ]}
        />
      )}

      <Modal
        title="新增字段"
        open={fieldOpen}
        onOk={async () => {
          const v = await fieldForm.validateFields();
          await addField.mutateAsync(v as Partial<FieldDef>);
          fieldForm.resetFields();
          setFieldOpen(false);
        }}
        onCancel={() => setFieldOpen(false)}
        confirmLoading={addField.isPending}
        destroyOnClose
      >
        <Form form={fieldForm} layout="vertical" preserve={false}>
          <Form.Item label="uid" name="uid" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母/数字/下划线' }]}>
            <Input placeholder="例如：cpu / memory" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, max: 32 }]}>
            <Input />
          </Form.Item>
          <Form.Item label="类型" name="type" initialValue={FieldType.String} rules={[{ required: true }]}>
            <Select
              options={Object.values(FieldType).map((t) => ({ label: FIELD_TYPE_LABELS[t] ?? t, value: t }))}
            />
          </Form.Item>
          <Form.Item label="所属字段分组" name="groupUid" rules={[{ required: true }]}>
            <Select
              options={(data?.fieldGroups ?? []).map((g) => ({ label: g.name, value: g.uid }))}
            />
          </Form.Item>
          <Form.Item label="排序" name="order" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="必填" name="required" valuePropName="checked">
            <Select options={[{ label: '否', value: false }, { label: '是', value: true }]} style={{ display: 'none' }} />
            <input type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增字段分组"
        open={groupOpen}
        onOk={async () => {
          const v = await groupForm.validateFields();
          await addFieldGroup.mutateAsync(v);
          groupForm.resetFields();
          setGroupOpen(false);
        }}
        onCancel={() => setGroupOpen(false)}
        confirmLoading={addFieldGroup.isPending}
        destroyOnClose
      >
        <Form form={groupForm} layout="vertical" preserve={false}>
          <Form.Item label="uid" name="uid" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/ }]}>
            <Input placeholder="例如：network" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, max: 32 }]}>
            <Input placeholder="例如：网络信息" />
          </Form.Item>
          <Form.Item label="排序" name="order" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
