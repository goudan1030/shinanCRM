import { google } from 'googleapis';

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getEnv(name: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  return process.env[name];
}

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const clientEmail = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = getEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Sheets 未配置: 缺少 GOOGLE_SERVICE_ACCOUNT_EMAIL 或 GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  }

  // 处理 .env 中使用 \n 存储的多行私钥
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: formattedKey,
    scopes: SHEETS_SCOPES,
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export interface MemberSheetData {
  id: number | string;
  member_no: string;
  nickname?: string | null;
  phone?: string | null;
  wechat?: string | null;
  gender?: string | null;
  city?: string | null;
  type?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function getSheetConfig() {
  const spreadsheetId = getEnv('GOOGLE_SHEETS_ID');
  const sheetName = getEnv('GOOGLE_SHEETS_MEMBER_SHEET_NAME') || 'Members';

  if (!spreadsheetId) {
    throw new Error('Google Sheets 未配置: 缺少 GOOGLE_SHEETS_ID');
  }

  return { spreadsheetId, sheetName };
}

/**
 * 将会员数据同步到 Google 表格
 * 策略：按会员 id 查找所在行，找到则覆盖整行；找不到则在末尾追加。
 */
export async function syncMemberToGoogleSheet(member: MemberSheetData) {
  try {
    const sheets = getSheetsClient();
    const { spreadsheetId, sheetName } = getSheetConfig();

    // 1. 先读取第一列（假设第一列是 member_id）
    const idColumnRange = `${sheetName}!A:A`;
    const idResult = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: idColumnRange,
    });

    let rows = idResult.data.values || [];

    // 如果表格是空的，先自动写入表头
    if (rows.length === 0) {
      const headerValues = [
        [
          'id',
          'member_no',
          'nickname',
          'phone',
          'wechat',
          'gender',
          'city',
          'type',
          'status',
          'created_at',
          'updated_at',
        ],
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:K1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: headerValues,
        },
      });

      rows = headerValues;
    }
    let targetRowIndex: number | null = null;
    const memberIdStr = String(member.id);

    // 跳过表头，从第二行开始查找
    for (let i = 1; i < rows.length; i++) {
      const cellValue = rows[i]?.[0];
      if (cellValue && String(cellValue) === memberIdStr) {
        targetRowIndex = i + 1; // Google 表格行号从 1 开始
        break;
      }
    }

    // 要写入的一行数据（注意顺序要与表头保持一致）
    const rowValues = [
      memberIdStr,
      member.member_no || '',
      member.nickname || '',
      member.phone || '',
      member.wechat || '',
      member.gender || '',
      member.city || '',
      member.type || '',
      member.status || '',
      member.created_at || '',
      member.updated_at || '',
    ];

    if (targetRowIndex) {
      // 2. 找到了行，执行覆盖更新
      const range = `${sheetName}!A${targetRowIndex}:K${targetRowIndex}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowValues],
        },
      });
    } else {
      // 3. 找不到则在末尾追加
      const range = `${sheetName}!A:K`;
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues],
        },
      });
    }
  } catch (error) {
    // 不要影响主业务，只记录错误
    console.error('同步会员到 Google 表格失败:', error);
  }
}


