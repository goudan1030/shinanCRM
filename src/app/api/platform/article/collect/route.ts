import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

export async function POST(request: Request) {
  try {
    const { url } = await request.json() as { url: string };

    // 使用内置的 fetch
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error('无法访问文章链接');
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 提取文章信息
    const title = $('h1.rich_media_title').text().trim() || 
                 $('#activity-name').text().trim() ||
                 $('h1').first().text().trim();

    const content = $('#js_content').html() || '';
    
    // 提取封面图片
    let coverUrl = '';
    const possibleCovers = [
      () => $('#js_content img').first().attr('data-src'),
      () => $('.rich_media_thumb_wrp img').attr('data-src'),
      () => $('#js_cover_area img').attr('data-src'),
      () => $('#js_content img').first().attr('src')
    ];

    for (const getCover of possibleCovers) {
      const cover = getCover();
      if (cover) {
        coverUrl = cover;
        break;
      }
    }

    // 生成摘要
    const summary = $('#js_content')
      .text()
      .replace(/\s+/g, ' ')
      .substring(0, 200)
      .trim();

    if (!title || !content) {
      throw new Error('无法提取文章内容，请确认链接是否正确');
    }

    // 保存到数据库
    await executeQuery(
      `INSERT INTO articles (
        title, cover_url, content, summary, 
        link_url, is_hidden, is_top, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        coverUrl,
        content,
        summary,
        url,
        0, // is_hidden
        0, // is_top
        0  // sort_order
      ]
    );

    return NextResponse.json({
      success: true,
      message: '采集成功'
    });
  } catch (error) {
    console.error('采集文章失败:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '采集失败，请检查链接是否正确',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 