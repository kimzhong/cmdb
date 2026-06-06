import { createRouter, createWebHistory } from 'vue-router'
import store from '../store'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/resource',
    name: 'Resource',
    component: () => import('../views/Resource.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/model',
    name: 'Model',
    component: () => import('../views/Model.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tag',
    name: 'Tag',
    component: () => import('../views/Tag.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/app',
    name: 'App',
    component: () => import('../views/App.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/task',
    name: 'Task',
    component: () => import('../views/Task.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !store.getters.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && store.getters.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
