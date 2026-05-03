#!/bin/bash
# UnifiedPM — 一键安装 & 启动脚本
set -e

echo "================================"
echo "  UnifiedPM 安装脚本"
echo "  macOS 统一包管理器 GUI"
echo "================================"
echo ""

cd "$(dirname "$0")"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"
echo ""

# 安装依赖
echo "📦 安装依赖中..."
npm install

echo ""
echo "================================"
echo "  安装完成！"
echo "================================"
echo ""
echo "启动方式："
echo "  npm run dev"
echo ""
echo "或直接双击运行 start.sh"
echo ""
