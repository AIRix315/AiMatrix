/**
 * 基于规则的章节拆分器
 * 不使用 AI，通过规则匹配进行章节拆分
 */

import { IChapterSplitter, ChapterSplitResult } from '../interfaces/IChapterSplitter'

export class RuleBasedChapterSplitter implements IChapterSplitter {
  name = 'RuleBasedChapterSplitter'

  /**
   * 章节标题匹配模式
   * 匹配: 第一章、第1章、第十章、第100章 等格式
   */
  private readonly CHAPTER_PATTERN = /^第[一二三四五六七八九十百千万\d]+章.*/gm

  /**
   * 按字数拆分的阈值（字符数）
   */
  private readonly CHAR_THRESHOLD = 1000

  /**
   * 将小说拆分为章节（实现接口方法）
   */
  split(novel: string): ChapterSplitResult[] {
    // 先尝试按章节标题拆分
    const chaptersByTitle = this.splitByChapterTitle(novel)

    if (chaptersByTitle.length > 0) {
      return chaptersByTitle
    }

    // 如果没有找到章节标题，则按字数拆分
    return this.splitByCharCount(novel)
  }

  /**
   * 按章节标题拆分
   */
  private splitByChapterTitle(novel: string): ChapterSplitResult[] {
    const results: ChapterSplitResult[] = []
    const matches: Array<{ index: number; title: string }> = []

    // 找到所有章节标题的位置
    let match: RegExpExecArray | null
    while ((match = this.CHAPTER_PATTERN.exec(novel)) !== null) {
      matches.push({
        index: match.index,
        title: match[0].trim()
      })
    }

    // 如果没有找到任何章节标题，返回空数组
    if (matches.length === 0) {
      return []
    }

    // 按章节标题拆分内容
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i]
      const nextMatch = matches[i + 1]

      // 提取章节标题（取第一行）
      const titleEndIndex = novel.indexOf('\n', currentMatch.index)
      const title =
        titleEndIndex !== -1
          ? novel.substring(currentMatch.index, titleEndIndex).trim()
          : currentMatch.title

      // 提取章节内容（从标题下一行到下一章节标题前）
      const contentStart = titleEndIndex !== -1 ? titleEndIndex + 1 : currentMatch.index
      const contentEnd = nextMatch ? nextMatch.index : novel.length

      const content = novel.substring(contentStart, contentEnd).trim()

      results.push({
        title,
        content
      })
    }

    return results
  }

  /**
   * 按字数拆分
   * 以1000字为阈值，在1000字之后找第一个换行符进行拆分
   */
  private splitByCharCount(novel: string): ChapterSplitResult[] {
    const results: ChapterSplitResult[] = []
    let startIndex = 0

    while (startIndex < novel.length) {
      // 计算本章节的结束位置
      let endIndex: number

      if (startIndex + this.CHAR_THRESHOLD >= novel.length) {
        // 如果剩余字数不足阈值，全部作为最后一章
        endIndex = novel.length
      } else {
        // 在阈值之后找第一个换行符
        const searchStart = startIndex + this.CHAR_THRESHOLD
        const newlineIndex = novel.indexOf('\n', searchStart)

        if (newlineIndex === -1) {
          // 如果没有找到换行符，取到末尾
          endIndex = novel.length
        } else {
          endIndex = newlineIndex
        }
      }

      // 提取章节内容
      const content = novel.substring(startIndex, endIndex).trim()

      if (content.length > 0) {
        // 按字数拆分时，使用内容的前50字作为标题
        const title = content.substring(0, Math.min(50, content.length)).replace(/\n/g, ' ')
        results.push({
          title,
          content
        })
      }

      // 移动到下一章节的起始位置
      startIndex = endIndex + 1
    }

    return results
  }
}
