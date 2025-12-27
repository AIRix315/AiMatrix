/**
 * 章节拆分器接口
 */

/**
 * 章节拆分结果
 */
export interface ChapterSplitResult {
  title: string;
  content: string;
}

/**
 * 章节拆分器接口
 */
export interface IChapterSplitter {
  name: string;
  split(novelContent: string): ChapterSplitResult[];
}
