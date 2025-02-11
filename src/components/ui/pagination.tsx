'use client';

import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          className="h-[26px] mx-1"
          onClick={() => onPageChange(i)}
        >
          {i}
        </Button>
      );
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        className="h-[26px]"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        上一页
      </Button>
      {renderPageNumbers()}
      <Button
        variant="outline"
        size="sm"
        className="h-[26px]"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        下一页
      </Button>
    </div>
  );
}