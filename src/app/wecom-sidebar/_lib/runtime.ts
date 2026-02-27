'use client';

import { useEffect, useRef, useState } from 'react';

export const SEND_ALLOWED_ENTRIES = new Set([
  'single_chat_tools',
  'group_chat_tools',
  'chat_attachment',
  'single_kf_tools'
]);

export const CONTACT_ALLOWED_ENTRIES = new Set([
  'contact_profile',
  'single_chat_tools',
  'single_kf_tools'
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
  setWecomUserId: (value: string) => void;
  setToUserId: (value: string) => void;
  buildApiParams: () => URLSearchParams;
  refreshContext: () => Promise<string>;
  refreshSendChannel: () => string;
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
          bridge.invoke('getContext', {}, (res: any) => resolve((res?.entry || 'unknown') as string));
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
    try {
      const ww = (window as any)?.ww;
      const wx = (window as any)?.wx;
      const bridge = (window as any)?.WeixinJSBridge;

      if (typeof ww?.getCurExternalContact === 'function') {
        const res = await ww.getCurExternalContact();
        const userId = (res?.userId || '').trim();
        if (userId) {
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
        await new Promise<void>((resolve) => {
          bridge.invoke('getCurExternalContact', {}, (res: any) => {
            const userId = (res?.userId || '').trim();
            if (userId) {
              if (!toUserId) setToUserId(userId);
              if (!wecomUserId) setWecomUserId(userId);
              setContactStatus('已获取（WeixinJSBridge.getCurExternalContact）');
            } else {
              setContactStatus(`失败（WeixinJSBridge.getCurExternalContact）：${res?.err_msg || 'unknown'}`);
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
      if (channel === 'WeixinJSBridge.invoke(sendChatMessage)') {
        setWecomClientReady(true);
        setSendChannel(channel);
        setSdkStatus('Bridge模式：无需 wx.config / wx.agentConfig');
        return;
      }

      if (channel === 'ww.sendChatMessage') {
        setWecomClientReady(true);
        setSendChannel(channel);
        setSdkStatus('客户端模式：已检测到 ww.sendChatMessage');
        return;
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
      if (!wx?.config || !wx?.agentConfig) throw new Error('当前环境缺少 wx.config 或 wx.agentConfig');

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
          jsApiList: ['checkJsApi', 'getContext', 'sendChatMessage', 'getCurExternalContact']
        });

        wx.ready(() => {
          wx.agentConfig({
            corpid: data.corpId,
            agentid: data.agentId,
            timestamp: data.agentConfig.timestamp,
            nonceStr: data.agentConfig.nonceStr,
            signature: data.agentConfig.signature,
            jsApiList: ['getContext', 'sendChatMessage', 'getCurExternalContact'],
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
      search.get('userid'),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const allowByEntry = CONTACT_ALLOWED_ENTRIES.has(contextEntry);
    if (!allowByEntry && !isContextUnknown(contextEntry)) return;
    if (toUserId && wecomUserId) return;
    fetchCurrentExternalContact().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextEntry]);

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
    setWecomUserId,
    setToUserId,
    buildApiParams,
    refreshContext,
    refreshSendChannel
  };
}
