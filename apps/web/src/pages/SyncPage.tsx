import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Tag,
  Skeleton,
  Tabs,
  Drawer,
  Descriptions,
  App,
  Popconfirm,
  Alert,
} from 'antd';
import { PlusOutlined, ReloadOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { syncApi, type SyncTask, type SyncLog } from '@/api/sync';
import { useModels, type Model } from '@/hooks/useModels';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STATUS_COLOR: Record<string, string> = {
  idle: 'default',
  running: 'processing',
  success: 'success',
  failed: 'error',
};

export function SyncPage() {
  return (
    <Card title="定时任务（云资源同步）">
      <Tabs
        items={[
          { key: 'tasks', label: '任务', children: <TasksTab /> },
          { key: 'logs', label: '执行日志', children: <LogsTab /> },
        ]}
      />
    </Card>
  );
}

function TasksTab() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['sync', 'tasks'], queryFn: () => syncApi.listTasks() });
  const trigger = useMutation({
    mutationFn: (id: string) => syncApi.trigger(id),
    onSuccess: () => {
      message.success('已触发，3 秒后查日志');
      setTimeout(() => qc.invalidateQueries({ queryKey: ['sync', 'logs'] }), 3000);
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => syncApi.removeTask(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['sync', 'tasks'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
  const create = useMutation({
    mutationFn: (data: Partial<SyncTask>) => syncApi.createTask(data),
    onSuccess: () => {
      message.success('创建成功，cron 已生效');
      qc.invalidateQueries({ queryKey: ['sync', 'tasks'] });
      setOpen(false);
      form.resetFields();
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
  const { data: models } = useModels();

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Partial<SyncTask>>();

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建任务</Button>
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
            { title: '名称', dataIndex: 'name' },
            { title: 'provider', dataIndex: 'provider' },
            {
              title: '目标模型',
              dataIndex: 'modelUid',
              render: (v: string) => (models ?? []).find((m: Model) => m.uid === v)?.name ?? v,
            },
            { title: 'cron', dataIndex: 'cron' },
            { title: '模式', dataIndex: 'syncMode' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
            },
            { title: '启用', dataIndex: 'enabled', render: (v: boolean) => (v ? '✓' : '—') },
            {
              title: '操作',
              width: 200,
              render: (_, t: SyncTask) => (
                <Space>
                  <Button
                    type="link"
                    icon={<PlayCircleOutlined />}
                    onClick={() => trigger.mutate(t._id)}
                    loading={trigger.isPending}
                  >
                    触发
                  </Button>
                  <Popconfirm title="确认删除？" onConfirm={() => remove.mutate(t._id)}>
                    <a style={{ color: '#ff4d4f' }}>删除</a>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      )}
      <Modal
        title="新建同步任务"
        open={open}
        onOk={async () => {
          const v = await form.validateFields();
          await create.mutateAsync(v);
        }}
        onCancel={() => setOpen(false)}
        confirmLoading={create.isPending}
        width={680}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={{ provider: 'mock', syncMode: 'full', cron: '0 */1 * * * *', uniqueKey: 'uid', enabled: true }}>
          <Form.Item label="任务名" name="name" rules={[{ required: true, max: 64 }]}>
            <Input placeholder="例如：阿里云 ECS 全量同步" />
          </Form.Item>
          <Form.Item label="provider" name="provider" rules={[{ required: true }]}>
            <Select options={['mock', 'alicloud', 'tencent', 'aws'].map((p) => ({ label: p, value: p }))} />
          </Form.Item>
          <Form.Item label="目标模型" name="modelUid" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={(models ?? []).map((m: Model) => ({ label: `${m.name} (${m.uid})`, value: m.uid }))}
            />
          </Form.Item>
          <Form.Item label="cron（6 段含秒）" name="cron" rules={[{ required: true }]}>
            <Input placeholder="0 */1 * * * * = 每分钟" />
          </Form.Item>
          <Form.Item label="同步模式" name="syncMode">
            <Select options={[{ label: 'full', value: 'full' }, { label: 'incremental', value: 'incremental' }]} />
          </Form.Item>
          <Form.Item label="region" name="region">
            <Input placeholder="cn-hangzhou" />
          </Form.Item>
          <Form.Item label="资源类型" name="resourceType">
            <Input placeholder="ECS / RDS / ..." />
          </Form.Item>
          <Form.Item label="uniqueKey" name="uniqueKey" tooltip="用于 upsert 去重的字段 uid">
            <Input />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="首次接入新云厂商：在 sync/providers/ 下新建 implements CloudProvider 的类，并在 SyncService 的 providers Map 注册。"
          />
        </Form>
      </Modal>
    </>
  );
}

function LogsTab() {
  const [taskId, setTaskId] = useState<string | undefined>();
  const { data: tasks } = useQuery({ queryKey: ['sync', 'tasks'], queryFn: () => syncApi.listTasks() });
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sync', 'logs', taskId],
    queryFn: () => syncApi.listLogs({ taskId, page: 1, pageSize: 50 }),
  });
  const [drawerLog, setDrawerLog] = useState<SyncLog | null>(null);

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Select
          placeholder="按任务筛选"
          allowClear
          value={taskId}
          onChange={setTaskId}
          style={{ width: 280 }}
          options={(tasks ?? []).map((t) => ({ label: t.name, value: t._id }))}
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
          columns={[
            { title: '开始', dataIndex: 'startedAt' },
            {
              title: '任务',
              dataIndex: 'taskId',
              render: (tid: string) => (tasks ?? []).find((t) => t._id === tid)?.name ?? tid,
            },
            { title: '拉取', dataIndex: 'total', width: 80 },
            { title: '新增', dataIndex: 'created', width: 80 },
            { title: '更新', dataIndex: 'updated', width: 80 },
            { title: '失败', dataIndex: 'failed', width: 80 },
            { title: '跳过', dataIndex: 'skipped', width: 80 },
            {
              title: '状态',
              dataIndex: 'status',
              render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
            },
            {
              title: '操作',
              width: 80,
              render: (_, r: SyncLog) => <a onClick={() => setDrawerLog(r)}>详情</a>,
            },
          ]}
        />
      )}
      <Drawer
        open={!!drawerLog}
        onClose={() => setDrawerLog(null)}
        width={560}
        title="日志详情"
        destroyOnClose
      >
        {drawerLog && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="开始">{drawerLog.startedAt}</Descriptions.Item>
            <Descriptions.Item label="结束">{drawerLog.finishedAt || '—'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLOR[drawerLog.status] ?? 'default'}>{drawerLog.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="拉取">{drawerLog.total}</Descriptions.Item>
            <Descriptions.Item label="新增">{drawerLog.created}</Descriptions.Item>
            <Descriptions.Item label="更新">{drawerLog.updated}</Descriptions.Item>
            <Descriptions.Item label="失败">{drawerLog.failed}</Descriptions.Item>
            <Descriptions.Item label="跳过">{drawerLog.skipped}</Descriptions.Item>
            {drawerLog.error && (
              <Descriptions.Item label="错误">
                <pre style={{ background: '#fff1f0', padding: 8, fontSize: 12 }}>{drawerLog.error}</pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
