import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, Space, Tag } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

const { Title, Text } = Typography;

export function LoginPage() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm<{ username: string; password: string }>();

  const onSubmit = async () => {
    const v = await form.validateFields();
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await (await import('@/api/auth')).authApi.login(v.username, v.password);
      setSession(token, user);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (e) {
      setError((e as { message?: string }).message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1677ff 0%, #722ed1 100%)',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>CMDB 平台</Title>
            <Text type="secondary">配置管理数据库</Text>
          </div>
          {error && <Alert type="error" showIcon message={error} />}
          <Form form={form} layout="vertical" initialValues={{ username: 'admin', password: 'admin' }} onFinish={onSubmit}>
            <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} placeholder="admin" autoComplete="username" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="••••" autoComplete="current-password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                登录
              </Button>
            </Form.Item>
          </Form>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#999' }}>
            <Tag color="orange">默认 admin / admin</Tag>
            <Text type="secondary">登录后请尽快修改密码</Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
