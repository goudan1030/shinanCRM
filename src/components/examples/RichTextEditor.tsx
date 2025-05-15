'use client';

import React, { useState } from 'react';

export default function RichTextEditor() {
  const [content, setContent] = useState('欢迎使用富文本编辑器！');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  const [textAlign, setTextAlign] = useState('left');
  const [textColor, setTextColor] = useState('#000000');
  
  // 模拟执行编辑命令
  const execCommand = (command: string, value: string = '') => {
    switch (command) {
      case 'bold':
        setIsBold(!isBold);
        break;
      case 'italic':
        setIsItalic(!isItalic);
        break;
      case 'underline':
        setIsUnderline(!isUnderline);
        break;
      case 'fontSize':
        setFontSize(value);
        break;
      case 'justifyLeft':
      case 'justifyCenter':
      case 'justifyRight':
        setTextAlign(command.replace('justify', '').toLowerCase());
        break;
      case 'foreColor':
        setTextColor(value);
        break;
      default:
        console.log(`Command ${command} not implemented`);
    }
  };
  
  const buttonClass = "p-2 rounded hover:bg-muted transition-colors";
  const activeButtonClass = "p-2 rounded bg-muted transition-colors";
  
  const getTextStyle = () => {
    return {
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      textDecoration: isUnderline ? 'underline' : 'none',
      fontSize: fontSize === 'small' ? '0.875rem' : fontSize === 'large' ? '1.25rem' : '1rem',
      textAlign: textAlign as any,
      color: textColor,
    };
  };
  
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center p-2 gap-1 border-b bg-muted/30">
        <button 
          className={isBold ? activeButtonClass : buttonClass}
          onClick={() => execCommand('bold')}
          title="加粗"
        >
          <span className="font-bold">B</span>
        </button>
        
        <button 
          className={isItalic ? activeButtonClass : buttonClass}
          onClick={() => execCommand('italic')}
          title="斜体"
        >
          <span className="italic">I</span>
        </button>
        
        <button 
          className={isUnderline ? activeButtonClass : buttonClass}
          onClick={() => execCommand('underline')}
          title="下划线"
        >
          <span className="underline">U</span>
        </button>
        
        <div className="w-px h-6 bg-border mx-1"></div>
        
        <select 
          className="p-1 bg-transparent border rounded"
          value={fontSize}
          onChange={(e) => execCommand('fontSize', e.target.value)}
          title="字体大小"
        >
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
        
        <div className="w-px h-6 bg-border mx-1"></div>
        
        <button 
          className={textAlign === 'left' ? activeButtonClass : buttonClass}
          onClick={() => execCommand('justifyLeft')}
          title="左对齐"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="15" y2="12"></line>
            <line x1="3" y1="18" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <button 
          className={textAlign === 'center' ? activeButtonClass : buttonClass}
          onClick={() => execCommand('justifyCenter')}
          title="居中对齐"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="6" y1="12" x2="18" y2="12"></line>
            <line x1="5" y1="18" x2="19" y2="18"></line>
          </svg>
        </button>
        
        <button 
          className={textAlign === 'right' ? activeButtonClass : buttonClass}
          onClick={() => execCommand('justifyRight')}
          title="右对齐"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="9" y1="12" x2="21" y2="12"></line>
            <line x1="6" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        
        <div className="w-px h-6 bg-border mx-1"></div>
        
        <input 
          type="color" 
          value={textColor}
          onChange={(e) => execCommand('foreColor', e.target.value)}
          title="文字颜色"
          className="w-8 h-8 p-1 border rounded cursor-pointer"
        />
      </div>
      
      {/* 编辑区域 */}
      <div className="p-4 min-h-[200px]">
        <textarea
          className="w-full min-h-[200px] p-2 border-none focus:outline-none resize-none bg-transparent"
          style={getTextStyle()}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
    </div>
  );
} 