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
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCategories, type Category } from '@/hooks/useCategories';
import {
  useModelGroups,
  useCreateModelGroup,
  useDeleteModelGroup,
} from '@/hooks/useModelGroups';

interface FormValues {
  categoryId: string;
  uid: string;
  name: string;
  order?: number;
}

export function MetaModelGroups() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const { data: cats, isLoading: loadingCats } = useCategories();
  const { data, isLoading, error, refetch } = useModelGroups(selectedCategory);
  const create = useCreateModelGroup(selectedCategory);
  const remove = useDeleteModelGroup(selectedCategory);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const { modal } = App.useApp();

  const onSubmit = async () => {
    const v = await form.validateFields();
    await create.mutateAsync(v);
    form.resetFields();
    setOpen(false);
  };

  const onDelete = (id: string, name: string) => {
    modal.confirm({
      title: `确认删除分组 "${name}"？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => remove.mutateAsync(id),
    });
  };

  return (
    <Card
      title="模型分组（按分类筛选）"
      extra={
        <Space>
          <Select
            placeholder="按分类筛选"
            allowClear
            style={{ width: 200 }}
            value={selectedCategory}
            onChange={(v) => setSelectedCategory(v)}
            loading={loadingCats}
            options={(cats ?? []).map((c: Category) => ({ label: c.name, value: c._id }))}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            新建分组
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
            {
              title: '唯一标识',
              dataIndex: 'uid',
              render: (v: string) => <Tag color="blue">{v}</Tag>,
            },
            {
              title: '所属分类',
              dataIndex: 'categoryId',
              render: (cid: string) => (cats ?? []).find((c: Category) => c._id === cid)?.name || cid,
            },
            { title: '排序', dataIndex: 'order', width: 80 },
            {
              title: '操作',
              width: 100,
              render: (_, r) => (
                <Popconfirm title="确认删除？" onConfirm={() => onDelete(r._id, r.name)}>
                  <a style={{ color: '#ff4d4f' }}>删除</a>
                </Popconfirm>
              ),
            },
          ]}
        />
      )}

      <Modal
        title="新建模型分组"
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
            />
          </Form.Item>
          <Form.Item label="唯一标识 (uid)" name="uid" rules={[{ required: true, pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母/数字/下划线' }]}>
            <Input placeholder="例如：server" />
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true, max: 32 }]}>
            <Input placeholder="例如：服务器" />
          </Form.Item>
          <Form.Item label="排序" name="order" initialValue={0}>
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
