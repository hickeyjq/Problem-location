后端（Node + Express + SQLite）说明

快速开始：
1. 进入项目根目录：

```
cd /d e:\bug-dashboard
```

2. 安装依赖：

```
npm install
```

3. 启动服务器：

```
npm start
# 或
node server.js
```

API 端点：
- GET  /api/bugs                列表（支持 ?q=关键词 或 ?category=分类）
- GET  /api/bugs/:id            获取单条
- POST /api/bugs                新增（JSON body: { id?, symptom, category? }）
- PUT  /api/bugs/:id            更新（JSON body: { symptom, category }）
- DELETE /api/bugs/:id          删除（可选）


数据库：使用轻量 JSON 存储 `db.json`（位于项目根）。

CORS：为开发方便已开启 `cors()`，前端可以通过 `fetch('http://localhost:3000/api/bugs')` 调用。

注意：生产环境请添加认证、输入校验与适当的错误处理/日志。