import { Layout as AntLayout, Menu, theme, Typography, Button, Space, Tag } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppstoreOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  HeartOutlined,
  HomeOutlined,
  TagsOutlined,
  ClusterOutlined,
  CloudSyncOutlined,
  SearchOutlined,
  AuditOutlined,
  LogoutOutlined,
  ApartmentOutlined,
  AuditOutlined as ApproveOutlined,
  InboxOutlined,
  GlobalOutlined,
  CloudDownloadOutlined,
  AppstoreAddOutlined,
  FileExcelOutlined,
  HomeOutlined as RoomOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

const items = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">仪表盘</Link> },
  { key: '/home', icon: <HomeOutlined />, label: <Link to="/home">首页</Link> },
  {
    key: '/meta-model',
    icon: <ClusterOutlined />,
    label: '元模型',
    children: [
      { key: '/meta-model/categories', icon: <AppstoreOutlined />, label: <Link to="/meta-model/categories">模型分类</Link> },
      { key: '/meta-model/groups', icon: <ClusterOutlined />, label: <Link to="/meta-model/groups">模型分组</Link> },
      { key: '/meta-model/models', icon: <DatabaseOutlined />, label: <Link to="/meta-model/models">模型</Link> },
      { key: '/model-templates', icon: <AppstoreAddOutlined />, label: <Link to="/model-templates">预置模型库</Link> },
    ],
  },
  {
    key: '/cmdb',
    icon: <DatabaseOutlined />,
    label: 'CMDB 数据',
    children: [
      { key: '/resources', icon: <DatabaseOutlined />, label: <Link to="/resources">资源仓库</Link> },
      { key: '/relations', icon: <ApartmentOutlined />, label: <Link to="/relations">关系管理</Link> },
      { key: '/tags', icon: <TagsOutlined />, label: <Link to="/tags">标签管理</Link> },
      { key: '/apps', icon: <ClusterOutlined />, label: <Link to="/apps">应用视图</Link> },
      { key: '/ipam', icon: <GlobalOutlined />, label: <Link to="/ipam">IPAM 子网</Link> },
      { key: '/rooms', icon: <RoomOutlined />, label: <Link to="/rooms">机房拓扑</Link> },
    ],
  },
  {
    key: '/ops',
    icon: <CloudSyncOutlined />,
    label: '运维',
    children: [
      { key: '/discovery', icon: <CloudDownloadOutlined />, label: <Link to="/discovery">自动发现</Link> },
      { key: '/sync', icon: <CloudSyncOutlined />, label: <Link to="/sync">定时任务</Link> },
      { key: '/bulk-io', icon: <FileExcelOutlined />, label: <Link to="/bulk-io">批量导入导出</Link> },
    ],
  },
  {
    key: '/gov',
    icon: <ApproveOutlined />,
    label: '治理',
    children: [
      { key: '/approvals', icon: <ApproveOutlined />, label: <Link to="/approvals">审批工单</Link> },
      { key: '/trash', icon: <InboxOutlined />, label: <Link to="/trash">回收站</Link> },
      { key: '/search', icon: <SearchOutlined />, label: <Link to="/search">全局搜索</Link> },
      { key: '/audit', icon: <AuditOutlined />, label: <Link to="/audit">审计日志</Link> },
    ],
  },
  { key: '/health', icon: <HeartOutlined />, label: <Link to="/health">健康检查</Link> },
];

export function Layout() {
  const collapsed = useAppStore((s) => s.collapsed);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const selectedKey = '/' + location.pathname.split('/').filter(Boolean).slice(0, 2).join('/');

  const onLogout = () => {
    clear();
    navigate('/login');
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} trigger={null} width={240}>
        <div
          style={{
            color: '#fff',
            padding: 16,
            textAlign: 'center',
            fontSize: collapsed ? 14 : 18,
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          {collapsed ? 'CMDB' : 'CMDB 平台 v0.2'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={['/cmdb', '/ops', '/gov', '/meta-model']}
          items={items}
        />
      </Sider>
      <AntLayout>
        <Header style={{ background: colorBgContainer, paddingLeft: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0, lineHeight: '64px' }}>
            CMDB · 配置管理数据库
          </Title>
          <Space>
            {user && (
              <>
                <Tag color="blue">{user.username}</Tag>
                <Tag color={user.role === 'admin' ? 'red' : 'default'}>{user.role}</Tag>
              </>
            )}
            <Button icon={<LogoutOutlined />} onClick={onLogout} size="small">
              登出
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 16, padding: 16, background: colorBgContainer, borderRadius: 8 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
