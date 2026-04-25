<template>
  <div class="login-container">
    <!-- 校园插画背景 -->
    <div class="campus-bg">
      <img src="@/assets/campus-bg.jpg" alt="中山中学校园" class="bg-image" />
      <div class="bg-overlay"></div>
    </div>

    <!-- 磨玻璃横条区域 -->
    <div class="glass-banner">
      <div class="glass-content">
        <!-- 左侧Slogan -->
        <div class="slogan-area">
          <h1 class="slogan-main">
            <span class="slogan-school">中山中学</span>
            <span class="slogan-divider"></span>
            <span class="slogan-system">智慧办公平台</span>
          </h1>
          <p class="slogan-sub">以数字化赋能教育管理，让校园办公更高效、更智慧</p>
        </div>

        <!-- 右侧登录卡片 -->
        <div class="login-card animate-fadeInUp">
          <div class="login-card-header">
            <div class="card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a6cf7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h3>欢迎登录</h3>
            <p>中山中学OA办公系统</p>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="handleLogin">
            <el-form-item prop="username">
              <el-input v-model="form.username" placeholder="请输入用户名" prefix-icon="User" size="large" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="form.password" type="password" placeholder="请输入密码" prefix-icon="Lock" size="large" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
                登 录
              </el-button>
            </el-form-item>
          </el-form>

          <div class="demo-accounts">
            <div class="demo-title">演示账号（点击自动填入）</div>
            <div class="demo-grid">
              <div class="demo-item" @click="fillAccount('admin', '123456')">
                <span class="demo-icon admin">管</span><span>admin</span>
              </div>
              <div class="demo-item" @click="fillAccount('principal', '123456')">
                <span class="demo-icon leader">领</span><span>principal</span>
              </div>
              <div class="demo-item" @click="fillAccount('admin_jwc', '123456')">
                <span class="demo-icon staff">行</span><span>admin_jwc</span>
              </div>
              <div class="demo-item" @click="fillAccount('teacher_liu', '123456')">
                <span class="demo-icon teacher">师</span><span>teacher_liu</span>
              </div>
              <div class="demo-item" @click="fillAccount('student_001', '123456')">
                <span class="demo-icon student">学</span><span>student_001</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部版权 -->
    <div class="login-footer">
      <span>&copy; 2025 中山中学 版权所有</span>
      <span style="margin:0 12px; opacity:0.3;">|</span>
      <span>Powered by Smart Campus</span>
    </div>

    <!-- 装饰粒子动画 -->
    <div class="particles">
      <div v-for="i in 12" :key="i" class="particle" :style="{ '--delay': (i * 0.4) + 's', '--x': (Math.random() * 100) + '%', '--duration': (8 + Math.random() * 8) + 's' }"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({ username: 'admin', password: '123456' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

function fillAccount(username, password) {
  form.username = username
  form.password = password
}

async function handleLogin() {
  await formRef.value?.validate()
  loading.value = true
  setTimeout(() => {
    const result = userStore.login(form.username, form.password)
    loading.value = false
    if (result.success) {
      ElMessage.success(`欢迎回来，${result.user.name}！`)
      router.push('/dashboard')
    } else {
      ElMessage.error(result.message)
    }
  }, 600)
}
</script>

<style scoped>
/* ========== 容器 ========== */
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #e8eef5;
}

/* ========== 校园背景图 ========== */
.campus-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
}
.bg-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(30,58,95,0.55) 0%, rgba(74,108,247,0.25) 40%, rgba(255,255,255,0.15) 70%),
    linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(240,245,255,0.25) 100%);
  backdrop-filter: blur(1px);
  z-index: 1;
}

/* ========== 磨玻璃横条 ========== */
.glass-banner {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50px 20px;
}
.glass-content {
  display: flex;
  align-items: center;
  gap: 80px;
  padding: 48px 56px;
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow:
    0 8px 44px rgba(30, 58, 95, 0.10),
    0 2px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255,255,255,0.6);
  max-width: 1020px;
  width: 100%;
}

/* ========== Slogan ========== */
.slogan-area {
  flex: 1;
  min-width: 0;
}
.slogan-main {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.slogan-school {
  font-size: 42px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 12px rgba(30,58,95,0.25);
  letter-spacing: 6px;
  animation: slideInLeft 0.7s ease both;
}
.slogan-divider {
  display: inline-block;
  width: 3px;
  height: 36px;
  background: linear-gradient(180deg, #fff, rgba(255,255,255,0.4));
  border-radius: 2px;
  vertical-align: middle;
  margin: 0 4px;
  animation: fadeIn 0.9s ease 0.3s both;
}
.slogan-system {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 3px;
  text-shadow: 0 2px 8px rgba(255,255,255,0.2);
  animation: slideInRight 0.7s ease both;
}
.slogan-sub {
  font-size: 16px;
  color: rgba(255,255,255,0.92);
  line-height: 1.9;
  letter-spacing: 1px;
  text-shadow: 0 1px 4px rgba(30,58,95,0.15);
  animation: fadeIn 1s ease 0.5s both;
}

/* ========== 登录卡片 ========== */
.login-card {
  width: 380px;
  flex-shrink: 0;
  padding: 36px 32px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(20px);
  border-radius: 18px;
  box-shadow:
    0 8px 32px rgba(30, 58, 95, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255,255,255,0.8);
  border: 1px solid rgba(255,255,255,0.65);
}
.login-card-header {
  text-align: center;
  margin-bottom: 28px;
}
.card-icon {
  width:52px; height:52px;
  background: linear-gradient(135deg, #f0f4ff, #e8efff);
  border-radius:14px;
  display:flex; align-items:center; justify-content:center;
  margin: 0 auto 14px;
  animation: bounceIn 0.6s ease 0.2s both;
}
.login-card-header h3 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
  letter-spacing: 1px;
}
.login-card-header p {
  font-size: 13px;
  color: #94a3b8;
}
.login-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  background: linear-gradient(135deg, #4a6cf7, #6366f1) !important;
  border-radius: 12px;
  letter-spacing: 5px;
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}
.login-btn:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 6px 24px rgba(74, 108, 247, 0.4);
}
.login-btn::after {
  content: '';
  position: absolute;
  top: -50%; left: -50%;
  width: 200%; height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s;
}
.login-btn:hover::after {
  opacity: 1;
}

/* ========== 演示账号 ========== */
.demo-accounts {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #f1f5f9;
}
.demo-title {
  font-size: 11px;
  color:#c0c4cc;
  margin-bottom: 12px;
  text-align:center;
  letter-spacing: 1px;
}
.demo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.demo-item {
  display:flex;
  align-items:center;
  gap:6px;
  padding:6px 10px;
  border-radius:8px;
  cursor:pointer;
  transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
  font-size:11px;
  color:#64748b;
  border:1px solid transparent;
}
.demo-item:hover {
  background: #f0f4ff;
  border-color: #d0daf0;
  transform: translateY(-1px);
}
.demo-item span:last-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.demo-icon {
  width:22px; height:22px; border-radius:6px;
  display:inline-flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; color:#fff; flex-shrink:0;
}
.demo-icon.admin { background:linear-gradient(135deg,#ef4444,#dc2626); }
.demo-icon.leader { background:linear-gradient(135deg,#f59e0b,#d97706); }
.demo-icon.staff { background:linear-gradient(135deg,#64748b,#475569); }
.demo-icon.teacher { background:linear-gradient(135deg,#4a6cf7,#6366f1); }
.demo-icon.student { background:linear-gradient(135deg,#11998e,#059669); }

/* ========== 底部版权 ========== */
.login-footer {
  position:relative;
  z-index:2;
  text-align:center;
  padding:18px;
  font-size:12px;
  color:rgba(255,255,255,0.75);
  letter-spacing:0.5px;
}

/* ========== 装饰粒子 ========== */
.particles {
  position:absolute;
  inset:0;
  z-index:1;
  pointer-events:none;
  overflow:hidden;
}
.particle {
  position:absolute;
  bottom:-10px;
  left:var(--x);
  width:4px; height:4px;
  background:rgba(255,255,255,0.5);
  border-radius:50%;
  animation: floatUp var(--duration) var(--delay) infinite ease-in-out;
  filter:blur(1px);
}
@keyframes floatUp {
  0%   { transform: translateY(0) scale(1); opacity: 0; }
  10%  { opacity: 0.8; }
  90%  { opacity: 0.3; }
  100% { transform: translateY(-85vh) scale(0.4); opacity: 0; }
}

/* ========== 动画关键帧 ========== */
.animate-fadeInUp {
  animation: cardFadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-24px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes bounceIn {
  0% { transform: scale(0.6); opacity: 0; }
  50% { transform: scale(1.06); }
  100% { transform: scale(1); opacity: 1; }
}

/* ========== 响应式 ========== */
@media (max-width: 860px) {
  .glass-content {
    flex-direction: column;
    gap: 32px;
    padding: 32px 24px;
    max-width: 420px;
  }
  .login-card { width: 100%; }
  .slogan-school { font-size: 32px; }
  .slogan-system { font-size: 20px; }
  .slogan-sub { font-size: 14px; }
}
</style>
