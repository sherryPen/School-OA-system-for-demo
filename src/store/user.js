import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { users, roles } from '@/mock/data'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref(JSON.parse(localStorage.getItem('oa_user') || 'null'))
  const isLoggedIn = computed(() => !!currentUser.value)

  function login(username, password) {
    const user = users.find(u => u.username === username)
    if (!user) return { success: false, message: '用户名不存在' }
    if (password !== '123456') return { success: false, message: '密码错误' }
    if (user.status === '禁用') return { success: false, message: '该账号已被禁用' }
    currentUser.value = user
    localStorage.setItem('oa_user', JSON.stringify(user))
    return { success: true, user }
  }

  function logout() {
    currentUser.value = null
    localStorage.removeItem('oa_user')
  }

  function hasRole(roleNames) {
    if (!currentUser.value) return false
    if (!roleNames || roleNames.length === 0) return true
    return roleNames.includes(currentUser.value.roleName)
  }

  return { currentUser, isLoggedIn, login, logout, hasRole }
})
