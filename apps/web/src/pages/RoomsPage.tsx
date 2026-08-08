/**
 * 机房管理 + 机柜 + U 位
 */
import { useEffect, useState } from 'react';
import { Card, Button, Space, Form, Input, Modal, App, Row, Col, Tag } from 'antd';
import { PlusOutlined, HomeOutlined, AppstoreOutlined } from '@ant-design/icons';
import { roomApi } from '@/api/room';

export function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [cabinets, setCabinets] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedCabinet, setSelectedCabinet] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const { message: msgApi } = App.useApp();

  const loadRooms = async () => {
    try {
      const data = await roomApi.listRooms();
      setRooms(data as any[]);
      if (!selected && (data as any[]).length > 0) {
        setSelected((data as any[])[0]._id);
      }
    } catch (e: any) {
      msgApi.error(e.message || '加载机房失败');
    }
  };

  const loadCabinets = async (roomId: string) => {
    try {
      const data = await roomApi.listCabinets(roomId);
      setCabinets(data as any[]);
      if ((data as any[]).length > 0) {
        setSelectedCabinet((data as any[])[0]._id);
      }
    } catch (e: any) {
      msgApi.error(e.message || '加载机柜失败');
    }
  };

  const loadUnits = async (cabinetId: string) => {
    try {
      const data = await roomApi.listUnits(cabinetId);
      setUnits(data as any[]);
    } catch (e: any) {
      msgApi.error(e.message || '加载 U 位失败');
    }
  };

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => { if (selected) loadCabinets(selected); }, [selected]);
  useEffect(() => { if (selectedCabinet) loadUnits(selectedCabinet); }, [selectedCabinet]);

  const onCreate = async () => {
    const v = await form.validateFields();
    try {
      await roomApi.createRoom(v);
      msgApi.success('已创建');
      setCreateOpen(false);
      form.resetFields();
      loadRooms();
    } catch (e: any) {
      msgApi.error(e.message || '创建失败');
    }
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card
            title={<Space><HomeOutlined />机房列表</Space>}
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建</Button>
            }
          >
            {rooms.length === 0 ? <p style={{ color: '#999' }}>暂无机房</p> : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {rooms.map((r: any) => (
                  <Card
                    key={r._id}
                    size="small"
                    hoverable
                    style={{ background: selected === r._id ? '#e6f7ff' : undefined }}
                    onClick={() => setSelected(r._id)}
                  >
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <strong>{r.name}</strong>
                      <Tag color="blue">{r.code}</Tag>
                      <span style={{ fontSize: 12, color: '#666' }}>机柜: {r.totalCabinets} | U: {r.usedU}/{r.totalU}</span>
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card title={<Space><AppstoreOutlined />机柜布局(2D)</Space>}>
            {cabinets.length === 0 ? <p style={{ color: '#999' }}>暂无机柜</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {cabinets.map((c: any) => {
                  const pct = c.totalU > 0 ? (c.usedU / c.totalU) : 0;
                  const color = pct > 0.8 ? '#f5222d' : pct > 0.5 ? '#fa8c16' : '#52c41a';
                  return (
                    <div
                      key={c._id}
                      onClick={() => setSelectedCabinet(c._id)}
                      style={{
                        padding: 12,
                        border: `2px solid ${selectedCabinet === c._id ? '#1890ff' : '#d9d9d9'}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: '#fafafa',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.code}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>U: {c.usedU}/{c.totalU}</div>
                      <div style={{ height: 4, background: '#f0f0f0', marginTop: 4, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct * 100}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>
        <Col span={10}>
          <Card title={`U 位布局(机柜 ${cabinets.find((c: any) => c._id === selectedCabinet)?.code ?? '-'})`}>
            {units.length === 0 ? <p style={{ color: '#999' }}>暂无 U 位(可分配资源到机柜)</p> : (
              <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
                {units.map((u: any) => (
                  <div
                    key={u._id}
                    style={{
                      padding: '4px 8px',
                      margin: '1px 0',
                      background: u.status === 'occupied' ? '#1890ff' : u.status === 'reserved' ? '#fa8c16' : '#f0f0f0',
                      color: u.status === 'occupied' ? '#fff' : '#666',
                      borderRadius: 2,
                      fontSize: 12,
                    }}
                  >
                    U{u.startU}-{u.endU} ({u.heightU}U) {u.status === 'occupied' && u.resourceId ? `· ${u.resourceId}` : ''}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="新建机房"
        open={createOpen}
        onOk={onCreate}
        onCancel={() => setCreateOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="编码" rules={[{ required: true, pattern: /^[A-Z0-9-]+$/, message: '大写字母数字和 -' }]}>
            <Input placeholder="DC-BJ-01" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="北京亦庄一号机房" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
          <Form.Item name="totalPowerKVA" label="总功率 (KVA)">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
