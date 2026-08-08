/**
 * 批量导入导出
 */
import { useEffect, useState } from 'react';
import { Card, Button, Space, Tag, Form, Input, Select, App, Tabs, Table, Alert } from 'antd';
import { DownloadOutlined, UploadOutlined, ImportOutlined, ExportOutlined, FileExcelOutlined } from '@ant-design/icons';
import { bulkIoApi } from '@/api/bulk-io';

const { TabPane } = Tabs;
const { TextArea } = Input;

export function BulkIoPage() {
  const [imports, setImports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { message: msgApi } = App.useApp();

  const load = async () => {
    setLoading(true);
    try {
      const i = await bulkIoApi.listImports();
      setImports((i as any[]) || []);
    } catch (e: any) {
      msgApi.error(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onDownloadTemplate = async (modelUid: string) => {
    try {
      const t: any = await bulkIoApi.getTemplate(modelUid);
      const blob = new Blob([t.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${modelUid}-template.csv`;
      a.click();
      URL.revokeObjectURL(url);
      msgApi.success('模板下载成功');
    } catch (e: any) {
      msgApi.error(e.message || '下载失败');
    }
  };

  const onImport = async (values: any) => {
    try {
      const rows = values.data.split('\n').filter(Boolean).map((line: string, i: number) => ({
        rowIndex: i,
        data: JSON.parse(line),
      }));
      const r: any = await bulkIoApi.createImport({
        modelUid: values.modelUid,
        mode: values.mode,
        dryRun: values.dryRun ?? false,
        uploadedBy: 'admin',
        fileName: 'manual.json',
        fileSize: values.data.length,
        rows,
      });
      msgApi.success(`导入任务已创建: ${r._id?.slice(-6)}`);
      setTimeout(load, 1000);
    } catch (e: any) {
      msgApi.error(e.message || '导入失败');
    }
  };

  const onExport = async (values: any) => {
    try {
      const r: any = await bulkIoApi.createExport({
        modelUid: values.modelUid,
        format: values.format,
        fields: [],
        createdBy: 'admin',
      });
      msgApi.success(`导出任务已创建: ${r._id?.slice(-6)}`);
      setTimeout(load, 2000);
    } catch (e: any) {
      msgApi.error(e.message || '导出失败');
    }
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <FileExcelOutlined />
            <span>批量导入导出</span>
            <Tag color="blue">F6 · Bulk I/O</Tag>
          </Space>
        }
      >
        <Tabs defaultActiveKey="import">
          <TabPane tab={<span><ImportOutlined /> 批量导入</span>} key="import">
            <Alert
              type="info"
              message={'简化模式: 每行一个 JSON 对象(用换行分隔),例如 {"name":"host-1","Ip":"10.0.0.1"}'}
              style={{ marginBottom: 16 }}
            />
            <Form layout="vertical" onFinish={onImport}>
              <Form.Item name="modelUid" label="目标模型" rules={[{ required: true }]} initialValue="linux-server">
                <Input />
              </Form.Item>
              <Form.Item name="mode" label="模式" rules={[{ required: true }]} initialValue="upsert">
                <Select options={[
                  { value: 'create_only', label: 'create_only - 仅创建' },
                  { value: 'upsert', label: 'upsert - 创建或更新' },
                  { value: 'update_only', label: 'update_only - 仅更新' },
                ]} />
              </Form.Item>
              <Form.Item name="dryRun" label="试运行" initialValue={true}>
                <Select options={[
                  { value: true, label: '是(只校验不入库)' },
                  { value: false, label: '否(直接入库)' },
                ]} />
              </Form.Item>
              <Form.Item name="data" label="数据(每行一个 JSON)" rules={[{ required: true }]}>
                <TextArea rows={6} placeholder='{"name":"host-1","Ip":"10.0.0.1","Cpu":4}
{"name":"host-2","Ip":"10.0.0.2","Cpu":8}' />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<UploadOutlined />}>开始导入</Button>
                  <Button onClick={() => onDownloadTemplate('linux-server')} icon={<DownloadOutlined />}>
                    下载 CSV 模板
                  </Button>
                </Space>
              </Form.Item>
            </Form>

            <h4 style={{ marginTop: 24 }}>导入历史</h4>
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              dataSource={imports}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: 'ID', dataIndex: 'id', render: (i: string) => i?.slice(-8) },
                { title: '文件', dataIndex: 'fileName' },
                { title: '模式', dataIndex: 'mode' },
                { title: '状态', dataIndex: 'status',
                  render: (s: string) => <Tag color={s === 'completed' ? 'green' : s === 'failed' ? 'red' : 'blue'}>{s}</Tag> },
                { title: '进度', dataIndex: 'progress',
                  render: (p: any) => p ? `${p.success}/${p.total}` : '-' },
              ]}
            />
          </TabPane>

          <TabPane tab={<span><ExportOutlined /> 批量导出</span>} key="export">
            <Form layout="vertical" onFinish={onExport}>
              <Form.Item name="modelUid" label="源模型" rules={[{ required: true }]} initialValue="linux-server">
                <Input />
              </Form.Item>
              <Form.Item name="format" label="格式" rules={[{ required: true }]} initialValue="csv">
                <Select options={[
                  { value: 'csv', label: 'CSV' },
                  { value: 'json', label: 'JSON' },
                  { value: 'xlsx', label: 'XLSX (Markdown 替代)' },
                ]} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<ExportOutlined />}>开始导出</Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
