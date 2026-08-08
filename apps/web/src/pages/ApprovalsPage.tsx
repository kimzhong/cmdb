/**
 * 审批工单中心
 */
import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, App, Card, Tabs } from 'antd';
import { CheckOutlined, CloseOutlined, AuditOutlined, FileTextOutlined, UnorderedListOutlined, PlusOutlined } from '@ant-design/icons';
import { approvalApi } from '@/api/approval';

const { TabPane } = Tabs;
const { TextArea } = Input;

export function ApprovalsPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('mine');
  const [detail, setDetail] = useState<any | null>(null);
  const [decideOpen, setDecideOpen] = useState(false);
  const [decideType, setDecideType] = useState<'approve' | 'reject'>('approve');
  const [form] = Form.useForm();
  const { message: msgApi } = App.useApp();

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeTab === 'pending') params.mine = true;
      if (activeTab === 'mine') params.requesterId = 'admin';
      const data = await approvalApi.list(params);
      setList(data as any[]);
    } catch (e: any) {
      msgApi.error(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeTab]);

  const openDecide = (t: 'approve' | 'reject', d: any) => {
    setDetail(d);
    setDecideType(t);
    form.resetFields();
    setDecideOpen(true);
  };

  const onDecide = async () => {
    const values = await form.validateFields();
    try {
      if (decideType === 'approve') {
        await approvalApi.approve(detail._id, { approverId: 'admin', approverName: 'admin', comment: values.comment });
      } else {
        await approvalApi.reject(detail._id, { approverId: 'admin', approverName: 'admin', comment: values.comment });
      }
      msgApi.success(decideType === 'approve' ? '已通过' : '已拒绝');
      setDecideOpen(false);
      load();
    } catch (e: any) {
      msgApi.error(e.message || '操作失败');
    }
  };

  const onCreate = () => {
    Modal.confirm({
      title: '演示: 创建删除资源工单',
      onOk: async () => {
        try {
          await approvalApi.create({
            type: 'delete_resource',
            targetType: 'resource',
            targetId: 'demo-r-001',
            payload: { reason: '测试' },
            requesterId: 'demo-user',
            requesterName: '演示用户',
          });
          msgApi.success('工单已创建');
          load();
        } catch (e: any) {
          msgApi.error(e.message || '创建失败');
        }
      },
    });
  };

  const statusColor = (s: string) => ({
    pending: 'blue', approved: 'green', rejected: 'red', cancelled: 'default', expired: 'orange', applied: 'purple',
  } as any)[s] || 'default';

  return (
    <div>
      <Card
        title={
          <Space>
            <AuditOutlined />
            <span>审批工单</span>
            <Tag color="blue">F5 · 审批流</Tag>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            新建工单(演示)
          </Button>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><FileTextOutlined /> 待我审批</span>} key="pending" />
          <TabPane tab={<span><UnorderedListOutlined /> 我发起的</span>} key="mine" />
          <TabPane tab={<span><UnorderedListOutlined /> 全部</span>} key="all" />
        </Tabs>
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={list}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: '工单号', dataIndex: 'ticketNo', key: 'ticketNo', width: 160 },
            { title: '类型', dataIndex: 'type', key: 'type', width: 160,
              render: (t: string) => <Tag>{t}</Tag> },
            { title: '目标', key: 'target', width: 200,
              render: (_: any, r: any) => `${r.targetType}: ${r.targetId}` },
            { title: '申请人', dataIndex: 'requesterName', key: 'requesterName', width: 100 },
            { title: '进度', key: 'progress', width: 100,
              render: (_: any, r: any) => `${r.currentStep + 1}/${r.totalSteps}` },
            { title: '状态', dataIndex: 'status', key: 'status', width: 100,
              render: (s: string) => <Tag color={statusColor(s)}>{s}</Tag> },
            { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
              render: (t: string) => t ? new Date(t).toLocaleString() : '-' },
            { title: '操作', key: 'action', width: 200,
              render: (_: any, r: any) => (
                r.status === 'pending' ? (
                  <Space>
                    <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => openDecide('approve', r)}>
                      通过
                    </Button>
                    <Button danger size="small" icon={<CloseOutlined />} onClick={() => openDecide('reject', r)}>
                      拒绝
                    </Button>
                  </Space>
                ) : <Tag>{r.status}</Tag>
              ) },
          ]}
        />
      </Card>

      <Modal
        title={decideType === 'approve' ? '审批通过' : '审批拒绝'}
        open={decideOpen}
        onOk={onDecide}
        onCancel={() => setDecideOpen(false)}
        okText={decideType === 'approve' ? '通过' : '拒绝'}
        cancelText="取消"
        okButtonProps={{ danger: decideType === 'reject' }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="comment" label="审批意见" rules={[{ required: true, message: '请填写审批意见' }]}>
            <TextArea rows={4} placeholder="请说明..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
