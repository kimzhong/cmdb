/**
 * 关系管理页面
 * 关系列表 + 关系类型管理
 */
import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, App, Card, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, ApartmentOutlined, TagsOutlined } from '@ant-design/icons';
import { relationsApi } from '@/api/relations';

const { TabPane } = Tabs;

export function RelationsPage() {
  const [relations, setRelations] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { message: msgApi } = App.useApp();

  const load = async () => {
    setLoading(true);
    try {
      const [rels, tps] = await Promise.all([relationsApi.list(), relationsApi.listTypes()]);
      setRelations(rels as any[]);
      setTypes(tps as any[]);
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
      await relationsApi.create({ ...values, createdBy: 'admin' });
      msgApi.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e: any) {
      msgApi.error(e.message || '创建失败');
    }
  };

  const onDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除?',
      content: '关系将被归档(可在 MongoDB 恢复)',
      onOk: async () => {
        try {
          await relationsApi.remove(id);
          msgApi.success('已归档');
          load();
        } catch (e: any) {
          msgApi.error(e.message || '删除失败');
        }
      },
    });
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <ApartmentOutlined />
            <span>关系管理</span>
            <Tag color="blue">F1 · 关系定义</Tag>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新建关系
          </Button>
        }
      >
        <Tabs defaultActiveKey="relations">
          <TabPane tab={<span><ApartmentOutlined /> 关系实例</span>} key="relations">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={relations}
              pagination={{ pageSize: 20 }}
              columns={[
                { title: '源', dataIndex: 'sourceId', key: 'sourceId' },
                { title: '源类型', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
                { title: '→', width: 40, render: () => '→' },
                { title: '关系类型', dataIndex: 'relationType', key: 'relationType',
                  render: (t: string) => <Tag color="purple">{t}</Tag> },
                { title: '目标', dataIndex: 'targetId', key: 'targetId' },
                { title: '目标类型', dataIndex: 'targetType', key: 'targetType', width: 100 },
                { title: '状态', dataIndex: 'status', key: 'status',
                  render: (s: string) => <Tag color={s === 'active' ? 'green' : 'default'}>{s}</Tag> },
                { title: '创建者', dataIndex: 'createdBy', key: 'createdBy', width: 100 },
                { title: '操作', key: 'action', width: 80,
                  render: (_: any, r: any) => (
                    <Button danger size="small" icon={<DeleteOutlined />} onClick={() => onDelete(r._id)}>
                      归档
                    </Button>
                  ) },
              ]}
            />
          </TabPane>
          <TabPane tab={<span><TagsOutlined /> 关系类型 ({types.length})</span>} key="types">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={types}
              pagination={false}
              columns={[
                { title: '编码', dataIndex: 'code', key: 'code' },
                { title: '名称', dataIndex: 'name', key: 'name' },
                { title: '反向编码', dataIndex: 'inverseCode', key: 'inverseCode' },
                { title: '基数', dataIndex: 'cardinality', key: 'cardinality', width: 80 },
                { title: '源约束', dataIndex: 'sourceTypeConstraint', key: 'src', width: 100 },
                { title: '目标约束', dataIndex: 'targetTypeConstraint', key: 'tgt', width: 100 },
                { title: '双向', dataIndex: 'bidirectional', key: 'bi', width: 80,
                  render: (b: boolean) => b ? <Tag color="cyan">是</Tag> : <Tag>否</Tag> },
                { title: '系统', dataIndex: 'isSystem', key: 'sys', width: 80,
                  render: (s: boolean) => s ? <Tag color="red">系统</Tag> : <Tag color="blue">用户</Tag> },
              ]}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="新建关系"
        open={modalOpen}
        onOk={onCreate}
        onCancel={() => setModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="sourceId" label="源 ID" rules={[{ required: true }]}>
            <Input placeholder="如: r_001" />
          </Form.Item>
          <Form.Item name="sourceType" label="源类型" rules={[{ required: true }]} initialValue="resource">
            <Select options={[
              { value: 'resource', label: 'resource (资源)' },
              { value: 'app', label: 'app (应用)' },
              { value: 'business', label: 'business (业务)' },
              { value: 'subnet', label: 'subnet (子网)' },
              { value: 'cabinet', label: 'cabinet (机柜)' },
            ]} />
          </Form.Item>
          <Form.Item name="relationType" label="关系类型" rules={[{ required: true }]}>
            <Select options={types.map((t: any) => ({ value: t.code, label: `${t.name} (${t.code})` }))} />
          </Form.Item>
          <Form.Item name="targetId" label="目标 ID" rules={[{ required: true }]}>
            <Input placeholder="如: r_002" />
          </Form.Item>
          <Form.Item name="targetType" label="目标类型" rules={[{ required: true }]} initialValue="resource">
            <Select options={[
              { value: 'resource', label: 'resource' },
              { value: 'app', label: 'app' },
              { value: 'business', label: 'business' },
              { value: 'subnet', label: 'subnet' },
              { value: 'cabinet', label: 'cabinet' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
