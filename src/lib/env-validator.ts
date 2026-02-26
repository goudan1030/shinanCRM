/**
 * 环境变量验证工具
 * 在应用启动时验证必要的环境变量是否已配置
 */

import { createLogger } from './logger';

const logger = createLogger('env-validator');

/**
 * 必需的环境变量配置
 */
interface RequiredEnvVars {
  [key: string]: {
    required: boolean;
    description: string;
    defaultValue?: string;
  };
}

/**
 * 默认必需的环境变量
 */
const DEFAULT_REQUIRED_ENV: RequiredEnvVars = {
  DB_HOST: {
    required: true,
    description: '数据库主机地址'
  },
  DB_PORT: {
    required: false,
    description: '数据库端口',
    defaultValue: '3306'
  },
  DB_USER: {
    required: true,
    description: '数据库用户名'
  },
  DB_PASSWORD: {
    required: true,
    description: '数据库密码'
  },
  DB_NAME: {
    required: true,
    description: '数据库名称'
  },
  JWT_SECRET: {
    required: true,
    description: 'JWT密钥'
  }
};

/**
 * 验证环境变量
 */
export function validateEnvVars(customRequired?: RequiredEnvVars): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const required = customRequired || DEFAULT_REQUIRED_ENV;
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const [key, config] of Object.entries(required)) {
    const value = process.env[key];

    if (config.required && !value) {
      missing.push(key);
      logger.error(`缺少必需的环境变量: ${key} - ${config.description}`);
    } else if (!value && config.defaultValue) {
      process.env[key] = config.defaultValue;
      warnings.push(`${key} 使用默认值: ${config.defaultValue}`);
      logger.warn(`环境变量 ${key} 使用默认值`, { defaultValue: config.defaultValue });
    } else if (value) {
      logger.debug(`环境变量 ${key} 已配置`);
    }
  }

  if (missing.length > 0) {
    logger.fatal('环境变量验证失败', {
      missing,
      total: missing.length
    });
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * 在应用启动时验证环境变量（仅在服务器端）
 */
export function validateEnvOnStartup(): void {
  if (typeof window !== 'undefined') {
    // 客户端不执行验证
    return;
  }

  const result = validateEnvVars();

  if (!result.valid) {
    const errorMessage = `缺少必需的环境变量: ${result.missing.join(', ')}`;
    logger.fatal('应用启动失败: 环境变量配置不完整', {
      missing: result.missing
    });
    
    // 在开发环境抛出错误，生产环境记录日志
    if (process.env.NODE_ENV === 'development') {
      throw new Error(errorMessage);
    }
  }

  if (result.warnings.length > 0) {
    logger.warn('环境变量警告', { warnings: result.warnings });
  }

  if (result.valid) {
    logger.info('环境变量验证通过');
  }
}

