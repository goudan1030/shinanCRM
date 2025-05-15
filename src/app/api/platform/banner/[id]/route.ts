import { deleteBanner, getBannerById } from '@/lib/services/banner-service';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';

// 获取单个Banner
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return apiError('无效的ID参数', 400);
    }

    const banner = await getBannerById(id);

    if (!banner) {
      return apiError('未找到Banner', 404);
    }

    return apiSuccess(banner, '获取成功');
  } catch (error) {
    console.error('获取Banner失败:', error);
    return handleApiError(error);
  }
}

// 删除Banner
export async function DELETE(
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

    // 删除Banner
    await deleteBanner(id);

    return apiSuccess(null, '删除成功', {
      cache: { type: 'no-cache' }
    });
  } catch (error) {
    console.error('删除Banner失败:', error);
    return handleApiError(error);
  }
} 