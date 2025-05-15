import { createClient } from '@supabase/supabase-js';

// 这是一个模拟的Supabase客户端，用于在不依赖实际Supabase服务的情况下避免错误
// 在实际项目中，当需要使用真实的Supabase服务时，应该移除此模拟并配置正确的环境变量

// 确保总是有可用的URL，即使环境变量中没有设置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key-for-development';

// 创建一个实际的Supabase客户端，但不会产生实际效果
export const supabaseClient = createClient(supabaseUrl, supabaseKey);

// 如果需要，可以在这里提供更多模拟方法
// 例如，模拟用户认证、数据存储等功能

export default supabaseClient; 