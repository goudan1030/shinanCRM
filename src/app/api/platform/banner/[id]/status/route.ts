import { updateBannerStatus, getBannerById } from '@/lib/services/banner-service';
import { BannerStatusUpdate } from '@/types/banner';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return apiError('无效的ID参数', 400);
    }
    
    // 检查Banner是否存在
    const banner = await getBannerById(id);
    if (!banner) {
      return apiError('未找到Banner', 404);
    }
    
    const data = await request.json() as BannerStatusUpdate;
    
    // 验证状态值
    if (typeof data.status !== 'number' || ![0, 1].includes(data.status)) {
      return apiError('状态值必须是 0 或 1', 400);
    }

    // 更新数据库
    await updateBannerStatus(id, data.status);

    return apiSuccess(null, '状态更新成功', {
      cache: { type: 'no-cache' }
    });
  } catch (error) {
    console.error('更新Banner状态失败:', error);
    return handleApiError(error);
  }
} 