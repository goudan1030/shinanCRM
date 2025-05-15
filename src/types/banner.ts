export interface Banner {
  id: number;
  category_id: number;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  status: 0 | 1;
  start_time: string | null;
  end_time: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface BannerCreateData {
  category_id: number;
  title: string;
  image_url: string;
  link_url?: string | null;
  sort_order: number;
  status: 0 | 1;
  start_time?: string | null;
  end_time?: string | null;
  remark?: string | null;
}

export interface BannerUpdateData extends BannerCreateData {
  // 与创建数据相同，但所有字段都可能更新
}

export type BannerStatusUpdate = {
  status: 0 | 1;
}

export interface BannerFilter {
  category?: string | null;
  status?: string | null;
} 