'use client';

import { useEffect, useRef, useState } from 'react';

export const SEND_ALLOWED_ENTRIES = new Set([
  'single_chat_tools',
  'group_chat_tools'
]);

export const CONTACT_ALLOWED_ENTRIES = new Set([
  'contact_profile',
  'single_chat_tools'
]);

type WecomJsSdkConfigResponse = {
  success: boolean;
  corpId: string;
  agentId: string;
  config: {
    timestamp: number;
    nonceStr: string;
    signature: string;
  };
  agentConfig: {
    timestamp: number;
    nonceStr: string;
    signature: string;
  };
  error?: string;
};

export type SendChatMessageParams =
  | { msgtype: 'text'; text: { content: string } }
  | { msgtype: 'news'; news: { link: string; title: string; desc: string; imgUrl: string } }
  | { msgtype: 'miniprogram'; miniprogram: { appid: string; title: string; imagePath: string; page: string } };

export type SidebarRuntime = {
  key: string;
  rawQuery: string;
  wecomUserId: string;
  toUserId: string;
  sendChannel: string;
  sdkStatus: string;
  contextEntry: string;
  contextSource: string;
  contactStatus: string;
  wecomClientReady: boolean;
  /** 综合判断当前是否可发送消息（entry 允许 OR WeixinJSBridge 可用） */
  canSendMessage: boolean;
  setWecomUserId: (value: string) => void;
  setToUserId: (value: string) => void;
  buildApiParams: () => URLSearchParams;
  refreshContext: () => Promise<string>;
  refreshSendChannel: () => string;
  refreshExternalContact: () => Promise<void>;
  sendChatMessage: (params: SendChatMessageParams) => Promise<void>;
  openUserProfile: (userId: string, type?: 1 | 2) => Promise<void>;
};

const pickFirstNonEmpty = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    const trimmed = (value || '').trim();
    if (trimmed) return trimmed;
  }
  return '';
};

const loadWxSdkScript = async () => {
  const existingWx = (window as any)?.wx;
  if (existingWx?.config) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('wecom-jssdk-script') as HTMLScriptElement | null;
    if (existing) {
      if ((window as any)?.wx?.config) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('企业微信JSSDK脚本加载失败')), {
        once: true
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'wecom-jssdk-script';
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.2.0.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('企业微信JSSDK脚本加载失败'));
    document.head.appendChild(script);
  });
};

export function detectWecomSendChannel() {
  const ww = (window as any)?.ww;
  const wxQy = (window as any)?.wx?.qy;
  const bridge = (window as any)?.WeixinJSBridge;

  if (typeof ww?.sendChatMessage === 'function') return 'ww.sendChatMessage';
  if (typeof wxQy?.sendChatMessage === 'function') return 'wx.qy.sendChatMessage';
  if (typeof bridge?.invoke === 'function') return 'WeixinJSBridge.invoke(sendChatMessage)';
  return '';
}

export function isContextUnknown(entry: string) {
  return entry === '未获取' || entry === '不可用' || entry === '获取失败' || entry === 'unknown';
}

export function useWecomSidebarRuntime(): SidebarRuntime {
  const [key, setKey] = useState('');
  const [rawQuery, setRawQuery] = useState('');
  const [wecomUserId, setWecomUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [wecomClientReady, setWecomClientReady] = useState(false);
  const [sendChannel, setSendChannel] = useState('未检测');
  const [sdkStatus, setSdkStatus] = useState('未初始化');
  const [contextEntry, setContextEntry] = useState('未获取');
  const [contextSource, setContextSource] = useState('未检测');
  const [contactStatus, setContactStatus] = useState('未尝试');
  const sdkInitStartedRef = useRef(false);
  const bridgeRetryTimerRef = useRef<number | null>(null);
  const retryTimersRef = useRef<number[]>([]);
  // 已成功拿到 wecom_userid 时置 true，避免重复请求
  const contactFetchedRef = useRef(false);

  const buildApiParams = () => {
    const p = new URLSearchParams();
    if (key) p.set('key', key);
    return p;
  };

  const refreshSendChannel = () => {
    const channel = detectWecomSendChannel();
    setWecomClientReady(Boolean(channel));
    setSendChannel(channel || '未检测');
    return channel;
  };

  const refreshContext = async (): Promise<string> => {
    try {
      const ww = (window as any)?.ww;
      const wx = (window as any)?.wx;
      const bridge = (window as any)?.WeixinJSBridge;

      if (typeof ww?.getContext === 'function') {
        const res = await ww.getContext();
        const entry = res?.entry || 'unknown';
        setContextEntry(entry);
        setContextSource('ww.getContext');
        return entry;
      }

      if (typeof wx?.qy?.getContext === 'function') {
        const entry = await new Promise<string>((resolve, reject) => {
          wx.qy.getContext({
            success: (res: any) => resolve((res?.entry || 'unknown') as string),
            fail: (err: any) => reject(new Error(err?.errMsg || err?.errmsg || 'getContext失败'))
          });
        });
        setContextEntry(entry);
        setContextSource('wx.qy.getContext');
        return entry;
      }

      if (typeof bridge?.invoke === 'function') {
        const entry = await new Promise<string>((resolve) => {
          bridge.invoke('getContext', {}, (res: any) => {
            // WeixinJSBridge 旧版响应可能使用 type 字段，新版使用 entry
            const e = (res?.entry || res?.type || res?.data?.entry || '').trim();
            resolve(e || 'unknown');
          });
        });
        setContextEntry(entry);
        setContextSource('WeixinJSBridge.invoke(getContext)');
        return entry;
      }

      setContextEntry('不可用');
      setContextSource('无可用上下文API');
      return '不可用';
    } catch {
      setContextEntry('获取失败');
      setContextSource('getContext报错');
      return '获取失败';
    }
  };

  const fetchCurrentExternalContact = async () => {
    // 已成功获取则跳过
    if (contactFetchedRef.current) return;

    const bridgeAvailable = typeof (window as any)?.WeixinJSBridge?.invoke === 'function';
    const entryAllowed = CONTACT_ALLOWED_ENTRIES.has(contextEntry);

    // WeixinJSBridge 可用时 entry 可能是 unknown（agentConfig 未完成），仍尝试获取
    if (!entryAllowed && !bridgeAvailable) {
      setContactStatus(`已跳过：当前入口(${contextEntry})非客户信息可读上下文`);
      return;
    }
    try {
      const ww = (window as any)?.ww;
      const wx = (window as any)?.wx;
      const bridge = (window as any)?.WeixinJSBridge;

      if (typeof ww?.getCurExternalContact === 'function') {
        const res = await ww.getCurExternalContact();
        const userId = (res?.userId || '').trim();
        if (userId) {
          contactFetchedRef.current = true;
          if (!toUserId) setToUserId(userId);
          if (!wecomUserId) setWecomUserId(userId);
          setContactStatus('已获取（ww.getCurExternalContact）');
        } else {
          setContactStatus('未返回userId（ww.getCurExternalContact）');
        }
        return;
      }

      if (typeof wx?.qy?.getCurExternalContact === 'function') {
        await new Promise<void>((resolve) => {
          wx.qy.getCurExternalContact({
            success: (res: any) => {
              const userId = (res?.userId || '').trim();
              if (userId) {
                contactFetchedRef.current = true;
                if (!toUserId) setToUserId(userId);
                if (!wecomUserId) setWecomUserId(userId);
                setContactStatus('已获取（wx.qy.getCurExternalContact）');
              } else {
                setContactStatus('未返回userId（wx.qy.getCurExternalContact）');
              }
              resolve();
            },
            fail: (err: any) => {
              setContactStatus(`失败（wx.qy.getCurExternalContact）：${err?.errMsg || err?.errmsg || 'unknown'}`);
              resolve();
            }
          });
        });
        return;
      }

      if (typeof bridge?.invoke === 'function') {
        const wx = (window as any)?.wx;
        // 优先用 wx.invoke（agentConfig 上下文），降级到 bridge.invoke
        const invoker: (method: string, data: any, cb: (res: any) => void) => void =
          typeof wx?.invoke === 'function'
            ? (m, d, cb) => wx.invoke(m, d, cb)
            : (m, d, cb) => bridge.invoke(m, d, cb);

        await new Promise<void>((resolve) => {
          invoker('getCurExternalContact', {}, (res: any) => {
            const userId = (res?.userId || '').trim();
            if (userId) {
              contactFetchedRef.current = true;
              if (!toUserId) setToUserId(userId);
              if (!wecomUserId) setWecomUserId(userId);
              setContactStatus('已获取（wx.invoke/getCurExternalContact）');
            } else {
              const errMsg = res?.err_msg || res?.errMsg || 'unknown';
              setContactStatus(`失败（getCurExternalContact）：${errMsg}`);
            }
            resolve();
          });
        });
        return;
      }

      setContactStatus('当前环境无 getCurExternalContact 能力');
    } catch {
      setContactStatus('getCurExternalContact 调用异常');
    }
  };

  const initWecomJsSdk = async (accessKeyOverride?: string) => {
    if (sdkInitStartedRef.current) return;
    sdkInitStartedRef.current = true;
    setSdkStatus('初始化中');

    try {
      const channel = detectWecomSendChannel();

      // ww.sendChatMessage 已就绪，无需额外初始化
      if (channel === 'ww.sendChatMessage') {
        setWecomClientReady(true);
        setSendChannel(channel);
        setSdkStatus('客户端模式：已检测到 ww.sendChatMessage');
        return;
      }

      // WeixinJSBridge 可用时：记录通道，但仍继续加载 jweixin SDK
      // 目的：通过 wx.config + wx.agentConfig 拿到正确的 getContext entry
      // 不能在这里提前 return，否则 entry 永远是 unknown
      if (channel === 'WeixinJSBridge.invoke(sendChatMessage)') {
        setWecomClientReady(true);
        setSendChannel(channel);
        setSdkStatus('Bridge模式：继续尝试 agentConfig 获取上下文');
        // 继续往下走，尝试 SDK 初始化
      }

      await loadWxSdkScript();
      const params = new URLSearchParams();
      const effectiveKey = (accessKeyOverride || key || '').trim();
      if (effectiveKey) params.set('key', effectiveKey);
      params.set('url', window.location.href.split('#')[0]);

      const response = await fetch(`/api/wecom-sidebar/js-sdk-config?${params.toString()}`);
      const data = (await response.json()) as WecomJsSdkConfigResponse;
      if (!response.ok || !data.success) throw new Error(data.error || '获取企业微信JS-SDK签名失败');

      const wx = (window as any)?.wx;
      if (!wx?.config || !wx?.agentConfig) {
        const fallbackChannel = detectWecomSendChannel();
        if (fallbackChannel === 'WeixinJSBridge.invoke(sendChatMessage)') {
          setWecomClientReady(true);
          setSendChannel(fallbackChannel);
          setSdkStatus('Bridge模式：检测到 sendChatMessage，跳过 wx.config');
          return;
        }
        throw new Error('当前环境缺少 wx.config 或 wx.agentConfig');
      }

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const done = (cb: () => void) => {
          if (settled) return;
          settled = true;
          cb();
        };

        wx.config({
          beta: true,
          debug: false,
          appId: data.corpId,
          timestamp: data.config.timestamp,
          nonceStr: data.config.nonceStr,
          signature: data.config.signature,
          jsApiList: ['checkJsApi', 'getContext', 'sendChatMessage', 'getCurExternalContact', 'openUserProfile']
        });

        wx.ready(() => {
          wx.agentConfig({
            corpid: data.corpId,
            agentid: data.agentId,
            timestamp: data.agentConfig.timestamp,
            nonceStr: data.agentConfig.nonceStr,
            signature: data.agentConfig.signature,
            jsApiList: ['getContext', 'sendChatMessage', 'getCurExternalContact', 'openUserProfile'],
            success: () => done(() => resolve()),
            fail: (err: any) =>
              done(() => reject(new Error(err?.errMsg || err?.errmsg || '企业微信agentConfig初始化失败')))
          });
        });

        wx.error((err: any) => {
          done(() => reject(new Error(err?.errMsg || err?.errmsg || '企业微信config初始化失败')));
        });
      });

      const readyChannel = detectWecomSendChannel();
      setWecomClientReady(Boolean(readyChannel));
      setSendChannel(readyChannel || '未检测');
      setSdkStatus('初始化成功');

      // agentConfig 完成后立即尝试获取客户 ID（这是最佳时机）
      fetchCurrentExternalContact().catch(() => {});
    } catch (error) {
      const channel = detectWecomSendChannel();
      setWecomClientReady(Boolean(channel));
      setSendChannel(channel || '未检测');
      setSdkStatus(`初始化失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setRawQuery(window.location.search || '');

    const resolvedWecomUserId = pickFirstNonEmpty(
      search.get('wecom_userid'),
      search.get('wecomUserId'),
      search.get('external_userid'),
      search.get('externalUserId'),
      search.get('externaluserid'),
      search.get('userid'),
      search.get('userId'),
      search.get('user_id'),
      search.get('follow_userid')
    );
    const target = pickFirstNonEmpty(
      search.get('to_userid'),
      search.get('toUserId'),
      search.get('touser'),
      search.get('receiver_userid'),
      resolvedWecomUserId
    );
    const accessKey = pickFirstNonEmpty(search.get('key'), search.get('access_key'));

    setWecomUserId(resolvedWecomUserId);
    setToUserId(target);
    setKey(accessKey);
    refreshSendChannel();
    initWecomJsSdk(accessKey).catch(() => {});
    refreshContext().catch(() => {});

    // 企业微信部分环境下 WeixinJSBridge 注入较晚，首次会出现 context 不可用
    const onBridgeReady = () => {
      refreshSendChannel();
      refreshContext()
        .then(() => fetchCurrentExternalContact())
        .catch(() => {});
    };
    document.addEventListener('WeixinJSBridgeReady', onBridgeReady as EventListener);

    // getCurExternalContact 依赖 agentConfig 完成，存在时序不确定性
    // 分 500ms / 1500ms / 3000ms 三阶段重试，permission denied 时不再重试
    const RETRY_DELAYS = [500, 1500, 3000];
    retryTimersRef.current = RETRY_DELAYS.map((delay) =>
      window.setTimeout(async () => {
        if (contactFetchedRef.current) return; // 已获取，跳过
        refreshSendChannel();
        await refreshContext().catch(() => {});
        if (!contactFetchedRef.current) {
          await fetchCurrentExternalContact().catch(() => {});
        }
      }, delay)
    );

    // 保留兼容旧逻辑的单次 context 重试
    bridgeRetryTimerRef.current = window.setTimeout(() => {
      refreshSendChannel();
      refreshContext().catch(() => {});
    }, 800);

    return () => {
      document.removeEventListener('WeixinJSBridgeReady', onBridgeReady as EventListener);
      if (bridgeRetryTimerRef.current) window.clearTimeout(bridgeRetryTimerRef.current);
      retryTimersRef.current.forEach((t) => window.clearTimeout(t));
      retryTimersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (contactFetchedRef.current) return; // 已获取，无需再触发
    const bridgeAvailable = typeof (window as any)?.WeixinJSBridge?.invoke === 'function';
    const entryAllowed = CONTACT_ALLOWED_ENTRIES.has(contextEntry);
    if (!entryAllowed && !bridgeAvailable) return;
    if (toUserId && wecomUserId) return;
    fetchCurrentExternalContact().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextEntry]);

  const sendChatMessage = async (params: SendChatMessageParams): Promise<void> => {
    const channel = detectWecomSendChannel();
    const ww = (window as any)?.ww;
    const wxQy = (window as any)?.wx?.qy;
    const bridge = (window as any)?.WeixinJSBridge;

    if (channel === 'ww.sendChatMessage') {
      await ww.sendChatMessage(params);
    } else if (channel === 'wx.qy.sendChatMessage') {
      await new Promise<void>((resolve, reject) => {
        wxQy.sendChatMessage({
          ...params,
          success: () => resolve(),
          fail: (err: any) => reject(new Error(err?.errMsg || err?.errmsg || '发送失败'))
        });
      });
    } else if (channel === 'WeixinJSBridge.invoke(sendChatMessage)') {
      const wx = (window as any)?.wx;
      // wx.invoke 在 agentConfig 完成后可用，权限上下文比 bridge.invoke 更完整
      const invoker: (method: string, data: any, cb: (res: any) => void) => void =
        typeof wx?.invoke === 'function'
          ? (m, d, cb) => wx.invoke(m, d, cb)
          : (m, d, cb) => bridge.invoke(m, d, cb);

      await new Promise<void>((resolve, reject) => {
        invoker('sendChatMessage', params, (res: any) => {
          const errMsg = res?.err_msg || res?.errMsg || '';
          if (errMsg.toLowerCase().includes('ok')) resolve();
          else reject(new Error(errMsg || '发送失败'));
        });
      });
    } else {
      throw new Error('未检测到企业微信会话发送能力');
    }
  };

  // ww.openUserProfile：打开成员或外部联系人的个人信息页（官方文档 91795）
  const openUserProfile = async (userId: string, type: 1 | 2 = 2): Promise<void> => {
    const ww = (window as any)?.ww;
    const wx = (window as any)?.wx;
    const bridge = (window as any)?.WeixinJSBridge;

    if (typeof ww?.openUserProfile === 'function') {
      await ww.openUserProfile({ type, userid: userId });
      return;
    }

    if (typeof wx?.invoke === 'function') {
      await new Promise<void>((resolve, reject) => {
        wx.invoke('openUserProfile', { type, userid: userId }, (res: any) => {
          if ((res?.err_msg || '').includes('ok')) resolve();
          else reject(new Error(res?.err_msg || '打开资料页失败'));
        });
      });
      return;
    }

    if (typeof bridge?.invoke === 'function') {
      bridge.invoke('openUserProfile', { type, userid: userId }, () => {});
      return;
    }

    throw new Error('当前环境不支持 openUserProfile');
  };

  // WeixinJSBridge 可用时 entry 可能是 unknown（agentConfig 尚未完成），
  // 但只要通道存在就应允许发送，不能因 unknown 阻断
  const canSendMessage =
    SEND_ALLOWED_ENTRIES.has(contextEntry) ||
    (wecomClientReady && sendChannel === 'WeixinJSBridge.invoke(sendChatMessage)');

  return {
    key,
    rawQuery,
    wecomUserId,
    toUserId,
    sendChannel,
    sdkStatus,
    contextEntry,
    contextSource,
    contactStatus,
    wecomClientReady,
    canSendMessage,
    setWecomUserId,
    setToUserId,
    buildApiParams,
    refreshContext,
    refreshSendChannel,
    refreshExternalContact: fetchCurrentExternalContact,
    sendChatMessage,
    openUserProfile
  };
}
