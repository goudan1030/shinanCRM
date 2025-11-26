# PM2 日志查看指南

## 基本命令

### 1. 查看实时日志（推荐）
```bash
# 查看所有日志（实时滚动）
pm2 logs sncrm

# 查看最近100行日志
pm2 logs sncrm --lines 100

# 只查看错误日志
pm2 logs sncrm --err

# 只查看标准输出日志
pm2 logs sncrm --out
```

### 2. 查看历史日志文件
```bash
# PM2日志文件位置
# 错误日志: ~/.pm2/logs/sncrm-error.log
# 标准输出: ~/.pm2/logs/sncrm-out.log

# 查看错误日志（最后100行）
tail -n 100 ~/.pm2/logs/sncrm-error.log

# 查看标准输出日志（最后100行）
tail -n 100 ~/.pm2/logs/sncrm-out.log

# 实时查看错误日志
tail -f ~/.pm2/logs/sncrm-error.log

# 实时查看标准输出日志
tail -f ~/.pm2/logs/sncrm-out.log
```

### 3. 搜索特定错误
```bash
# 在错误日志中搜索"PDF"
grep -i "pdf" ~/.pm2/logs/sncrm-error.log

# 在错误日志中搜索"contract"
grep -i "contract" ~/.pm2/logs/sncrm-error.log

# 在错误日志中搜索"puppeteer"
grep -i "puppeteer" ~/.pm2/logs/sncrm-error.log

# 在错误日志中搜索"chrome"
grep -i "chrome" ~/.pm2/logs/sncrm-error.log

# 查看最近的PDF相关错误（最后50行）
grep -i "pdf" ~/.pm2/logs/sncrm-error.log | tail -n 50
```

### 4. 查看应用状态
```bash
# 查看应用状态
pm2 status sncrm

# 查看详细信息
pm2 describe sncrm

# 查看资源使用情况
pm2 monit
```

## PDF生成问题排查

### 1. 查看PDF生成相关日志
```bash
# 实时查看PDF相关日志
pm2 logs sncrm | grep -i "pdf\|contract\|puppeteer\|chrome"

# 查看最近的PDF错误
grep -E "(PDF|pdf|contract|puppeteer|chrome)" ~/.pm2/logs/sncrm-error.log | tail -n 100
```

### 2. 常见错误关键词
- `PDF生成失败`
- `浏览器启动失败`
- `无法找到Chrome`
- `合同不存在`
- `合同尚未签署`
- `PDF生成过程失败`

### 3. 调试模式
在浏览器中访问PDF时添加 `?debug=1` 参数，例如：
```
https://admin.xinghun.info/api/contracts/83/pdf?debug=1
```

这样会在响应中包含更详细的错误信息。

## 日志清理

```bash
# 清空所有日志
pm2 flush

# 清空特定应用的日志
pm2 flush sncrm
```

## 日志轮转

如果日志文件过大，可以设置日志轮转：
```bash
# 安装pm2-logrotate
pm2 install pm2-logrotate

# 配置日志轮转（可选）
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

