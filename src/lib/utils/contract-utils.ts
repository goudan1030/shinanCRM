/**
 * 合同工具函数
 */

import { COMPANY_INFO } from '@/lib/constants/contract';

/**
 * 生成合同编号
 */
export function generateContractNumber(): string {
  const now = Date.now();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `CT${now}${random}`;
}

/**
 * 数字转人民币大写汉字
 */
export function numberToChinese(num: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿'];
  
  if (num === 0) return '零';
  if (num < 0) return '负' + numberToChinese(-num);
  
  let result = '';
  let unitIndex = 0;
  
  while (num > 0) {
    const digit = num % 10;
    if (digit !== 0) {
      result = digits[digit] + units[unitIndex] + result;
    } else if (result && !result.startsWith('零')) {
      result = '零' + result;
    }
    num = Math.floor(num / 10);
    unitIndex++;
  }
  
  return result;
}

/**
 * 计算合同金额的中文大写
 */
export function formatContractAmountChinese(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '零元';
  return numberToChinese(numAmount) + '元';
}

/**
 * 更新印章样式为叠加效果
 */
export function updateSealOverlayStyle(content: string): string {
  // 更新CSS样式
  const oldSealStyle = `.seal-container { text-align: center; flex: 1; }
        .company-seal { width: 120px; height: 120px; margin: 10px auto; display: block; }`;
  
  const newSealStyle = `.seal-container { 
            text-align: left; 
            flex: 1; 
            position: relative;
            line-height: 1.8;
        }
        .company-seal { 
            position: absolute;
            width: 100px; 
            height: 100px; 
            top: -10px;
            right: 20px;
            z-index: 2;
            opacity: 0.9;
        }`;

  // 替换CSS样式
  content = content.replace(oldSealStyle, newSealStyle);

  // 更新HTML结构，在甲方信息中添加公司名称
  const oldSealHTML = `<div class="seal-container">
            <p><strong>甲方（盖章）：</strong></p>
            <img src="/zhang.png" alt="公司印章" class="company-seal">
            <p>日期：`;
  
  const newSealHTML = `<div class="seal-container">
            <p><strong>甲方（盖章）：</strong></p>
            <p>${COMPANY_INFO.name}</p>
            <img src="/zhang.png" alt="公司印章" class="company-seal">
            <p>日期：`;

  content = content.replace(oldSealHTML, newSealHTML);

  return content;
}

/**
 * 渲染合同模板 - 替换所有变量占位符
 */
export function renderContractTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  let content = template;
  
  // 替换所有变量 - 使用更强健的替换方法
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const valueStr = String(value || '');
    
    // 检查是否存在该占位符
    if (content.includes(placeholder)) {
      content = content.split(placeholder).join(valueStr);
    }
  });
  
  // 检查是否还有未替换的变量
  const remainingVariables = content.match(/{{[^}]+}}/g);
  if (remainingVariables && remainingVariables.length > 0) {
    console.warn('⚠️ 未替换的变量:', remainingVariables);
  }
  
  return content;
}

/**
 * 计算合同到期时间
 */
export function calculateContractExpiry(
  serviceEndDate: string | null | undefined,
  defaultDays: number = 7
): Date | null {
  // 检查是否设置为长期有效
  if (serviceEndDate === '长期有效' || !serviceEndDate) {
    return null; // null表示永不过期
  }
  
  // 如果有具体的到期日期，使用该日期
  if (serviceEndDate && serviceEndDate !== '长期有效') {
    return new Date(serviceEndDate);
  }
  
  // 默认N天后到期
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + defaultDays);
  return expiryDate;
}

/**
 * 生成补充信息HTML片段
 */
export function generateSupplementaryInfoSection(supplementaryInfo?: string): string {
  if (!supplementaryInfo || supplementaryInfo.trim() === '') {
    return `<div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; text-align: center;">
           <p style="margin: 0; color: #666; font-style: italic;">
             <span style="border-bottom: 1px solid #ccc; padding-bottom: 2px;">暂无补充内容</span>
           </p>
         </div>`;
  }
  
  return `<div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
           <p style="margin: 0; font-weight: bold; text-decoration: underline; font-family: 'Microsoft YaHei', Arial, sans-serif;">
             ${supplementaryInfo}
           </p>
         </div>`;
}

