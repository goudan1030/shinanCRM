'use client';

import React, { useState, useEffect } from 'react';

export default function Chart() {
  const [data, setData] = useState<{ month: string; sales: number; profit: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模拟加载延迟
    const timer = setTimeout(() => {
      // 生成模拟数据
      const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
      const mockData = months.map(month => ({
        month,
        sales: Math.floor(Math.random() * 10000) + 5000,
        profit: Math.floor(Math.random() * 5000) + 1000
      }));
      
      setData(mockData);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <div className="p-6 text-center">加载图表数据中...</div>;
  }

  // 找出最大值用于计算比例
  const maxSales = Math.max(...data.map(item => item.sales));
  const maxProfit = Math.max(...data.map(item => item.profit));
  const maxValue = Math.max(maxSales, maxProfit);

  return (
    <div className="w-full p-6 bg-card rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-6">月度销售与利润图表</h3>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm">销售额</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm">利润</span>
        </div>
      </div>
      
      <div className="h-64 flex items-end justify-between">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center group" style={{ width: `${100 / data.length}%` }}>
            <div className="relative w-full flex flex-col items-center">
              {/* 销售额柱状图 */}
              <div 
                className="w-6 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 relative group"
                style={{ height: `${(item.sales / maxValue) * 100}%` }}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-blue-700 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  销售额: {item.sales.toLocaleString()}
                </div>
              </div>
              
              {/* 利润柱状图 (向右偏移) */}
              <div 
                className="w-6 bg-green-500 rounded-t absolute left-1/2 ml-2 transition-all duration-300 hover:bg-green-600 relative group"
                style={{ height: `${(item.profit / maxValue) * 100}%` }}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-green-700 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  利润: {item.profit.toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* 月份标签 */}
            <div className="mt-2 text-xs text-muted-foreground">
              {item.month}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 