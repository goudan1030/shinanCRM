// 合同管理相关类型定义

export interface ContractTemplate {
  id: number;
  name: string;
  type: 'MEMBERSHIP' | 'ONE_TIME' | 'ANNUAL';
  template_content: string;
  variables_schema: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: number;
  contract_number: string;
  member_id: number;
  contract_type: 'MEMBERSHIP' | 'ONE_TIME' | 'ANNUAL';
  template_id: number;
  status: 'DRAFT' | 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED';
  content: string;
  variables: Record<string, any>;
  created_at: string;
  updated_at: string;
  signed_at: string | null;
  expires_at: string | null;
  pdf_url: string | null;
  signature_data: Record<string, any> | null;
  signature_hash: string | null;
  // 关联数据
  member?: {
    id: number;
    member_no: string;
    name: string;
    phone: string;
    id_card: string;
  };
  template?: ContractTemplate;
}

export interface ContractSignature {
  id: number;
  contract_id: number;
  signer_type: 'CUSTOMER' | 'COMPANY';
  signature_data: string;
  signature_hash: string;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  signer_real_name: string | null;
  signer_id_card: string | null;
  signer_phone: string | null;
}

export interface GenerateContractRequest {
  memberId: number;
  contractType: 'MEMBERSHIP' | 'ONE_TIME' | 'ANNUAL';
  templateId?: number;
  variables?: Record<string, any>;
}

export interface GenerateContractResponse {
  contractId: number;
  contractNumber: string;
  signUrl: string;
  expiresAt: string;
}

export interface SignContractRequest {
  signatureData: string;
  signerType: 'CUSTOMER' | 'COMPANY';
  signerInfo?: {
    realName: string;
    idCard: string;
    phone: string;
  };
}

export interface SignContractResponse {
  success: boolean;
  pdfUrl?: string;
  message: string;
}

export interface ContractListParams {
  page?: number;
  limit?: number;
  status?: string;
  contractType?: string;
  memberId?: number;
  search?: string;
}

export interface ContractListResponse {
  contracts: Contract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 合同状态映射
export const CONTRACT_STATUS_MAP = {
  DRAFT: '草稿',
  PENDING: '待签署',
  SIGNED: '已签署',
  EXPIRED: '已过期',
  CANCELLED: '已取消'
} as const;

// 合同类型映射
export const CONTRACT_TYPE_MAP = {
  MEMBERSHIP: '会员服务',
  ONE_TIME: '一次性服务',
  ANNUAL: '年费服务'
} as const;

// 签署方类型映射
export const SIGNER_TYPE_MAP = {
  CUSTOMER: '客户',
  COMPANY: '公司'
} as const;
