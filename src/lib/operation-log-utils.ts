// 操作类型的中文映射
export const operationTypeMap: Record<string, string> = {
  CREATE: '创建',
  UPDATE: '更新',
  DELETE: '删除',
  ACTIVATE: '激活',
  REVOKE: '撤销',
  UPGRADE: '升级'
};

// 字段名称的中文映射
export const fieldNameMap: Record<string, string> = {
  type: '会员类型',
  status: '状态',
  province: '省份',
  city: '城市',
  district: '区县',
  gender: '性别',
  target_area: '目标区域',
  birth_year: '出生年份',
  height: '身高',
  weight: '体重',
  education: '学历',
  occupation: '职业',
  house_car: '房车情况',
  hukou_province: '户籍省份',
  hukou_city: '户籍城市',
  children_plan: '生育计划',
  marriage_cert: '结婚证',
  self_description: '个人说明',
  partner_requirement: '择偶要求',
  wechat: '微信',
  phone: '电话'
};

// 字段值的中文映射
export const fieldValueMap: Record<string, Record<string, string>> = {
  gender: {
    male: '男',
    female: '女'
  },
  status: {
    ACTIVE: '已激活',
    REVOKED: '已撤销',
    SUCCESS: '已成功'
  },
  type: {
    NORMAL: '普通会员',
    ANNUAL: '年费会员'
  }
};

// 格式化字段值
export const formatFieldValue = (fieldName: string, value: any): string => {
  if (value === null || value === undefined) return '';
  
  // 检查是否有预定义的映射值
  if (fieldValueMap[fieldName]?.[value]) {
    return fieldValueMap[fieldName][value];
  }

  // 处理布尔值
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }

  // 处理数字和其他类型
  return String(value);
};

// 格式化操作记录的值对象
export const formatValuesObject = (values: Record<string, any>): Record<string, any> => {
  if (!values) return {};

  const formattedValues: Record<string, any> = {};
  for (const [key, value] of Object.entries(values)) {
    const chineseKey = fieldNameMap[key] || key;
    formattedValues[chineseKey] = formatFieldValue(key, value);
  }

  return formattedValues;
};