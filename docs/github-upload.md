# GitHub 上传指南

本文档提供了将资产管理系统上传到 GitHub 的步骤。

## 创建 GitHub 仓库

1. 登录您的 GitHub 账户
2. 点击右上角的 "+" 图标，选择 "New repository"
3. 填写仓库信息：
   - 仓库名称：`asset-management-system`
   - 描述：`A comprehensive asset management system with frontend and backend components`
   - 可见性：根据需要选择公开或私有
   - 初始化选项：不要勾选"添加 README 文件"、".gitignore" 或 "许可证"
4. 点击 "Create repository"

## 上传项目到 GitHub

在本地项目目录中执行以下命令：

```bash
# 初始化 Git 仓库（如果尚未初始化）
git init

# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/asset-management-system.git

# 添加所有文件到暂存区
git add .

# 提交更改
git commit -m "Initial commit"

# 推送到 GitHub
git push -u origin main
```

注意：如果您的默认分支是 `master` 而不是 `main`，请相应地调整最后一个命令。

## 验证上传

1. 刷新 GitHub 仓库页面
2. 确认所有文件和目录都已正确上传
3. 检查 README.md 是否正确显示

## 后续步骤

1. 设置分支保护规则（如果需要）
2. 添加协作者（如果是团队项目）
3. 设置 GitHub Pages（如果需要展示项目）
4. 配置 GitHub Actions 进行持续集成/持续部署（CI/CD）
