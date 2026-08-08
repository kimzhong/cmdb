/**
 * 回收站
 */
import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, App, Card } from 'antd';
import { UndoOutlined, DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import { lifecycleApi } from '@/api/lifecycle';
import { LifecycleStateLabels, LifecycleStateColors } from '@cmdb/shared';

export function TrashPage() {
  const [list, setList] = useState<any>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const { message: msgApi } = App.useApp();

  const load = async () => {
    setLoading(true);
    try {
      const data = await lifecycleApi.trash({ pageSize: 50 });
      setList(data as any);
    } catch (e: any) {
      msgApi.error(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRestore = async (modelUid: string, id: string) => {
    try {
      await lifecycleApi.restore(modelUid, id, 'admin');
      msgApi.success('已恢复');
      load();
    } catch (e: any) {
      msgApi.error(e.message || '恢复失败');
    }
  };

  const onPurge = async (modelUid: string, id: string) => {
    try {
      await lifecycleApi.purge(modelUid, id);
      msgApi.success('已永久删除');
      load();
    } catch (e: any) {
      msgApi.error(e.message || '删除失败');
    }
  };

  return (
    <Card
      title={
        <Space>
          <InboxOutlined />
          <span>回收站</span>
          <Tag color="orange">F4 · 软删除恢复</Tag>
        </Space>
      }
      extra={<Tag color="blue">共 {list.total} 条</Tag>}
    >
      <Table
        rowKey="_id"
        loading={loading}
        dataSource={list.list}
        pagination={false}
        columns={[
          { title: '名称', key: 'name',
            render: (_: any, r: any) => r.name || r.uid || r._id },
          { title: '模型', dataIndex: 'modelUid', key: 'modelUid',
            render: (t: string) => <Tag color="blue">{t}</Tag> },
          { title: '状态', key: 'state',
            render: (_: any, r: any) => {
              const state = r.lifecycle?.state;
              return <Tag color={LifecycleStateColors[state as keyof typeof LifecycleStateColors]}>
                {LifecycleStateLabels[state as keyof typeof LifecycleStateLabels] || state}
              </Tag>;
            } },
          { title: '删除时间', dataIndex: 'deletedAt', key: 'deletedAt',
            render: (t: string) => t ? new Date(t).toLocaleString() : '-' },
          { title: '删除者', dataIndex: 'deletedBy', key: 'deletedBy' },
          { title: '操作', key: 'action', width: 200,
            render: (_: any, r: any) => (
              <Space>
                <Button type="primary" size="small" icon={<UndoOutlined />} onClick={() => onRestore(r.modelUid, r._id)}>
                  恢复
                </Button>
                <Button danger size="small" icon={<DeleteOutlined />} onClick={() => onPurge(r.modelUid, r._id)}>
                  永久删除
                </Button>
              </Space>
            ) },
        ]}
      />
    </Card>
  );
}
