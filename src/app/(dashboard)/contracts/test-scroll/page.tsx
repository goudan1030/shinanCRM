'use client';

import { useEffect } from 'react';

export default function TestScrollPage() {
  useEffect(() => {
    // 强制重置所有可能的滚动限制
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    
    // 找到所有可能阻止滚动的父元素
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const element = el as HTMLElement;
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.overflow === 'hidden' || computedStyle.height === '100vh') {
        element.style.overflow = 'auto';
        element.style.height = 'auto';
      }
    });
  }, []);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 'auto', minHeight: '200vh', zIndex: 9999, background: 'white' }}>
      <h1>滚动测试页面</h1>
      {Array.from({ length: 100 }, (_, i) => (
        <div key={i} style={{ height: '50px', background: i % 2 ? '#f0f0f0' : '#e0e0e0', border: '1px solid red' }}>
          <p>第 {i + 1} 行</p>
        </div>
      ))}
    </div>
  );
}
