import { createStore } from 'vuex'
import api from '../api'

export default createStore({
  state: {
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || '{}'),
    modelGroups: [],
    models: []
  },
  getters: {
    isLoggedIn: state => !!state.token,
    username: state => state.user.username || '',
    role: state => state.user.role || ''
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token
      localStorage.setItem('token', token)
    },
    SET_USER(state, user) {
      state.user = user
      localStorage.setItem('user', JSON.stringify(user))
    },
    SET_MODEL_GROUPS(state, groups) {
      state.modelGroups = groups
    },
    SET_MODELS(state, models) {
      state.models = models
    },
    CLEAR_AUTH(state) {
      state.token = ''
      state.user = {}
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  },
  actions: {
    async login({ commit }, credentials) {
      const response = await api.login(credentials)
      commit('SET_TOKEN', response.data.token)
      commit('SET_USER', response.data.user)
      return response
    },
    async logout({ commit }) {
      commit('CLEAR_AUTH')
    }
  }
})
