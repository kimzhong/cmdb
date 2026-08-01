import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Space, Tag, Popconfirm, App, Skeleton, Alert } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories';

interface FormValues {
  uid: string;
  name: string;
  icon?: string;
  order?: number;
}

export function MetaModelCategories() {
  const { data, isLoading, error, refetch } = useCategories();
  const create = useCreateCategory();
  const remove = useDeleteCategory();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const { modal } = App.useApp();

  const onSubmit = async () => {
    const values = await form.validateFields();
    await create.mutateAsync(values);
    form.resetFields();
    setOpen(false);
  };

  const onDelete = (id: string, name: string) => {
    modal.confirm({
      title: `确认删除分类 "${name}"？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => remove.mutateAsync(id),
    });
  };

  return (
    <Card
      title="模型分类（4 大内置：资产 / 应用 / 组织 / 其他）"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            新建分类
          </Button>
        </Space>
      }
    >
      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="加载失败"
          description={(error as { message?: string }).message}
        />
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
            {
              title: '唯一标识 (uid)',
              dataIndex: 'uid',
              render: (v) => <Tag color="blue">{v}</Tag>,
            },
            {
              title: '图标',
              dataIndex: 'icon',
              render: (v) => v || '—',
            },
            { title: '排序', dataIndex: 'order', width: 80 },
            {
              title: '是否内置',
              dataIndex: 'builtin',
              width: 100,
              render: (v) => (v ? <Tag color="gold">内置</Tag> : <Tag>自定义</Tag>),
            },
            {
              title: '操作',
              width: 120,
              render: (_, record) =>
                record.builtin ? (
                  <Tag color="default">不可删</Tag>
                ) : (
                  <Popconfirm title="确认删除？" onConfirm={() => onDelete(record._id, record.name)}>
                    <a style={{ color: '#ff4d4f' }}>删除</a>
                  </Popconfirm>
                ),
            },
          ]}
        />
      )}

      <Modal
        title="新建分类"
        open={open}
        onOk={onSubmit}
        onCancel={() => setOpen(false)}
        confirmLoading={create.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item label="唯一标识 (uid)" name="uid" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母/数字/下划线' }]}>
            <Input placeholder="例如：asset_extended" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, max: 32 }]}>
            <Input placeholder="例如：扩展资产" />
          </Form.Item>
          <Form.Item label="图标" name="icon">
            <Input placeholder="AntD icon 名，可选" />
          </Form.Item>
          <Form.Item label="排序" name="order" initialValue={0}>
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
