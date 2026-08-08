/**
 * 自动发现任务列表
 */
import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, App, Card, Switch } from 'antd';
import { PlusOutlined, PlayCircleOutlined, CloudDownloadOutlined, ApiOutlined } from '@ant-design/icons';
import { discoveryApi } from '@/api/discovery';

const { TextArea } = Input;

export function DiscoveryPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const { message: msgApi } = App.useApp();

  const load = async () => {
    setLoading(true);
    try {
      const data = await discoveryApi.listTasks();
      setList(data as any[]);
    } catch (e: any) {
      msgApi.error(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    const values = await form.validateFields();
    try {
      const dto: any = {
        name: values.name,
        protocol: values.protocol,
        target: { type: 'host_list', hostList: values.hostList.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean) },
        modelUid: values.modelUid,
        fieldMapping: {},
        conflictPolicy: 'merge',
        createdBy: 'admin',
      };
      await discoveryApi.createTask(dto);
      msgApi.success('任务已创建');
      setCreateOpen(false);
      form.resetFields();
      load();
    } catch (e: any) {
      msgApi.error(e.message || '创建失败');
    }
  };

  const onRun = async (id: string) => {
    try {
      const r: any = await discoveryApi.runTask(id);
      msgApi.success(`已启动: ${r.taskName}`);
      setTimeout(load, 2000);
    } catch (e: any) {
      msgApi.error(e.message || '启动失败');
    }
  };

  const statusColor: Record<string, string> = {
    idle: 'default', running: 'processing', success: 'green', failed: 'red', partial: 'orange', disabled: 'default',
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <CloudDownloadOutlined />
            <span>自动发现任务</span>
            <Tag color="blue">F7 · ADS</Tag>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建任务
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={list}
          pagination={false}
          columns={[
            { title: '名称', dataIndex: 'name', key: 'name' },
            { title: '协议', dataIndex: 'protocol', key: 'protocol', width: 100,
              render: (p: string) => <Tag color="cyan"><ApiOutlined /> {p}</Tag> },
            { title: '目标模型', dataIndex: 'modelUid', key: 'modelUid' },
            { title: '状态', dataIndex: 'status', key: 'status', width: 100,
              render: (s: string) => <Tag color={statusColor[s]}>{s}</Tag> },
            { title: '上次运行', dataIndex: 'lastRunAt', key: 'lastRun',
              render: (t: string) => t ? new Date(t).toLocaleString() : '-' },
            { title: '结果', dataIndex: 'lastRunStats', key: 'stats', width: 180,
              render: (s: any) => s ? (
                <span>
                  新 {s.newResources ?? 0} / 更 {s.updatedResources ?? 0}
                </span>
              ) : '-' },
            { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 70,
              render: (e: boolean) => <Switch checked={e} disabled size="small" /> },
            { title: '操作', key: 'action', width: 100,
              render: (_: any, r: any) => (
                <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => onRun(r.id)}>
                  运行
                </Button>
              ) },
          ]}
        />
      </Card>

      <Modal
        title="新建发现任务"
        open={createOpen}
        onOk={onCreate}
        onCancel={() => setCreateOpen(false)}
        okText="创建"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="任务名" rules={[{ required: true }]}>
            <Input placeholder="如: 阿里云主机扫描" />
          </Form.Item>
          <Form.Item name="protocol" label="协议" rules={[{ required: true }]} initialValue="mock">
            <Select options={[
              { value: 'mock', label: 'mock (模拟采集,无需 SSH)' },
              { value: 'ssh', label: 'ssh (需安装 ssh2)' },
              { value: 'agent', label: 'agent (需部署 agent)' },
            ]} />
          </Form.Item>
          <Form.Item name="hostList" label="目标主机(每行一个或逗号分隔)" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="10.0.0.1&#10;10.0.0.2&#10;10.0.0.3" />
          </Form.Item>
          <Form.Item name="modelUid" label="目标模型" rules={[{ required: true }]} initialValue="linux-server">
            <Input placeholder="linux-server" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
