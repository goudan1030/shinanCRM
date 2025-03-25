#!/bin/bash

# 数据库SSH隧道配置
REMOTE_SERVER="47.101.188.32"  # 阿里云服务器IP地址
SSH_USER="root"                # SSH登录用户名
SSH_PORT=22                    # SSH端口，默认是22
REMOTE_DB_HOST="127.0.0.1"     # 远程数据库IP地址（如果数据库在同一服务器上，使用127.0.0.1）
REMOTE_DB_PORT=3306            # 远程数据库端口
LOCAL_PORT=3307                # 本地端口映射，使用3307避免与本地MySQL冲突

# 检查是否已有隧道在运行
TUNNEL_PID=$(ps aux | grep "ssh -L ${LOCAL_PORT}:${REMOTE_DB_HOST}:${REMOTE_DB_PORT}" | grep -v grep | awk '{print $2}')

if [ -n "$TUNNEL_PID" ]; then
  echo "数据库隧道已经在运行 (PID: $TUNNEL_PID)"
  echo "如需重启隧道，请先运行: kill $TUNNEL_PID"
else
  echo "正在建立到阿里云数据库的SSH隧道..."
  # 添加选项保持连接活跃，禁用密码提示，启用SSH压缩
  ssh -L ${LOCAL_PORT}:${REMOTE_DB_HOST}:${REMOTE_DB_PORT} ${SSH_USER}@${REMOTE_SERVER} -p ${SSH_PORT} -N -o "ServerAliveInterval=60" -o "ServerAliveCountMax=3" -o "BatchMode=yes" -o "StrictHostKeyChecking=no" -C &
  TUNNEL_PID=$!
  # 等待隧道稳定
  sleep 2
  
  # 验证隧道是否成功
  nc -z 127.0.0.1 ${LOCAL_PORT} &>/dev/null
  if [ $? -eq 0 ]; then
    echo "隧道已成功建立 (PID: $TUNNEL_PID)"
    echo "现在可以通过 127.0.0.1:${LOCAL_PORT} 访问阿里云数据库"
    echo "要关闭隧道，请运行: kill $TUNNEL_PID"
  else
    echo "隧道建立失败，无法连接到 127.0.0.1:${LOCAL_PORT}"
    echo "请检查SSH连接信息并重试"
    kill $TUNNEL_PID &>/dev/null
    exit 1
  fi
fi

# 添加提示
echo ""
echo "注意:"
echo "1. 连接成功后，您的应用将能够通过127.0.0.1:3307访问远程数据库"
echo "2. 请保持此终端窗口开启以维持隧道连接"
echo "3. 如需停止隧道，按Ctrl+C或运行: kill $TUNNEL_PID"

# 保持脚本运行
echo ""
echo "保持此终端窗口开启..."
echo "按Ctrl+C停止隧道"
tail -f /dev/null 