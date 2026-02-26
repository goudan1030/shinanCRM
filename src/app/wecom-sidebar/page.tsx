'use client';

import { useEffect, useRef, useState } from 'react';

type MemberInfo = {
  id: number;
  member_no: string;
  nickname: string | null;
  phone: string | null;
  wechat: string | null;
  gender: string | null;
  type: string | null;
  status: string | null;
  city: string | null;
};

type QuickReply = {
  id: number;
  category: string;
  title: string;
  trigger_text: string | null;
  reply_content: string;
};

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

const SEND_ALLOWED_ENTRIES = new Set([
  'single_chat_tools',
  'group_chat_tools',
  'chat_attachment',
  'single_kf_tools'
]);

const CONTACT_ALLOWED_ENTRIES = new Set([
  'contact_profile',
  'single_chat_tools',
  'single_kf_tools'
]);

export default function WecomSidebarPage() {
  const [memberNo, setMemberNo] = useState('');
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [wecomUserId, setWecomUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [key, setKey] = useState('');
  const [rawQuery, setRawQuery] = useState('');
  const [wecomClientReady, setWecomClientReady] = useState(false);
  const [sendChannel, setSendChannel] = useState('未检测');
  const [sdkStatus, setSdkStatus] = useState('未初始化');
  const [contextEntry, setContextEntry] = useState('未获取');
  const [contextSource, setContextSource] = useState('未检测');
  const sdkInitStartedRef = useRef(false);
  const canSendInCurrentEntry = SEND_ALLOWED_ENTRIES.has(contextEntry);
  const canGetContactInCurrentEntry = CONTACT_ALLOWED_ENTRIES.has(contextEntry);
  const isContextUnknown =
    contextEntry === '未获取' ||
    contextEntry === '不可用' ||
    contextEntry === '获取失败' ||
    contextEntry === 'unknown';
  const canSendInEntryText = canSendInCurrentEntry ? 'yes' : isContextUnknown ? 'unknown' : 'no';

  const pickFirstNonEmpty = (...values: Array<string | null | undefined>) => {
    for (const value of values) {
      const trimmed = (value || '').trim();
      if (trimmed) return trimmed;
    }
    return '';
  };

  const buildApiParams = () => {
    const p = new URLSearchParams();
    if (key) p.set('key', key);
    return p;
  };

  const detectWecomSendChannel = () => {
    const ww = (window as any)?.ww;
    const wxQy = (window as any)?.wx?.qy;
    const bridge = (window as any)?.WeixinJSBridge;

    if (typeof ww?.sendChatMessage === 'function') {
      return 'ww.sendChatMessage';
    }
    if (typeof wxQy?.sendChatMessage === 'function') {
      return 'wx.qy.sendChatMessage';
    }
    if (typeof bridge?.invoke === 'function') {
      return 'WeixinJSBridge.invoke(sendChatMessage)';
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
      if (effectiveKey) {
        params.set('key', effectiveKey);
      }
      params.set('url', window.location.href.split('#')[0]);
      const response = await fetch(`/api/wecom-sidebar/js-sdk-config?${params.toString()}`);
      const data = (await response.json()) as WecomJsSdkConfigResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error || '获取企业微信JS-SDK签名失败');
      }

      const wx = (window as any)?.wx;
      if (!wx?.config || !wx?.agentConfig) {
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
              done(() =>
                reject(new Error(err?.errMsg || err?.errmsg || '企业微信agentConfig初始化失败'))
              )
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

  const detectWecomContext = async (): Promise<string> => {
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
        await new Promise<void>((resolve, reject) => {
          wx.qy.getContext({
            success: (res: any) => {
              setContextEntry(res?.entry || 'unknown');
              setContextSource('wx.qy.getContext');
              resolve();
            },
            fail: (err: any) => reject(new Error(err?.errMsg || err?.errmsg || 'getContext失败'))
          });
        });
        return 'unknown';
      }

      if (typeof bridge?.invoke === 'function') {
        const entry = await new Promise<string>((resolve) => {
          bridge.invoke('getContext', {}, (res: any) => {
            resolve((res?.entry || 'unknown') as string);
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
              }
              resolve();
            },
            fail: () => resolve()
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
            }
            resolve();
          });
        });
      }
    } catch {
      // getCurExternalContact失败时保持静默，避免干扰主流程
    }
  };

  const fetchQuickReplies = async () => {
    const response = await fetch(`/api/wecom-sidebar/quick-replies?${buildApiParams().toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '获取快捷回复失败');
    setQuickReplies(data.list || []);
  };

  const fetchBoundMember = async () => {
    if (!wecomUserId) return;
    const params = buildApiParams();
    params.set('wecom_userid', wecomUserId);
    const response = await fetch(`/api/wecom-sidebar/member?${params.toString()}`);
    const data = await response.json();
    if (response.ok && data.member) {
      setMember(data.member);
      setMemberNo(data.member.member_no || '');
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
    const channel = detectWecomSendChannel();
    setWecomClientReady(Boolean(channel));
    setSendChannel(channel || '未检测');
    initWecomJsSdk(accessKey).catch(() => {
      // initWecomJsSdk内部已兜底状态
    });
    detectWecomContext().catch(() => {
      // detectWecomContext内部已兜底状态
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyDebugInfo = async () => {
    const debugText = [
      `raw_query: ${rawQuery || '(empty)'}`,
      `wecomUserId: ${wecomUserId || '(empty)'}`,
      `toUserId: ${toUserId || '(empty)'}`,
      `key: ${key ? '(exists)' : '(empty)'}`,
      `sendChannel: ${sendChannel}`,
      `sdkStatus: ${sdkStatus}`,
      `contextEntry: ${contextEntry}`,
      `contextSource: ${contextSource}`,
      `canSendInEntry: ${canSendInEntryText}`,
      `canGetContactInEntry: ${canGetContactInCurrentEntry ? 'yes' : 'no'}`
    ].join('\n');
    await navigator.clipboard.writeText(debugText);
    setMessage('诊断信息已复制，可直接发给开发排查');
  };

  useEffect(() => {
    if (!key && !wecomUserId && !toUserId) return;
    fetchQuickReplies().catch((error) => setMessage(error.message));
    fetchBoundMember().catch((error) => setMessage(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, wecomUserId, toUserId]);

  useEffect(() => {
    if (!canGetContactInCurrentEntry) return;
    if (toUserId && wecomUserId) return;
    fetchCurrentExternalContact().catch(() => {
      // fetchCurrentExternalContact内部已兜底
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextEntry]);

  const handleSearchMember = async () => {
    if (!memberNo.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const params = buildApiParams();
      params.set('member_no', memberNo.trim());
      const response = await fetch(`/api/wecom-sidebar/member?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '查询失败');
      setMember(data.member || null);
      if (!data.member) {
        setMessage('未找到该编号对应会员');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async () => {
    if (!wecomUserId) {
      setMessage('缺少 wecom_userid，无法绑定');
      return;
    }
    if (!memberNo.trim()) {
      setMessage('请先输入会员编号');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/wecom-sidebar/bind?${buildApiParams().toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wecom_userid: wecomUserId,
          member_no: memberNo.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '绑定失败');
      setMember(data.member || null);
      setMessage('绑定成功');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '绑定失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuickReply = async (content: string) => {
    setLoading(true);
    setMessage('');
    try {
      const channel = detectWecomSendChannel();
      setWecomClientReady(Boolean(channel));
      setSendChannel(channel || '未检测');

      const sendByClient = async () => {
        if (!channel) return false;
        const latestEntry = await detectWecomContext().catch(() => contextEntry);
        const allowByEntry = SEND_ALLOWED_ENTRIES.has(latestEntry);
        const allowByUnknown =
          latestEntry === 'unknown' ||
          latestEntry === '不可用' ||
          latestEntry === '未获取' ||
          latestEntry === '获取失败';

        if (!allowByEntry && !allowByUnknown) {
          throw new Error(`当前入口(${latestEntry})不支持会话发送`);
        }
        const ww = (window as any)?.ww;
        const wxQy = (window as any)?.wx?.qy;
        const bridge = (window as any)?.WeixinJSBridge;

        if (channel === 'ww.sendChatMessage') {
          await new Promise<void>((resolve, reject) => {
            let settled = false;
            const done = (fn: () => void) => {
              if (settled) return;
              settled = true;
              fn();
            };
            try {
              const maybePromise = ww.sendChatMessage({
                msgtype: 'text',
                text: { content },
                success: () => done(() => resolve()),
                fail: (err: any) => done(() => reject(new Error(err?.errMsg || err?.errmsg || '企业微信会话发送失败')))
              });
              if (maybePromise && typeof maybePromise.then === 'function') {
                maybePromise.then(() => done(() => resolve())).catch((err: any) => {
                  done(() => reject(new Error(err?.errMsg || err?.errmsg || err?.message || '企业微信会话发送失败')));
                });
              }
            } catch (err: any) {
              done(() => reject(new Error(err?.message || '企业微信会话发送失败')));
            }
          });
          return true;
        }

        if (channel === 'wx.qy.sendChatMessage') {
          await new Promise<void>((resolve, reject) => {
            wxQy.sendChatMessage({
              msgtype: 'text',
              text: { content },
              success: () => resolve(),
              fail: (err: any) => reject(new Error(err?.errMsg || err?.errmsg || '企业微信会话发送失败'))
            });
          });
          return true;
        }

        if (channel === 'WeixinJSBridge.invoke(sendChatMessage)') {
          const tryBridgePayload = async (payload: any) =>
            new Promise<void>((resolve, reject) => {
              bridge.invoke('sendChatMessage', payload, (res: any) => {
                const errMsg = (res?.err_msg || '').toLowerCase();
                if (errMsg.includes('ok')) {
                  resolve();
                  return;
                }
                reject(new Error(res?.err_msg || '企业微信会话发送失败'));
              });
            });

          const payloads = [
            { msgtype: 'text', text: { content } },
            { msgtype: 'text', text: { content }, content },
            { msgType: 'text', content }
          ];

          let lastError: Error | null = null;
          for (const payload of payloads) {
            try {
              await tryBridgePayload(payload);
              lastError = null;
              break;
            } catch (err) {
              lastError = err as Error;
            }
          }

          if (lastError) {
            throw lastError;
          }

          await detectWecomContext().catch(() => {
            // 无需中断发送
          });
          return true;
        }

        return false;
      };

      const sentByClient = await sendByClient();
      if (sentByClient) {
        setMessage('发送成功');
        return;
      }

      // 兜底：客户端会话发送不可用时，仍尝试旧的应用消息发送链路
      if (!toUserId) {
        await navigator.clipboard.writeText(content);
        setMessage('当前环境未提供会话发送能力，且未识别接收人UserID，已复制到剪贴板');
        return;
      }

      const response = await fetch(`/api/wecom-sidebar/send-quick-reply?${buildApiParams().toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_userid: toUserId, content })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '发送失败');
      setMessage('发送成功');
    } catch (error) {
      const fallback = content;
      await navigator.clipboard.writeText(fallback);
      const text = error instanceof Error ? error.message : '发送失败';
      const permissionDenied =
        /permission denied/i.test(text) ||
        /without context/i.test(text) ||
        /不支持会话发送/i.test(text);
      setMessage(
        permissionDenied
          ? `发送权限被拒绝（entry: ${contextEntry}）。请从客户会话的“聊天工具栏入口”打开后再试，已自动复制回复内容`
          : `${text}，已自动复制回复内容`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 text-sm leading-relaxed">
      <h2 className="mb-3 text-base font-semibold">企业微信侧边栏</h2>

      <section className="mb-3 rounded-lg border border-gray-200 p-3">
        <div className="mb-2 font-semibold">客户详情</div>
        <div className="mb-2 flex gap-2">
          <input
            value={memberNo}
            onChange={(e) => setMemberNo(e.target.value)}
            placeholder="输入会员编号，例如 M17071"
            className="flex-1 rounded-md border border-gray-300 px-2 py-1.5"
          />
          <button onClick={handleSearchMember} disabled={loading} className="rounded-md border px-2.5 py-1.5">
            查询
          </button>
          <button onClick={handleBind} disabled={loading} className="rounded-md border px-2.5 py-1.5">
            绑定
          </button>
        </div>
        {member ? (
          <div className="rounded-md bg-gray-50 p-2">
            <div>编号：{member.member_no}</div>
            <div>昵称：{member.nickname || '未填写'}</div>
            <div>手机号：{member.phone || '未填写'}</div>
            <div>状态：{member.status || '未知'}</div>
            <div>类型：{member.type || '未知'}</div>
            <div>城市：{member.city || '未填写'}</div>
          </div>
        ) : (
          <div className="text-gray-500">暂无会员信息</div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 font-semibold">快捷回复</div>
        <div className="mb-2 text-xs text-gray-500">
          发送通道：{wecomClientReady ? `企业微信会话发送（${sendChannel}）` : '应用消息发送（兜底）'}
        </div>
        <div className="mb-2 text-xs text-gray-500">SDK状态：{sdkStatus}</div>
        <div className="mb-2 text-xs text-gray-500">会话入口：{contextEntry}（{contextSource}）</div>
        <div className="mb-2 text-xs text-gray-500">
          入口能力：发送
          {canSendInCurrentEntry ? '可用' : isContextUnknown ? '待判定' : '不可用'}，客户ID获取
          {canGetContactInCurrentEntry ? '可用' : '不可用'}
        </div>
        <div className="mb-2">
          <input
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value.trim())}
            placeholder="接收人UserID（自动识别失败时可手动填写）"
            className="w-full rounded-md border border-gray-300 px-2 py-1.5"
          />
          <div className="mt-1 text-xs text-gray-500">
            已兼容参数：to_userid / wecom_userid / userid / user_id / follow_userid
          </div>
        </div>
        <div className="mb-2 rounded-md border border-dashed border-gray-300 bg-gray-50 p-2 text-xs text-gray-600">
          <div>识别到的 wecom_userid：{wecomUserId || '未识别'}</div>
          <div>识别到的 to_userid：{toUserId || '未识别'}</div>
          <button
            type="button"
            onClick={handleCopyDebugInfo}
            className="mt-1 rounded-md border px-2 py-1 text-xs"
          >
            复制诊断信息
          </button>
        </div>
        <div className="grid gap-2">
          {quickReplies.map((item) => (
            <div key={item.id} className="rounded-md border border-gray-200 p-2">
              <div className="font-medium">{item.title}</div>
              <div className="mb-1 text-xs text-gray-500">{item.category}</div>
              <div className="mb-1.5 whitespace-pre-wrap">{item.reply_content}</div>
              <button onClick={() => handleSendQuickReply(item.reply_content)} disabled={loading} className="rounded-md border px-2 py-1">
                发送
              </button>
            </div>
          ))}
          {quickReplies.length === 0 && <div className="text-gray-500">暂无快捷回复模板</div>}
        </div>
      </section>

      {message && (
        <div className="mt-3 text-blue-600">
          {message}
        </div>
      )}
    </div>
  );
}
