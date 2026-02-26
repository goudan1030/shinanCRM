/**
 * 合同相关常量
 */

// 合同状态
export const CONTRACT_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  SIGNED: 'SIGNED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
} as const;

export type ContractStatus = typeof CONTRACT_STATUS[keyof typeof CONTRACT_STATUS];

// 合同类型
export const CONTRACT_TYPE = {
  MEMBERSHIP: 'MEMBERSHIP'
} as const;

export type ContractType = typeof CONTRACT_TYPE[keyof typeof CONTRACT_TYPE];

// 公司信息
export const COMPANY_INFO = {
  name: '杭州石楠文化科技有限公司',
  taxId: '91330105MA2KCLP6X2',
  address: '浙江省杭州市西湖区文三路259号',
  phone: '0571-88888888'
} as const;

// 合同默认配置
export const CONTRACT_DEFAULTS = {
  EXPIRY_DAYS: 7, // 默认7天后到期
  TOKEN_EXPIRY_HOURS: 24 // 签署令牌24小时有效期
} as const;

// 合同模板ID
export const CONTRACT_TEMPLATE_ID = 1;

// 合同模板名称
export const CONTRACT_TEMPLATE_NAME = '石楠文化介绍服务合同';

