import { useState, useMemo } from 'react';
import {
  Card,
  Select,
  Input,
  Table,
  Button,
  Modal,
  Form,
  Space,
  Skeleton,
  Alert,
  Tag,
  Drawer,
  Descriptions,
  Tabs,
  Popconfirm,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useModels, type Model, type FieldDef } from '@/hooks/useModels';
import {
  useResources,
  useResourceDetail,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  useBatchDelete,
} from '@/hooks/useResources';
import { DynamicFormField, formatValue, RelationValue } from '@/components/DynamicFormField';

export function ResourcesExplorer() {
  const { data: models, isLoading: loadingModels } = useModels();
  const [modelUid, setModelUid] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { data, isLoading, error, refetch } = useResources(
    modelUid ?? '',
    modelUid ? { page, pageSize, keyword: keyword || undefined } : undefined,
  );

  const model = useMemo(() => (models ?? []).find((m) => m.uid === modelUid), [models, modelUid]);
  const fields = (model?.fields ?? []).slice().sort((a, b) => a.order - b.order);

  return (
    <>
      <Card
        title="资源仓库（按模型浏览数据）"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} disabled={!modelUid}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
              disabled={!modelUid}
            >
              新建
            </Button>
          </Space>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            placeholder="选择模型"
            value={modelUid}
            onChange={(v) => {
              setModelUid(v);
              setPage(1);
              setDetailId(null);
              setSelectedRowKeys([]);
            }}
            loading={loadingModels}
            showSearch
            optionFilterProp="label"
            options={(models ?? []).map((m) => ({ label: `${m.name} (${m.uid})`, value: m.uid }))}
            style={{ minWidth: 240 }}
          />
          <Input
            placeholder="按关键字搜索（全文索引）"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            onPressEnter={() => refetch()}
            allowClear
            style={{ width: 280 }}
            disabled={!modelUid}
          />
        </Space>

        {!modelUid && (
          <Alert
            type="info"
            showIcon
            message="请先选择模型（需先在 [元模型 → 模型] 创建模型）"
            style={{ marginBottom: 16 }}
          />
        )}
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={(error as { message?: string }).message}
          />
        )}

        {modelUid && (
          <Table
            rowKey="_id"
            dataSource={data?.list ?? []}
            loading={isLoading}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            pagination={{
              current: page,
              pageSize,
              total: data?.total ?? 0,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 条`,
            }}
            columns={[
              ...fields.slice(0, 5).map((f) => ({
                title: f.name,
                dataIndex: f.uid,
                ellipsis: true,
                render: (v: unknown) => {
                  if (f.type === 'password') {
                    return typeof v === 'string' && v.startsWith('enc:') ? (
                      <Tag color="default">密文</Tag>
                    ) : (
                      '—'
                    );
                  }
                  if (f.type === 'relation' && f.targetModelUid) {
                    return <RelationValue field={f} value={v} />;
                  }
                  return formatValue(f, v);
                },
              })),
              {
                title: '操作',
                width: 140,
                fixed: 'right' as const,
                render: (_: unknown, r: { _id: string }) => (
                  <Space>
                    <a onClick={() => setDetailId(r._id)}>详情</a>
                    <DeleteAction id={r._id} modelUid={modelUid!} />
                  </Space>
                ),
              },
            ]}
            scroll={{ x: 'max-content' }}
          />
        )}

        {selectedRowKeys.length > 0 && modelUid && (
          <div style={{ marginTop: 12 }}>
            <BatchDeleteBar
              ids={selectedRowKeys.map(String)}
              modelUid={modelUid}
              onDone={() => setSelectedRowKeys([])}
            />
          </div>
        )}
      </Card>

      <CreateResourceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        model={model}
        modelUid={modelUid ?? ''}
        fields={fields}
      />

      <ResourceDetailDrawer
        model={model}
        modelUid={modelUid ?? ''}
        id={detailId}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}

function DeleteAction({ id, modelUid }: { id: string; modelUid: string }) {
  const del = useDeleteResource(modelUid);
  return (
    <Popconfirm title="确认删除？" onConfirm={() => del.mutate(id)}>
      <a style={{ color: '#ff4d4f' }}>删除</a>
    </Popconfirm>
  );
}

function BatchDeleteBar({
  ids,
  modelUid,
  onDone,
}: {
  ids: string[];
  modelUid: string;
  onDone: () => void;
}) {
  const batch = useBatchDelete(modelUid);
  return (
    <Space>
      <span>已选 {ids.length} 条</span>
      <Popconfirm
        title={`确认批量删除 ${ids.length} 条？`}
        okButtonProps={{ danger: true }}
        onConfirm={async () => {
          await batch.mutateAsync(ids);
          onDone();
        }}
      >
        <Button danger loading={batch.isPending}>
          批量删除
        </Button>
      </Popconfirm>
      <Button onClick={onDone}>取消</Button>
    </Space>
  );
}

function CreateResourceModal({
  open,
  onClose,
  model,
  modelUid,
  fields,
}: {
  open: boolean;
  onClose: () => void;
  model: Model | undefined;
  modelUid: string;
  fields: FieldDef[];
}) {
  const [form] = Form.useForm();
  const create = useCreateResource(modelUid);
  return (
    <Modal
      title={model ? `新建 ${model.name}` : '新建资源'}
      open={open}
      onOk={async () => {
        const v = await form.validateFields();
        await create.mutateAsync(v);
        form.resetFields();
        onClose();
      }}
      onCancel={onClose}
      confirmLoading={create.isPending}
      width={680}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        {fields.map((f) => (
          <DynamicFormField key={f.uid} field={f} />
        ))}
      </Form>
    </Modal>
  );
}

function ResourceDetailDrawer({
  model,
  modelUid,
  id,
  onClose,
}: {
  model: Model | undefined;
  modelUid: string;
  id: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useResourceDetail(modelUid, id ?? '');
  const update = useUpdateResource(modelUid, id ?? '');
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();

  if (!id) return null;
  const fields = (model?.fields ?? []).slice().sort((a, b) => a.order - b.order);

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      width={760}
      title={data?.uid ? `${data.name ?? data.uid} (${data.uid})` : '资源详情'}
      destroyOnClose
      extra={
        !editMode ? (
          <Button onClick={() => setEditMode(true)}>编辑</Button>
        ) : (
          <Space>
            <Button onClick={() => setEditMode(false)}>取消</Button>
            <Button
              type="primary"
              loading={update.isPending}
              onClick={async () => {
                const v = await form.validateFields();
                await update.mutateAsync(v);
                setEditMode(false);
              }}
            >
              保存
            </Button>
          </Space>
        )
      }
    >
      {isLoading || !data ? (
        <Skeleton active />
      ) : (
        <Tabs
          items={[
            {
              key: 'view',
              label: '查看',
              children: editMode ? (
                <Form form={form} layout="vertical" initialValues={data} preserve={false}>
                  {fields.map((f) => (
                    <DynamicFormField key={f.uid} field={f} />
                  ))}
                </Form>
              ) : (
                <Descriptions column={1} bordered size="small">
                  {fields.map((f) => (
                    <Descriptions.Item key={f.uid} label={f.name}>
                      {f.type === 'relation' && f.targetModelUid ? (
                        <RelationValue field={f} value={data[f.uid]} />
                      ) : (
                        formatValue(f, data[f.uid])
                      )}
                    </Descriptions.Item>
                  ))}
                  <Descriptions.Item label="_id">{data._id as string}</Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {new Date(data.createdAt as string).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'raw',
              label: '原始 JSON',
              children: <pre style={{ background: '#fafafa', padding: 12, fontSize: 12 }}>{JSON.stringify(data, null, 2)}</pre>,
            },
          ]}
        />
      )}
    </Drawer>
  );
}
