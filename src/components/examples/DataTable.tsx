'use client';

import React, { useState } from 'react';

interface DataTableProps {
  rows?: number;
}

interface DataRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  registerDate: string;
}

export default function DataTable({ rows = 20 }: DataTableProps) {
  // 生成模拟数据
  const generateData = (): DataRow[] => {
    const data: DataRow[] = [];
    for (let i = 0; i < rows; i++) {
      data.push({
        id: i + 1,
        name: `用户${i + 1}`,
        email: `user${i + 1}@example.com`,
        phone: `1${Math.floor(Math.random() * 10000000000)}`,
        status: Math.random() > 0.3 ? '活跃' : '非活跃',
        registerDate: new Date(Date.now() - Math.random() * 10000000000).toLocaleDateString()
      });
    }
    return data;
  };

  const [data] = useState<DataRow[]>(generateData());
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // 排序数据
  const sortedData = [...data].sort((a, b) => {
    const factor = sortDirection === 'asc' ? 1 : -1;
    if (a[sortColumn as keyof DataRow] < b[sortColumn as keyof DataRow]) {
      return -1 * factor;
    }
    if (a[sortColumn as keyof DataRow] > b[sortColumn as keyof DataRow]) {
      return 1 * factor;
    }
    return 0;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            <th 
              className="p-3 text-left cursor-pointer hover:bg-muted/80"
              onClick={() => handleSort('id')}
            >
              ID {sortColumn === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="p-3 text-left cursor-pointer hover:bg-muted/80"
              onClick={() => handleSort('name')}
            >
              姓名 {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="p-3 text-left cursor-pointer hover:bg-muted/80"
              onClick={() => handleSort('email')}
            >
              邮箱 {sortColumn === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="p-3 text-left cursor-pointer hover:bg-muted/80"
              onClick={() => handleSort('phone')}
            >
              电话 {sortColumn === 'phone' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="p-3 text-left cursor-pointer hover:bg-muted/80"
              onClick={() => handleSort('status')}
            >
              状态 {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="p-3 text-left cursor-pointer hover:bg-muted/80"
              onClick={() => handleSort('registerDate')}
            >
              注册日期 {sortColumn === 'registerDate' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={row.id} className="border-b hover:bg-muted/30">
              <td className="p-3">{row.id}</td>
              <td className="p-3">{row.name}</td>
              <td className="p-3">{row.email}</td>
              <td className="p-3">{row.phone}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-xs ${row.status === '活跃' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {row.status}
                </span>
              </td>
              <td className="p-3">{row.registerDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 