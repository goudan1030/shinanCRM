#!/bin/bash
# MySQL服务器防火墙配置脚本
# 在MySQL服务器上运行此脚本

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   MySQL服务器防火墙配置工具   ${NC}"
echo -e "${BLUE}=========================================${NC}"

# 检查root权限
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用root权限运行此脚本 (sudo ./server-fix-firewall.sh)${NC}"
  exit 1
fi

# 检测系统类型
if [ -f /etc/redhat-release ]; then
  SYS_TYPE="RHEL"
elif [ -f /etc/debian_version ]; then
  SYS_TYPE="DEBIAN"
else
  SYS_TYPE="UNKNOWN"
fi

echo -e "${YELLOW}检测到系统类型: ${SYS_TYPE}${NC}"

# 检查MySQL是否在运行
echo -e "\n${YELLOW}检查MySQL服务状态...${NC}"
if systemctl is-active --quiet mysql || systemctl is-active --quiet mysqld; then
  echo -e "${GREEN}✓ MySQL服务正在运行${NC}"
else
  echo -e "${RED}✗ MySQL服务未运行${NC}"
  
  # 尝试启动MySQL
  echo -e "${YELLOW}尝试启动MySQL服务...${NC}"
  if [ "$SYS_TYPE" = "RHEL" ]; then
    systemctl start mysqld
  else
    systemctl start mysql
  fi
  
  # 再次检查
  if systemctl is-active --quiet mysql || systemctl is-active --quiet mysqld; then
    echo -e "${GREEN}✓ MySQL服务已成功启动${NC}"
  else
    echo -e "${RED}✗ 无法启动MySQL服务，请手动检查${NC}"
    exit 1
  fi
fi

# 检查MySQL配置
echo -e "\n${YELLOW}检查MySQL配置...${NC}"

# 根据系统类型获取MySQL配置文件路径
if [ "$SYS_TYPE" = "RHEL" ]; then
  MYSQL_CONF="/etc/my.cnf"
else
  MYSQL_CONF="/etc/mysql/mysql.conf.d/mysqld.cnf"
fi

echo -e "MySQL配置文件路径: ${MYSQL_CONF}"

# 检查bind-address设置
if grep -q "^bind-address" ${MYSQL_CONF}; then
  echo -e "${YELLOW}发现bind-address设置，检查是否允许远程连接...${NC}"
  BIND_ADDRESS=$(grep "^bind-address" ${MYSQL_CONF} | awk '{print $3}')
  
  if [ "$BIND_ADDRESS" = "127.0.0.1" ]; then
    echo -e "${RED}MySQL只监听本地连接(${BIND_ADDRESS})，需要修改${NC}"
    
    # 询问是否修改
    echo -e "${YELLOW}是否将bind-address修改为0.0.0.0以允许远程连接? (y/n)${NC}"
    read -r MODIFY_BIND
    
    if [ "$MODIFY_BIND" = "y" ]; then
      # 备份配置文件
      cp ${MYSQL_CONF} ${MYSQL_CONF}.bak
      echo -e "${GREEN}✓ 已备份配置文件到 ${MYSQL_CONF}.bak${NC}"
      
      # 修改bind-address
      sed -i 's/^bind-address.*$/bind-address = 0.0.0.0/' ${MYSQL_CONF}
      echo -e "${GREEN}✓ 已修改bind-address为0.0.0.0${NC}"
      
      # 重启MySQL
      echo -e "${YELLOW}重启MySQL服务以应用更改...${NC}"
      if [ "$SYS_TYPE" = "RHEL" ]; then
        systemctl restart mysqld
      else
        systemctl restart mysql
      fi
      
      # 检查重启是否成功
      if systemctl is-active --quiet mysql || systemctl is-active --quiet mysqld; then
        echo -e "${GREEN}✓ MySQL服务已成功重启${NC}"
      else
        echo -e "${RED}✗ MySQL服务重启失败，请手动检查${NC}"
        exit 1
      fi
    else
      echo -e "${YELLOW}用户选择不修改bind-address设置${NC}"
    fi
  elif [ "$BIND_ADDRESS" = "0.0.0.0" ]; then
    echo -e "${GREEN}✓ MySQL已配置监听所有网络接口(${BIND_ADDRESS})${NC}"
  else
    echo -e "${YELLOW}MySQL当前监听地址: ${BIND_ADDRESS}${NC}"
  fi
else
  echo -e "${YELLOW}未找到bind-address设置，这通常意味着MySQL默认监听所有接口${NC}"
fi

# 检查防火墙状态
echo -e "\n${YELLOW}检查防火墙状态...${NC}"

# 检测防火墙类型
FIREWALL_TYPE="NONE"

if command -v firewall-cmd &> /dev/null; then
  FIREWALL_TYPE="FIREWALLD"
elif command -v ufw &> /dev/null; then
  FIREWALL_TYPE="UFW"
elif command -v iptables &> /dev/null; then
  FIREWALL_TYPE="IPTABLES"
fi

echo -e "检测到防火墙类型: ${FIREWALL_TYPE}"

case ${FIREWALL_TYPE} in
  FIREWALLD)
    echo -e "${YELLOW}检查FirewallD状态...${NC}"
    if firewall-cmd --state &> /dev/null; then
      echo -e "${GREEN}✓ FirewallD防火墙运行中${NC}"
      
      # 检查MySQL端口是否已开放
      if firewall-cmd --list-ports | grep -q "3306/tcp"; then
        echo -e "${GREEN}✓ MySQL端口(3306)已在防火墙中开放${NC}"
      else
        echo -e "${RED}✗ MySQL端口(3306)未在防火墙中开放${NC}"
        
        # 询问是否开放端口
        echo -e "${YELLOW}是否在防火墙中开放MySQL端口(3306)? (y/n)${NC}"
        read -r OPEN_PORT
        
        if [ "$OPEN_PORT" = "y" ]; then
          firewall-cmd --permanent --add-port=3306/tcp
          firewall-cmd --reload
          echo -e "${GREEN}✓ MySQL端口(3306)已在防火墙中开放${NC}"
        else
          echo -e "${YELLOW}用户选择不开放MySQL端口${NC}"
        fi
      fi
    else
      echo -e "${YELLOW}FirewallD防火墙未运行${NC}"
    fi
    ;;
    
  UFW)
    echo -e "${YELLOW}检查UFW防火墙状态...${NC}"
    if ufw status | grep -q "Status: active"; then
      echo -e "${GREEN}✓ UFW防火墙运行中${NC}"
      
      # 检查MySQL端口是否已开放
      if ufw status | grep -q "3306/tcp.*ALLOW"; then
        echo -e "${GREEN}✓ MySQL端口(3306)已在防火墙中开放${NC}"
      else
        echo -e "${RED}✗ MySQL端口(3306)未在防火墙中开放${NC}"
        
        # 询问是否开放端口
        echo -e "${YELLOW}是否在防火墙中开放MySQL端口(3306)? (y/n)${NC}"
        read -r OPEN_PORT
        
        if [ "$OPEN_PORT" = "y" ]; then
          ufw allow 3306/tcp
          echo -e "${GREEN}✓ MySQL端口(3306)已在防火墙中开放${NC}"
        else
          echo -e "${YELLOW}用户选择不开放MySQL端口${NC}"
        fi
      fi
    else
      echo -e "${YELLOW}UFW防火墙未运行${NC}"
    fi
    ;;
    
  IPTABLES)
    echo -e "${YELLOW}检查IPTables规则...${NC}"
    
    # 检查MySQL端口是否已开放
    if iptables -L INPUT -n | grep -q "tcp dpt:3306"; then
      echo -e "${GREEN}✓ MySQL端口(3306)已在防火墙中开放${NC}"
    else
      echo -e "${RED}✗ MySQL端口(3306)未在防火墙中开放${NC}"
      
      # 询问是否开放端口
      echo -e "${YELLOW}是否在防火墙中开放MySQL端口(3306)? (y/n)${NC}"
      read -r OPEN_PORT
      
      if [ "$OPEN_PORT" = "y" ]; then
        iptables -A INPUT -p tcp --dport 3306 -j ACCEPT
        if [ "$SYS_TYPE" = "RHEL" ]; then
          service iptables save
        else
          iptables-save > /etc/iptables/rules.v4
        fi
        echo -e "${GREEN}✓ MySQL端口(3306)已在防火墙中开放${NC}"
      else
        echo -e "${YELLOW}用户选择不开放MySQL端口${NC}"
      fi
    fi
    ;;
    
  NONE)
    echo -e "${YELLOW}未检测到活动的防火墙${NC}"
    ;;
esac

# 检查SELinux(仅限RHEL系统)
if [ "$SYS_TYPE" = "RHEL" ]; then
  echo -e "\n${YELLOW}检查SELinux状态...${NC}"
  
  if command -v getenforce &> /dev/null; then
    SELINUX_STATUS=$(getenforce)
    echo -e "SELinux状态: ${SELINUX_STATUS}"
    
    if [ "$SELINUX_STATUS" = "Enforcing" ]; then
      echo -e "${YELLOW}SELinux处于强制模式，可能会阻止MySQL远程连接${NC}"
      
      # 检查MySQL端口是否已在SELinux中允许
      if command -v semanage &> /dev/null; then
        if semanage port -l | grep -q "mysqld_port_t.*3306"; then
          echo -e "${GREEN}✓ MySQL端口已在SELinux中配置${NC}"
        else
          echo -e "${RED}✗ MySQL端口未在SELinux中配置${NC}"
          
          # 询问是否配置SELinux
          echo -e "${YELLOW}是否在SELinux中允许MySQL端口? (y/n)${NC}"
          read -r CONFIG_SELINUX
          
          if [ "$CONFIG_SELINUX" = "y" ]; then
            semanage port -a -t mysqld_port_t -p tcp 3306
            echo -e "${GREEN}✓ MySQL端口已在SELinux中配置${NC}"
          else
            echo -e "${YELLOW}用户选择不配置SELinux${NC}"
          fi
        fi
      else
        echo -e "${YELLOW}未找到semanage命令，无法检查SELinux端口配置${NC}"
        echo -e "${YELLOW}请安装policycoreutils-python包获取该命令${NC}"
      fi
      
      # 建议设置SELinux允许网络连接
      echo -e "${YELLOW}建议运行以下命令允许MySQL网络连接:${NC}"
      echo -e "setsebool -P mysqld_connect_any 1"
    else
      echo -e "${GREEN}✓ SELinux不处于强制模式，不会阻止MySQL连接${NC}"
    fi
  else
    echo -e "${YELLOW}未找到getenforce命令，无法检查SELinux状态${NC}"
  fi
fi

# 总结
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}✓ MySQL服务器网络配置检查完成${NC}"
echo -e "${BLUE}=========================================${NC}"

# 检查当前MySQL监听状态
echo -e "\n${YELLOW}当前MySQL监听状态:${NC}"
if command -v ss &> /dev/null; then
  ss -tuln | grep 3306
elif command -v netstat &> /dev/null; then
  netstat -tuln | grep 3306
else
  echo -e "${YELLOW}未找到网络工具(ss/netstat)，无法显示监听状态${NC}"
fi

echo -e "\n${BLUE}如果MySQL仅监听127.0.0.1，远程连接将被拒绝${NC}"
echo -e "${BLUE}请确保MySQL监听0.0.0.0或特定外部IP地址${NC}"

echo -e "\n${YELLOW}远程连接测试命令:${NC}"
echo -e "mysql -h $(hostname -I | awk '{print $1}') -u h5_cloud_user -p -P 3306"

echo -e "\n${BLUE}感谢使用MySQL服务器网络配置工具!${NC}" 