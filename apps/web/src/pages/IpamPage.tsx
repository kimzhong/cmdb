/**
 * IPAM 子网管理
 */
import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, App, Card } from 'antd';
import { PlusOutlined, GlobalOutlined, WifiOutlined } from '@ant-design/icons';
import { ipamApi } from '@/api/ipam';

export function IpamPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const { message: msgApi } = App.useApp();

  const load = async () => {
    setLoading(true);
    try {
      const data = await ipamApi.listSubnets();
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
      await ipamApi.createSubnet(values);
      msgApi.success('创建成功');
      setCreateOpen(false);
      form.resetFields();
      load();
    } catch (e: any) {
      msgApi.error(e.message || '创建失败');
    }
  };

  const envColor: Record<string, string> = {
    production: 'red', staging: 'orange', dev: 'blue', test: 'cyan', office: 'default',
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <GlobalOutlined />
            <span>IPAM 子网管理</span>
            <Tag color="blue">F8 · IP 地址管理</Tag>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建子网
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={list}
          pagination={false}
          columns={[
            { title: 'CIDR', dataIndex: 'cidr', key: 'cidr',
              render: (c: string) => <Tag color="purple"><WifiOutlined /> {c}</Tag> },
            { title: '名称', dataIndex: 'name', key: 'name' },
            { title: '环境', dataIndex: 'environment', key: 'env', width: 100,
              render: (e: string) => <Tag color={envColor[e]}>{e}</Tag> },
            { title: '区域', dataIndex: 'scope', key: 'scope' },
            { title: '网关', dataIndex: 'gateway', key: 'gateway' },
            { title: '总数', dataIndex: 'totalAddresses', key: 'total', width: 80 },
            { title: '已分配', dataIndex: 'allocatedAddresses', key: 'alloc', width: 100,
              render: (n: number, r: any) => `${n}/${r.totalAddresses}` },
            { title: '利用率', key: 'util', width: 200,
              render: (_: any, r: any) => {
                const pct = r.totalAddresses > 0 ? Math.round((r.allocatedAddresses / r.totalAddresses) * 100) : 0;
                return (
                  <div>
                    <div style={{ fontSize: 12, color: '#666' }}>{pct}%</div>
                    <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: pct > 80 ? '#f5222d' : pct > 50 ? '#fa8c16' : '#52c41a',
                      }} />
                    </div>
                  </div>
                );
              } },
          ]}
        />
      </Card>

      <Modal
        title="新建子网"
        open={createOpen}
        onOk={onCreate}
        onCancel={() => setCreateOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="cidr" label="CIDR" rules={[
            { required: true },
            { pattern: /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, message: '格式: 10.0.0.0/24' },
          ]}>
            <Input placeholder="10.0.0.0/24" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="如: 业务网段" />
          </Form.Item>
          <Form.Item name="environment" label="环境" rules={[{ required: true }]} initialValue="dev">
            <Select options={[
              { value: 'production', label: 'production' },
              { value: 'staging', label: 'staging' },
              { value: 'dev', label: 'dev' },
              { value: 'test', label: 'test' },
              { value: 'office', label: 'office' },
            ]} />
          </Form.Item>
          <Form.Item name="scope" label="区域" rules={[{ required: true }]}>
            <Input placeholder="如: beijing-dc1" />
          </Form.Item>
          <Form.Item name="gateway" label="网关">
            <Input placeholder="如: 10.0.0.1" />
          </Form.Item>
          <Form.Item name="vlanId" label="VLAN ID">
            <Input type="number" placeholder="100" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
