/**
 * 仪表盘(ECharts 简化版)
 */
import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Tag, Space, Spin } from 'antd';
import { DashboardOutlined, DatabaseOutlined, ApartmentOutlined, AuditOutlined, ClusterOutlined, GlobalOutlined } from '@ant-design/icons';
import { reportingApi } from '@/api/reporting';
import { App } from 'antd';

export function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [lifecycle, setLifecycle] = useState<any[]>([]);
  const [ipam, setIpam] = useState<any[]>([]);
  const [approvalPending, setApprovalPending] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { message: msgApi } = App.useApp();

  useEffect(() => {
    Promise.all([
      reportingApi.summary(),
      reportingApi.lifecycleDistribution(),
      reportingApi.ipamUsage(),
      reportingApi.approvalPending(),
    ]).then(([s, l, i, a]: any[]) => {
      setSummary(s);
      setLifecycle(l || []);
      setIpam(i || []);
      setApprovalPending(a);
    }).catch((e: any) => msgApi.error(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin tip="加载中..."><div style={{ height: 200 }} /></Spin>;

  // ECharts 颜色
  const lcColors: Record<string, string> = {
    in_use: '#52c41a',
    in_stock: '#8c8c8c',
    maintaining: '#fa8c16',
    changing: '#1890ff',
    retired: '#f5222d',
    deleted: '#bfbfbf',
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <DashboardOutlined />
            <span>仪表盘</span>
            <Tag color="blue">F11 · 报表</Tag>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="资源总数"
                value={summary?.totalResources ?? 0}
                prefix={<DatabaseOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="关系总数"
                value={summary?.totalRelations ?? 0}
                prefix={<ApartmentOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待审批工单"
                value={summary?.pendingApprovals ?? 0}
                prefix={<AuditOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="IPAM 子网"
                value={ipam.length}
                prefix={<GlobalOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title={<Space><ClusterOutlined />资源生命周期分布</Space>}>
            <BarChart
              data={(lifecycle || []).map((l: any) => ({
                label: l.state,
                value: l.count,
                color: lcColors[l.state] || '#8c8c8c',
              }))}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<Space><GlobalOutlined />IPAM 子网使用率</Space>}>
            {ipam.length === 0 ? <p style={{ color: '#999' }}>暂无子网</p> : (
              <div>
                {ipam.map((s: any) => (
                  <div key={s.subnetId} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><Tag color="blue">{s.cidr}</Tag></span>
                      <span>{s.allocated}/{s.total} ({s.utilizationPercent}%)</span>
                    </div>
                    <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(s.utilizationPercent, 100)}%`,
                        background: s.utilizationPercent > 80 ? '#f5222d' : s.utilizationPercent > 50 ? '#fa8c16' : '#52c41a',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title={<Space><AuditOutlined />审批待办(by 类型)</Space>}>
            {approvalPending && approvalPending.byType && approvalPending.byType.length > 0 ? (
              <div>
                {approvalPending.byType.map((b: any) => (
                  <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <Tag>{b._id}</Tag>
                    <span style={{ color: '#f5222d', fontWeight: 600 }}>{b.count}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                  <strong>合计: {approvalPending.total}</strong>
                </div>
              </div>
            ) : <p style={{ color: '#999' }}>暂无待办</p>}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<Space><DashboardOutlined />系统能力</Space>}>
            <Row gutter={[8, 8]}>
              {[
                { name: '元模型', color: 'blue' },
                { name: '资源仓库', color: 'cyan' },
                { name: '标签', color: 'green' },
                { name: '应用视图', color: 'purple' },
                { name: '关系图谱', color: 'magenta' },
                { name: '审批流', color: 'orange' },
                { name: '软删除', color: 'red' },
                { name: '批量导入', color: 'gold' },
                { name: '自动发现', color: 'lime' },
                { name: 'IPAM', color: 'volcano' },
                { name: '机房拓扑', color: 'geekblue' },
                { name: 'RBAC', color: 'processing' },
              ].map((t) => <Tag key={t.name} color={t.color}>{t.name}</Tag>)}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/** 简单柱状图(无 ECharts 依赖) */
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  if (!data || data.length === 0) return <p style={{ color: '#999' }}>暂无数据</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 100, fontSize: 12, color: '#666' }}>{d.label}</div>
          <div style={{ flex: 1, background: '#f0f0f0', height: 20, borderRadius: 4, overflow: 'hidden', marginRight: 8 }}>
            <div style={{
              width: `${(d.value / max) * 100}%`,
              height: '100%',
              background: d.color,
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ width: 60, textAlign: 'right', fontWeight: 600 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}
