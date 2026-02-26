// 服务套餐相关类型定义

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  type: 'MEMBERSHIP' | 'TIMES_CARD' | 'BANNER_AD' | 'MATCHMAKER';
  letter: string;
  services?: string[];
  fixedDuration?: number; // 固定期限（月数）
}

// 服务套餐定义
export const SERVICE_PACKAGES: ServicePackage[] = [
  {
    id: 'A',
    name: 'A套餐：会员套餐',
    description: '本套餐包含以下11项服务，服务有效期自本合同生效之日起12个月：',
    duration: '12个月',
    price: 1299, // 固定价格
    type: 'MEMBERSHIP',
    letter: 'A',
    fixedDuration: 12, // 固定12个月
    services: [
      '会员匹配服务：甲方可主动联系乙方平台会员库中的异性会员。原价200元/次。',
      '个人信息地区汇总：甲方个人信息将默认加入乙方平台的地区汇总列表。原价150元。',
      '专属会员群：邀请甲方加入仅发布异性信息的专属会员群。原价100元。',
      '个人信息公众号定期发布：乙方在其微信公众号上定期发布甲方信息。原价50元/次。',
      '个人信息朋友圈定期推送：乙方在其官方朋友圈定期推送甲方信息。原价50元/次。',
      '个人信息微博定期推送：乙方在其官方微博定期推送甲方信息。原价50元/次。',
      '个人信息头条定期推送：乙方在其今日头条账号定期推送甲方信息。原价50元/次。',
      '个人信息贴吧定期推送：乙方在相关贴吧定期推送甲方信息。原价50元/次。',
      '个人信息微信视频号推送：乙方在其微信视频号定期推送甲方信息。原价50元/次。',
      '微信小程序省份置顶（开发中）：小程序上线后，甲方信息将在指定省份定期置顶展示。原价200元。',
      '网站省份置顶（开发中）：网站上线后，甲方信息将在指定省份定期置顶展示。原价200元。'
    ]
  },
  {
    id: 'B',
    name: 'B套餐：次卡套餐',
    description: '本套餐包含3次会员匹配服务。甲方可联系平台异性会员，若对方同意，则互推微信并扣除1次次数；若对方不同意，则不扣除次数。重要提示：次卡套餐不包含任何形式的个人信息曝光推送服务（如公众号、朋友圈等）。原价200元/次。',
    duration: '3次机会',
    price: 489, // 固定价格
    type: 'TIMES_CARD',
    letter: 'B'
  },
  {
    id: 'C',
    name: 'C套餐：增值服务1：Banner广告位',
    description: '甲方个人信息将在乙方微信公众号每日推送、小程序、网站等平台的banner广告位展示。',
    duration: '1个月',
    price: 300, // 固定价格
    type: 'BANNER_AD',
    letter: 'C'
  },
  {
    id: 'D',
    name: 'D套餐：增值服务2：一对一红娘匹配服务',
    description: '乙方根据甲方具体形婚需求，全网查找合适的异性信息，并服务至双方约定的成功标准为止。具体标准需另行签订补充协议约定。',
    duration: '按次计费',
    price: 16888, // 固定价格
    type: 'MATCHMAKER',
    letter: 'D'
  }
];

// 服务套餐类型映射
export const SERVICE_PACKAGE_TYPE_MAP = {
  MEMBERSHIP: '会员套餐',
  TIMES_CARD: '次卡套餐',
  BANNER_AD: 'Banner广告位',
  MATCHMAKER: '一对一红娘'
} as const;

// 根据ID获取套餐
export function getServicePackageById(id: string): ServicePackage | undefined {
  return SERVICE_PACKAGES.find(pkg => pkg.id === id);
}

// 根据类型获取套餐
export function getServicePackagesByType(type: string): ServicePackage[] {
  return SERVICE_PACKAGES.filter(pkg => pkg.type === type);
}

// 计算总价格
export function calculateTotalPrice(selectedPackages: ServicePackage[], discountAmount: number = 0): number {
  const totalPrice = selectedPackages.reduce((sum, pkg) => sum + pkg.price, 0);
  return Math.max(0, totalPrice - discountAmount);
}
