/**
 * 配音生成器接口
 */

/**
 * 角色信息
 */
export interface Character {
  characterId: string;
  name: string;
  appearance?: string;
  voiceId?: string;
}

/**
 * 对白数据
 */
export interface VoiceoverDialogue {
  characterId: string;
  characterName: string;
  text: string;
  emotion: number[];
  audioPath?: string;
  audioStatus?: 'none' | 'generating' | 'success' | 'failed';
}

/**
 * 配音生成输入
 */
export interface GenerateVoiceoverInput {
  story: string;
  characters: Character[];
}

/**
 * 配音生成输出
 */
export interface GenerateVoiceoverOutput {
  dialogues: VoiceoverDialogue[];
}

/**
 * 配音生成器接口
 */
export interface IVoiceoverGenerator {
  generateVoiceover(params: GenerateVoiceoverInput): Promise<GenerateVoiceoverOutput>;
}
