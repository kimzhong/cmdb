<template>
  <a-config-provider :locale="zhCN">
    <a-layout class="layout">
      <a-layout-header v-if="isLoggedIn" class="header">
        <div class="logo">CMDB 配置管理中心</div>
        <a-menu
          v-model:selectedKeys="selectedKeys"
          theme="dark"
          mode="horizontal"
          :items="menuItems"
          @click="handleMenuClick"
        />
        <div class="user-info">
          <a-dropdown>
            <a class="ant-dropdown-link" @click.prevent>
              {{ username }}
              <DownOutlined />
            </a>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile">
                  <UserOutlined /> 个人中心
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout">
                  <LogoutOutlined /> 退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-config-provider>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { DownOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'

export default defineComponent({
  name: 'App',
  components: {
    DownOutlined,
    UserOutlined,
    LogoutOutlined
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const store = useStore()

    const selectedKeys = ref(['dashboard'])

    const isLoggedIn = computed(() => store.getters.isLoggedIn)
    const username = computed(() => store.getters.username)

    const menuItems = [
      { key: 'dashboard', label: '首页' },
      { key: 'app', label: '应用管理' },
      { key: 'task', label: '定时任务' },
      { key: 'resource', label: '资源仓库' },
      { key: 'model', label: '模型管理' },
      { key: 'tag', label: '标签管理' },
      { key: 'search', label: '全局搜索' },
    ]

    const handleMenuClick = ({ key }) => {
      selectedKeys.value = [key]
      router.push(`/${key}`)
    }

    const handleLogout = () => {
      store.dispatch('logout')
      router.push('/login')
    }

    return {
      selectedKeys,
      isLoggedIn,
      username,
      menuItems,
      handleMenuClick,
      handleLogout,
      zhCN
    }
  }
})
</script>

<style>
#app {
  height: 100vh;
}
.layout {
  min-height: 100vh;
}
.header {
  display: flex;
  align-items: center;
  padding: 0 20px;
}
.logo {
  color: white;
  font-size: 18px;
  font-weight: bold;
  margin-right: 40px;
}
.user-info {
  margin-left: auto;
  color: white;
}
.content {
  padding: 20px;
  background: #fff;
}
</style>
