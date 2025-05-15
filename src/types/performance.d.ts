/**
 * 性能监控相关的类型声明
 * 扩展Window接口以支持性能监控API
 */

// 扩展Navigator接口
interface Navigator {
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  };
  sendBeacon(url: string, data: any): boolean;
}

// 扩展Performance接口
interface Performance {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}

// 扩展Window接口
interface Window {
  gtag?: (...args: any[]) => void;
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
}

// 扩展PerformanceEntry接口
interface PerformanceNavigationTiming extends PerformanceEntry {
  connectEnd: number;
  connectStart: number;
  domComplete: number;
  domContentLoadedEventEnd: number;
  domContentLoadedEventStart: number;
  domInteractive: number;
  domainLookupEnd: number;
  domainLookupStart: number;
  fetchStart: number;
  loadEventEnd: number;
  loadEventStart: number;
  navigationStart: number;
  redirectCount: number;
  redirectEnd: number;
  redirectStart: number;
  requestStart: number;
  responseEnd: number;
  responseStart: number;
  secureConnectionStart: number;
  type: string;
  unloadEventEnd: number;
  unloadEventStart: number;
}

interface PerformanceResourceTiming extends PerformanceEntry {
  initiatorType: string;
  redirectStart: number;
  redirectEnd: number;
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  nextHopProtocol: string;
}

// 支持更多 EntryType 类型
type ExtendedEntryType = 
  | 'navigation' 
  | 'resource' 
  | 'mark' 
  | 'measure' 
  | 'paint' 
  | 'longtask' 
  | 'first-input' 
  | 'layout-shift' 
  | 'largest-contentful-paint' 
  | 'element' 
  | 'event';

interface PerformanceObserverInit {
  type?: ExtendedEntryType;
  buffered?: boolean;
}

interface PerformanceObserver {
  observe(options: PerformanceObserverInit): void;
  disconnect(): void;
  takeRecords(): PerformanceEntryList;
} 