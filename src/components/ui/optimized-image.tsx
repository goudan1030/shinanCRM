'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 优化的图片组件
 * 
 * 功能：
 * 1. 渐进式加载
 * 2. 懒加载
 * 3. 错误处理
 * 4. 使用Next.js Image优化
 */
export function OptimizedImage({
  src,
  alt,
  width = 300,
  height = 200,
  className = '',
  priority = false,
  quality = 80,
  objectFit = 'cover',
  placeholder = 'empty',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);
  
  // 备用图片 - 在加载错误时显示
  const fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
  
  // 处理图片错误
  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);
  
  // 图片加载完成处理
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad && onLoad();
  };
  
  // 图片加载错误处理
  const handleError = () => {
    setError(true);
    setImgSrc(fallbackSrc);
    onError && onError();
  };

  return (
    <div 
      className={cn(
        'relative overflow-hidden transition-opacity',
        !isLoaded && !error ? 'opacity-40' : 'opacity-100',
        className
      )}
    >
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        className={cn(
          'transition-all duration-300',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down',
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

export default OptimizedImage; 