#!/bin/bash

# 启动仓库管理系统图形化管理工具
# 使用 Python Tkinter，轻量兼容

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: Python 3 未安装，请先安装 Python 3"
    exit 1
fi

# 检查 tkinter 是否可用
python3 -c "import tkinter" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ 错误: tkinter 未找到，请安装:"
    echo "   Ubuntu/Debian: sudo apt install python3-tk"
    echo "   CentOS/RHEL: sudo yum install python3-tkinter"
    exit 1
fi

echo "🖥️  启动仓库管理系统图形化启动器..."
python3 gui-start.py
