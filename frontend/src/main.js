import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import './assets/main.css';
import App from './App.vue';
import router from './router';

// 导入常用组件
import AssetCard from '@/components/AssetCard.vue';
import StatusTag from '@/components/StatusTag.vue';

const app = createApp(App);

// 先注册 Pinia
app.use(createPinia());

// 注册基础组件
app.use(ElementPlus, {
  locale: zhCn,
});

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 全局注册常用组件
app.component('AssetCard', AssetCard);
app.component('StatusTag', StatusTag);

// 最后注册路由
app.use(router);

app.mount('#app');