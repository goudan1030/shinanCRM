import { createBanner, updateBanner, getBannerList } from '@/lib/services/banner-service';
import { BannerCreateData, BannerUpdateData } from '@/types/banner';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

// 缓存控制常量
const PUBLIC_CACHE_MAX_AGE = 60; // 公共缓存最大时间(秒)
const PRIVATE_CACHE_MAX_AGE = 300; // 私有缓存最大时间(秒)

// 获取Banner列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const banners = await getBannerList({ category, status });
    
    return apiSuccess(banners, '获取成功');
  } catch (error) {
    console.error('获取Banner列表失败:', error);
    return handleApiError(error);
  }
}

// 创建或更新Banner
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    const requiredFields = ['category_id', 'title', 'sort_order', 'status'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === '') {
        return apiError(`${field} 不能为空`, 400);
      }
    }

    // 验证 category_id 是否为数字
    if (!Number.isInteger(data.category_id)) {
      return apiError('category_id 必须是整数', 400);
    }

    // 使用传入的图片URL（后续可以改为真实的图片上传）
    const image_url = data.image_url || 'https://placeholder.com/banner.jpg';
    
    // 准备数据对象
    const bannerData: BannerCreateData | BannerUpdateData = {
      category_id: data.category_id,
      title: data.title,
      image_url,
      link_url: data.link_url || null,
      sort_order: data.sort_order,
      status: data.status,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      remark: data.remark || null
    };

    if (data.id) {
      // 更新
      await updateBanner(data.id, bannerData as BannerUpdateData);
      return apiSuccess(null, '更新成功', { 
        cache: { type: 'no-cache' }
      });
    } else {
      // 新增
      const newId = await createBanner(bannerData as BannerCreateData);
      return apiSuccess({ id: newId }, '保存成功', { 
        cache: { type: 'no-cache' }
      });
    }
  } catch (error) {
    console.error('保存Banner失败:', error);
    return handleApiError(error);
  }
} 