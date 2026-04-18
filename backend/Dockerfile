FROM node:20-alpine

WORKDIR /app

# sqlite3 native module build deps (removed after install to slim image)
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && apk add --no-cache sqlite

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装生产依赖（sqlite3 会基于已安装的构建工具链编译原生模块）
RUN npm ci --omit=dev \
    && apk del .build-deps

# 复制源代码
COPY . .

# 复制OCR训练数据文件（离线识别支持）
COPY chi_sim.traineddata eng.traineddata ./

# 创建上传、日志、数据目录（数据目录承载 SQLite 数据文件，应通过 volume 挂载持久化）
RUN mkdir -p uploads logs ../data

VOLUME ["/app/../data", "/app/uploads", "/app/logs"]

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV SQLITE_PATH=/app/../data/warehouse.db

# 启动命令
CMD ["node", "server.js"]
