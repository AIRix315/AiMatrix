/**
 * 基于 Agent 的场景和角色提取器实现
 */

import { LangChainAgent } from '../../../agent/LangChainAgent'
import { z } from '../../../agent/types'
import {
  ISceneCharacterExtractor,
  SceneSegment,
  SceneCharacterExtractResult,
  SceneExtractResult,
  CharacterExtractResult,
  Chapter
} from '../interfaces/ISceneCharacterExtractor'

/**
 * Agent 配置接口
 */
export interface AgentSceneCharacterExtractorConfig {
  /**
   * LLM 提供商
   */
  provider: 'openai' | 'deepseek' | 'anthropic'

  /**
   * API Key
   */
  apiKey: string

  /**
   * 模型名称
   */
  model: string

  /**
   * 基础 URL（可选）
   */
  baseURL?: string

  /**
   * 温度参数（可选，默认 0.3）
   */
  temperature?: number
}

/**
 * 基于 Agent 的场景和角色提取器
 */
export class AgentSceneCharacterExtractor implements ISceneCharacterExtractor {
  name = 'AgentSceneCharacterExtractor'

  private agent: LangChainAgent | null = null
  private getConfig: () => Promise<AgentSceneCharacterExtractorConfig>

  /**
   * 场景和角色提取的提示词模板
   */
  /**
   * 场景细化的提示词模板
   */
  private readonly SCENE_REFINE_PROMPT_TEMPLATE = `你是一位经验丰富的场景美术设计师和概念艺术家，擅长将文字描述转换为精准的图片生成提示词。现在你需要为小说中的场景生成用于AI图片生成的prompt。

## 你的任务目标

根据小说章节内容和场景名称列表，为每个场景生成详细的图片生成prompt（中文，Stable Diffusion格式）和场景描述。

## 核心理解

**场景图片的作用**：
- 场景图片是固定的背景图，会在后续的多个分镜中复用
- 必须确保视觉一致性，避免每次生成都不一样
- 场景图片**不包含人物**，只包含环境本身

**场景命名格式**：
- 格式为 \`地点，时间段\`
- 例如："花果山山顶，白天"、"水帘洞内部，白天"、"卧室，夜晚"

## 场景prompt生成规则

### 1. 艺术风格约束（必须遵守）

- **所有场景prompt必须用以下艺术风格作为前缀，放在prompt的最开头:**
{artStyle}

### 2. 场景空间推断原则（核心）

**场景不是单一局部，而是故事发生的完整场所**。你必须根据以下维度进行推断：

**空间推断维度**：
1. **使用功能**：这个场景是用来做什么的？（居住、战斗、集会、办公等）
2. **容积大小**：根据功能推断场景的范围和空间大小（小房间 vs 大厅 vs 广场）
3. **空间高度**：根据功能和容积推断天花板/顶部高度（低矮 vs 挑高 vs 露天）
4. **最大角色数量**：剧本中该场景曾经同时出现的最大角色数量，推断场景需要容纳的空间

**空间关系描述（必须包含）**：
- 场景的整体范围和边界
- 场景内各元素的**位置关系**（前后、左右、中央、角落等）
- 场景内各元素的**空间层次**（前景、中景、远景）
- 建筑构件的**相互关系**（门窗位置、家具摆放、通道走向等）

**建筑构件识别**：
- 从剧本中提取明确指出的建筑构件（门、窗、桥、柱子、台阶等）
- 根据场景功能推断必要的建筑构件（如卧室必有床，咖啡馆必有桌椅）

### 3. prompt必须包含的要素

**地点特征**（核心）：
- 场景的整体范围和空间大小（根据功能和角色数量推断）
- 场景的空间高度（低矮、正常、挑高、露天等）
- 场景的整体布局和空间结构
- 场景的主要元素及其**位置关系**（建筑、地形、植被、装饰等）
- 场景的材质和质感（石头、木头、金属等）

**光照和时间段**（必须）：
- 根据场景名称中的时间段（白天/夜晚/傍晚/清晨等）描述光照条件
- 例如："白天" → "明亮的阳光，柔和的光影"
- 例如："夜晚" → "月光，柔和的夜色，星光点点"
- 例如："傍晚" → "夕阳余晖，温暖的橙色光线"

**氛围和情绪**：
- 从小说内容中提取该场景的整体氛围
- 例如：宁静、神秘、宏伟、温馨、压抑等

**视角和构图**：
- 指定合适的视角（俯瞰、平视、仰视等）
- 指定景深和构图方式

### 4. prompt不能包含的内容

❌ **绝对禁止**包含以下内容：
- 人物（任何角色、人影、人物轮廓）
- 动态元素（飞鸟、流水除外，作为场景装饰可以）
- 具体的情节或动作

### 5. prompt格式要求

- **语言**：中文
- **格式**：Stable Diffusion风格，使用逗号分隔关键词
- **结构**：艺术风格，场景范围大小，空间高度，主体描述，元素位置关系，材质质感，光照条件，氛围情绪，视角构图，画质要求
- **长度**：每个prompt控制在150-250字（因为需要详细描述空间关系）

**标准模板**：

[艺术风格]，[场景范围和容积]，[空间高度]，[场景主体]，[空间布局结构]，[主要元素及位置关系]，[建筑构件及相互关系]，[材质质感]，[光照条件]，[氛围情绪]，[视角构图]，高质量，细节丰富，概念艺术


### 6. 场景描述(description)要求

- 用**自然的中文语句**描述场景
- 说明场景的用途、特点、氛围、空间感
- 长度控制在50-100字
- 便于人类阅读理解

## 场景空间推断方法

在生成prompt之前，你必须先进行**空间推断分析**。以下是推断步骤：

### 步骤1：分析场景功能
- 这个场景的主要用途是什么？（居住、战斗、集会、办公、休闲等）
- 功能决定了场景需要的基本空间大小

### 步骤2：统计角色数量
- 查看剧本中该场景同时出现的**最大角色数量**
- 1-2人：小空间（10-50平米）
- 3-5人：中小空间（50-100平米）
- 6-10人：中型空间（100-200平米）
- 10人以上：大型空间（200平米以上）

### 步骤3：推断空间尺度
- **容积大小**：根据功能和人数确定平面范围（平米数）
- **空间高度**：
  - 小房间/密闭空间：2.5-3米
  - 普通室内：3-4米
  - 大厅/洞穴：5-10米
  - 宫殿/大型建筑：10米以上
  - 露天场景：无限高度

### 步骤4：确定空间关系
- **前景-中景-远景**：场景从近到远有哪些元素层次？
- **左-中-右**：各元素分布在空间的哪个位置？
- **建筑构件位置**：门窗在哪里？桥连接哪里？家具如何摆放？

## 示例

### 示例1：自然场景（露天大空间）

**输入**：
- 场景名称："花果山山顶，白天"
- 小说片段："那座山正当顶上，有一块仙石...四面更无树木遮阴，左右倒有芝兰相衬"
- 场景分析：露天自然场景，无建筑遮挡，空间开阔，主要用于展示仙石诞生，角色数量1-2人

**输出**：
{
  "name": "花果山山顶，白天",
  "prompt": "{artStyle}，开阔的山顶平台约50平米范围，露天无遮挡，仙山之巅，巨大的圆形仙石矗立在山顶平台中央位置，高约3米，仙石周围四面空旷无树木，左侧和右侧各生长着仙草灵芝和兰花作为点缀，远处背景可见云海翻滚环绕山峰，蓝天白云，明亮的阳光从上方洒落照亮整个山顶，仙气在空中缭绕，宏伟壮丽的氛围，广角俯瞰视角能看到整个山顶平台和周围云海，景深效果，高质量，细节丰富，概念艺术",
  "description": "花果山的最高峰露天山顶平台，约50平米的开阔空间，中央矗立着巨大仙石，四周空旷，左右两侧点缀仙草灵芝，云海环绕，仙气飘渺，给人宏伟神秘的空间感。"
}


### 示例2：室内场景（中型洞穴空间）

**输入**：
- 场景名称："水帘洞内部，白天"
- 小说片段："原来是座铁板桥...桥那边有一座天造地设的家当...石座石床，石盆石碗"
- 场景分析：洞穴居住空间，用于群居生活，曾出现众猴（10人以上），需要容纳多人活动和生活家具

**输出**：
{
  "name": "水帘洞内部，白天",
  "prompt": "{artStyle}，宽敞的石洞大厅空间约200平米，洞顶高度约8-10米呈拱形，洞穴内部前景入口处有瀑布水帘遮挡形成朦胧光影，洞内中景位置有铁板桥横跨连接两侧地面，桥后方远景区域石制家具整齐摆放成生活区，包括石座石床石桌分布在洞穴两侧和后方，左右两侧天然石柱支撑洞顶，岩石质感粗糙自然带有湿润感，从瀑布透进的柔和日光照亮前景和中景，洞内光线昏暗但有光斑洒在石制家具上，神秘清幽的氛围，平视角度从入口看向洞穴深处，纵深构图展现空间层次，高质量，细节丰富，概念艺术",
  "description": "水帘洞的主洞厅，约200平米的宽敞洞穴空间，洞顶高约8-10米，入口瀑布水帘遮挡，中央铁板桥连接两侧，内部石制家具分布两侧和后方，光线从瀑布透入形成层次感，营造神秘清幽的居住氛围。"
}


### 示例3：城市场景（小型室内空间）

**输入**：
- 场景名称："咖啡馆，傍晚"
- 小说片段："这是一家温馨的小咖啡馆，靠窗的位置摆放着几张木桌，墙上挂着暖色调的装饰画"
- 场景分析：小型商业空间，用于休闲会面，最多容纳2-3个角色对话，需要展示窗边座位和吧台区

**输出**：
{
  "name": "咖啡馆，傍晚",
  "prompt": "{artStyle}，温馨的小咖啡馆室内空间约40平米，层高约3米，前景右侧靠窗位置摆放3-4张木质桌椅，左侧墙面挂着暖色装饰画，中景位置是吧台区域摆放咖啡机和杯具，吧台后方是操作区，室内左右两侧墙面和顶部暖黄色吊灯形成照明，大玻璃窗位于右侧墙面，复古温馨的装饰风格，傍晚时分夕阳余晖从右侧窗户透进洒在木桌和地面上，温暖的橙色光线与室内灯光交织，温馨舒适的氛围，平视角度从门口向内看整个空间布局，浅景深突出前景座位区，高质量，细节丰富，概念艺术",
  "description": "一家约40平米的小型咖啡馆室内空间，层高3米，右侧窗边摆放木质桌椅，左侧墙面装饰画，中央吧台区，傍晚夕阳从窗户透入，与室内暖黄灯光交织，营造温馨舒适的休闲氛围。"
}


## 输出数据结构

输出一个包含 scenes 数组的 JSON 对象：
{
    "scenes": [
        {
            "name": "场景名称（与输入的场景名称完全一致）",
            "prompt": "用于图片生成的中文prompt，Stable Diffusion格式，逗号分隔",
            "description": "场景的中文描述，自然语句，包含空间信息，50-100字"
        }
    ]
}


## 注意事项

1. **必须包含艺术风格**：所有prompt必须以我指定的艺术风格开头，这是强制要求
2. **必须进行空间推断**：根据场景功能、角色数量推断空间大小、高度、容积
3. **必须描述空间关系**：详细说明各元素的位置关系（前景、中景、远景，左侧、右侧、中央等）
4. **严格遵守场景名称**：输出的 \`name\` 字段必须与输入的场景名称完全一致
5. **绝对不能包含人物**：prompt中不能出现任何人物相关描述
6. **绝对不能包含道具**：prompt中不能出现可移动的道具物品
7. **时间段必须体现**：根据场景名称中的时间段（白天/夜晚等）准确描述光照
8. **基于小说内容**：仔细阅读小说中该场景的描写，提取关键的场景元素
9. **提取建筑构件**：从剧本中明确提到的建筑构件必须包含（门、窗、桥等）
10. **保持风格一致性**：所有prompt的格式和结构应该统一
11. **输出纯JSON对象**：必须输出包含 scenes 数组的 JSON 对象

---

## 现在开始你的任务

**输入数据**：

场景列表：
{sceneNames}


小说章节原文：
{chapterContent}


请为以上所有场景生成图片prompt和描述。`

  /**
   * 角色细化的提示词模板
   */
  private readonly CHARACTER_REFINE_PROMPT_TEMPLATE = `你是一名资深的角色设计师和AI提示词描述师，擅长将文字描述转换为精准的角色形象提示词。现在你需要为小说中的角色生成用于AI图片生成的prompt。

## 你的任务目标

根据小说章节内容和角色名称列表，为每个角色生成详细的图片生成prompt（中文，Stable Diffusion格式）和角色描述。

## 核心理解

**角色图片的作用**：
- 角色图片是固定的人物形象，会在后续的所有章节中复用
- 必须确保**跨章节的视觉一致性**
- 一个角色只有一个固定形象

**角色形象的固定性**：
- 外貌、发型、体型、服装、服饰必须固定
- 这些要素共同构成角色的唯一形象
- **不考虑**角色在不同场景下的服装变化
- **不考虑**角色的表情、动作、姿态等可变要素

**图片要求**：
- **必须是白色背景**
- 角色居中展示
- 必须使用半身照

## 角色prompt生成规则

### 1. 提示词固定格式

**标准结构（必须严格遵守）**：
{artStyle}，超细腻面部表情，性别，年龄，身高，脸型，发型，眼型，简化鼻子和嘴（线条嘴、线条鼻子），瞳色，眼神，身材，服装款式颜色（干净无污染、色块统一且无杂色的材质），纯白背景，半身照

**具体描述顺序（必须按此顺序）**：
1. 性别
2. 年龄（具体数字，如"23岁"）
3. 身高（具体数字，如"168cm"）
4. 脸型（如"鹅蛋脸"、"棱角分明脸型"）
5. 发型（详细描述，如"墨色高马尾"、"深紫色半束发"）
6. 眼型（如"杏眼"、"狭长凤眼"）
7. 简化鼻子和嘴（固定用"线条嘴、线条鼻子"）
8. 瞳色（具体颜色，如"青绿色瞳孔"、"暗紫色瞳孔"）
9. 眼神（如"眼神锐利"、"眼神阴鸷"）
10. 身材（如"身材E杯细腰"、"宽肩窄腰"）
11. 服装款式颜色（详细描述，如"月白色交领短衫+石青色束腰长裙"）
12. 纯白背景（必须包含）
13. 半身照

### 2. 提示词要求

- **只描写简单的物理状态**：只保留特征主体
- **不描述光影**：光影已在艺术风格中统一定义
- **不描述唇色**：统一使用简化的线条嘴
- **色块统一**：避免杂色和复杂图案
- **内容简洁明了**：严禁深入叙述
- **全部为物理状态呈现**：无拟人化，无比喻等词语

### 3. 必须包含的要素

**外貌特征**（核心）：
- 面部特征：脸型、眼型、简化鼻嘴
- 年龄和性别（具体数字）
- 身高（具体数字）
- 种族或特殊物种（人类、猴子、妖怪等）

**体型特征**：
- 身材描述（具体、简洁）
- 体态（挺拔、佝偻等）

**发型**：
- 发型样式（详细）
- 发色（具体颜色）

**服装服饰**（重要）：
- **服装形制**（根据身份和职业确定）
- **服装款式**（详细描述）
- **服装颜色**（具体颜色名称）
- **材质说明**（干净、色块统一）
- **不包含鞋子**

**眼神气质**：
- 瞳色（具体颜色）
- 眼神特点（一个形容词）

### 4. 绝对禁止的内容

❌ **绝对禁止**包含以下内容：
- 具体的表情（微笑、愤怒、悲伤等）
- 具体的动作（跑、跳、挥手等）
- 具体的姿态（弯腰、抬手等）
- 场景和背景元素（除了"纯白背景"）
- 道具和物品（除非是角色服装的固定组成部分）
- 其他角色
- 鞋子
- 光影描述
- 唇色描述

## 输出数据结构

输出一个包含 characters 数组的 JSON 对象：
{
    "characters": [
        {
            "name": "角色名称（与输入的角色名称完全一致）",
            "prompt": "用于图片生成的中文prompt，Stable Diffusion格式，逗号分隔，必须包含'纯白背景'",
            "description": "角色的中文描述，自然语句，50-100字",
            "appearance": "角色最精简的外在形象描述，10字左右"
        }
    ]
}

## 注意事项

1. **严格遵守角色名称**：输出的 name 字段必须与输入的角色名称完全一致
2. **必须包含纯白背景**：prompt中必须明确指定"纯白背景"
3. **不包含表情动作**：只描述固定的外貌、发型、体型、服装
4. **服装必须固定**：为角色设计一套固定的服装
5. **基于小说内容**：仔细阅读小说中该角色的描写
6. **符合角色设定**：服装和形象要符合角色的身份、年龄、性格
7. **保持风格一致性**：所有prompt的格式和结构必须统一
8. **输出纯JSON对象**：必须输出包含 characters 数组的 JSON 对象
9. **色彩管理**：确保不同角色有明显的视觉区分度

---

## 现在开始你的任务

**输入数据**：

角色列表：
{characterNames}

小说章节原文：
{chapterContent}

---
请为以上所有角色生成图片prompt和描述。`

  private readonly EXTRACT_PROMPT_TEMPLATE = `你是一位经验丰富的影视制片人和资源管理专家，擅长分析剧本并识别制作所需的关键物料。现在你需要将可视化的影视文本进行场景分解，并识别出需要固定形象的物料。

## 你的任务目标

将可视化文本按"场景+时间段"的维度进行结构化分解，识别出需要跨章节保持视觉一致性的关键物料（主要角色、场景）。

## 核心理解

**为什么要识别物料？**
- 识别出的角色、场景会生成固定的基础图片
- 这些图片会在后续章节中复用，确保整部作品的**视觉一致性**
- 非主要角色和非关键道具不需要固定形象，可以随场景动态生成

**识别标准**：只识别需要跨章节保持一致性的关键物料。

## 场景分解规则

### 1. 场景划分标准
按照"**地点+时间段**"的组合进行划分，只要满足以下任一条件就分为新场景：

**地点变化**：
- 地点有细微变化就分为新场景
- 例如："山顶"→"山脚"→"山洞内部" 是三个不同场景
- 例如："客厅"→"卧室"→"厨房" 是三个不同场景
- 例如："街道"→"咖啡馆"→"办公室" 是三个不同场景

**时间段变化**：
- 在同一地点，时间段变化也要分为新场景
- 时间段只需标注大致时段：**白天/夜晚/傍晚/清晨/中午**等
- 例如："山顶，清晨"和"山顶，傍晚"是两个不同场景

**原因**：即使是临时场景，后续拆分分镜时也可能有多个镜头。如果多个镜头中的场景图片不一致，会产生严重的违和感。因此**所有出现的场景都必须识别**。

**重要**：相同场景+相同时间段的连续剧情应该合并为一个场景对象，不要因为story字段内容较长就拆分为多个场景对象。

### 2. 场景命名规范
- 格式：\`地点，时间段\`
- 地点要具体明确，能让人清晰理解是什么地方
- 时间段用通用词汇：白天/夜晚/傍晚/清晨/中午/深夜等
- **同一大场景内的不同位置要分开**：例如"水帘洞内部"和"水帘洞王座"应视为同一场景，统一为"水帘洞内部"

**场景粒度把握**：
- ✅ 正确粒度："客厅"、"卧室"、"厨房"（室内不同房间要分开）
- ✅ 正确粒度："山顶"、"山脚"、"山腰"（大范围地点的不同位置要分开）
- ❌ 过细粒度："客厅沙发处"、"客厅电视前"（同一房间的不同位置不要分开）
- ❌ 过细粒度："水帘洞内部"、"水帘洞王座"（同一洞穴的不同位置不要分开）

**重要：场景合并原则**
在相同时间段内，如果剧情在同一个大地点的不同小位置之间连续发生，应该合并为一个场景：
- ✅ 正确："我家，中午"（包含厨房→客厅→卧室的连续剧情）
- ✅ 正确："公司，上午"（包含大厅→走廊→办公室的连续剧情）
- ❌ 错误：将"厨房，中午"、"客厅，中午"、"卧室，中午"拆分为三个场景（剧情连续，应合并）
- ❌ 错误：将"山脚，白天"、"山腰，白天"、"山顶，白天"合并为一个场景（地点跨度大，应分开）

**判断标准**：
- 如果是室内场景，同一建筑物内的不同房间在连续剧情中应合并（如"家"、"公司"、"酒店"）
- 如果是室外场景，地点跨度较大时仍需分开（如"山脚"→"山顶"）
- 关键看剧情的连贯性和地点的归属性

**示例**：
- ✅ "花果山山顶，白天"
- ✅ "水帘洞内部，白天"（不要再细分为"水帘洞王座"）
- ✅ "张三的卧室，夜晚"
- ✅ "咖啡馆，傍晚"
- ❌ "第三天清晨的山顶"（太具体）
- ❌ "山上"（太模糊）
- ❌ "水帘洞王座"（过细，应归入"水帘洞内部"）

## 物料识别规则

### 1. 角色识别
**只识别有明确名字的主要角色**，这些角色需要固定形象。
**只识别在当前章节实际出场的角色，若只是提到，缺没有出场，则不需要识别该角色**

**识别标准**：
- ✅ 有具体名字的角色（如"孙悟空"、"张三"、"李小姐"）
- ✅ 有特定称号的主要角色（如"美猴王"、"老板"、"教授"）
- ✅ 有特定称号的主要角色（如"店员"、"路人甲"）
- ✅ 第一人称叙述中的"我"（保持使用"我"作为角色名）
- ❌ 群体角色（如"众猴"、"路人"、"士兵们"）
- ❌ 旁白/画外音（不算角色）

**第一人称处理**：
- 如果小说采用第一人称"我"叙述，直接使用"我"作为角色名
- 不要试图推断或替换为其他名称
- 在 \`characters\` 数组中，"我"和其他角色名并列即可

**角色名称一致性原则**：
- **同一角色的不同称呼必须统一为一个名称**
- 选择该角色最常用、最正式的称呼作为统一名称
- 例如："石猴"在故事后期被称为"美猴王"，应统一使用"石猴"或"美猴王"其中一个
- 例如："张三"如果也被称为"张老板"、"张先生"，应统一使用"张三"

**处理方式**：
- 在 \`characters\` 数组中：只列出**在该场景中真正出场**的主要角色，同一角色只出现一次
- 在 \`story\` 文本中：保留所有角色描述（包括"众猴"、"路人"等）
- **只要角色在该场景中出现（哪怕是在场景末尾才出现、刚刚诞生、刚刚登场），都应该被识别**

**重要说明**：
- \`characters\` 数组表示的是**在该场景画面中实际出现的角色**
- 如果某角色只是被提及、回忆或讨论，但没有实际出现在场景中，不应该列入 \`characters\`
- 例如：芳姐在对话中提到"那个医生"，但医生本人没有在场，不要把医生列入该场景的 \`characters\`

### 2. 场景识别
**所有出现的场景都要识别**，每个场景都需要生成固定的背景图片。
**只识别实际出场的场景，若该场景只是提到，并没有实际出场，则不需要识别**

- 无论场景是否会反复出现，都要识别
- 包括临时出现的场景（如"街角"、"走廊"）
- 每个场景都会生成一张固定的背景图，供后续分镜使用

## 输出数据结构

输出一个JSON对象，包含一个 scenes 数组字段，每个元素代表一个场景：

\`\`\`json
{
    "scenes": [
        {
            "scene": "场景名称（地点，时间段）",
            "story": "该场景的完整剧情文本（从可视化文本中截取）",
            "characters": ["主要角色1", "主要角色2"],
        }
    ]
}
\`\`\`

**字段说明**：
- \`scenes\`：场景列表数组
- \`scene\`：场景名称，格式为"地点，时间段"
- \`story\`：该场景内的完整剧情文本，包括所有动作描述、对话、情绪描述、\`[内心独白：...]\` 标注等。直接从输入的可视化文本中截取对应场景的段落。
- \`characters\`：该场景中出现的主要角色名称数组（只包含有名字的角色，不包括群体角色）

## 注意事项

1. **场景必须完整覆盖**：确保所有剧情都被分配到某个场景中，不能有遗漏
2. **story字段保持原样**：直接从输入文本中截取，保留所有格式、标注（如\`[内心独白：...]\`）
3. **角色名称统一**：同一角色在不同场景中名称要保持一致
4. **输出格式**：必须输出包含 scenes 数组的 JSON 对象

---

## 现在开始你的任务

请将以下可视化文本进行场景分解并识别物料：

{chapterContent}`

  constructor(getConfig: () => Promise<AgentSceneCharacterExtractorConfig>) {
    this.getConfig = getConfig
  }

  /**
   * 初始化或获取 agent 实例（延迟初始化，实时读取配置）
   */
  private async ensureAgent(): Promise<LangChainAgent> {
    // 每次都重新读取配置以确保使用最新的配置
    const config = await this.getConfig()

    // 创建新的 LangChain agent（使用最新配置）
    this.agent = new LangChainAgent({
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature
    })

    return this.agent
  }

  /**
   * 将章节文本拆分为场景分段
   */
  async splitChapterIntoScenes(chapterContent: string): Promise<SceneSegment[]> {
    // 定义场景分段的 Zod Schema
    const SceneSegmentSchema = z.object({
      scenes: z.array(
        z.object({
          scene: z.string().describe('场景名称，格式为"地点，时间段"'),
          story: z.string().describe('该场景的完整剧情文本'),
          characters: z.array(z.string()).describe('该场景中出现的主要角色名称数组')
        })
      )
    })

    type SceneSegmentOutput = z.infer<typeof SceneSegmentSchema>

    // 构建提示词
    const prompt = this.EXTRACT_PROMPT_TEMPLATE.replace('{chapterContent}', chapterContent)

    // 获取 agent 实例（实时读取配置）
    const agent = await this.ensureAgent()

    // 调用 Agent
    const result = await agent.structuredOutput<SceneSegmentOutput>(prompt, SceneSegmentSchema, {
      maxRetries: 3
    })

    // 处理结果
    if (!result.success) {
      const error = result.error!
      throw new Error(`场景拆分失败: ${error.message} (类型: ${error.type})`)
    }

    const scenes = result.data!.scenes.map((scene) => ({
      ...scene
    }))

    console.log(
      `[AgentSceneCharacterExtractor] 场景拆分成功，共 ${scenes.length} 个场景，耗时 ${result.metadata.duration}ms`
    )

    return scenes
  }

  /**
   * 章节摘要生成：为整个章节内容生成摘要
   */
  async generateChapterSummary(chapterContent: string): Promise<string> {
    // 定义章节摘要的 Zod Schema
    const ChapterSummarySchema = z.object({
      summary: z.string().describe('章节摘要，100字以内')
    })

    type ChapterSummaryOutput = z.infer<typeof ChapterSummarySchema>

    // 构建提示词
    const prompt = `你是一位专业的文本摘要专家。请为以下章节内容生成一个简洁的摘要，要求：
1. 字数控制在100字以内
2. 准确概括故事的核心发展
3. 包含关键事件和转折点

章节内容：
${chapterContent}`

    // 获取配置和 agent 实例（实时读取配置）
    const config = await this.getConfig()
    const agent = await this.ensureAgent()

    // 调用 Agent
    const result = await agent.structuredOutput<ChapterSummaryOutput>(
      prompt,
      ChapterSummarySchema,
      {
        maxRetries: 3,
        timeout: 60000, // 1分钟超时
        temperature: config.temperature ?? 0.3
      }
    )

    // 处理结果
    if (!result.success) {
      const error = result.error!
      throw new Error(`章节摘要生成失败: ${error.message} (类型: ${error.type})`)
    }

    console.log(
      `[AgentSceneCharacterExtractor] 章节摘要生成成功，耗时 ${result.metadata.duration}ms`
    )

    return result.data!.summary
  }

  /**
   * 场景摘要生成：为单个场景内容生成摘要
   */
  async generateSceneSummary(sceneStory: string): Promise<string> {
    // 定义场景摘要的 Zod Schema
    const SceneSummarySchema = z.object({
      summary: z.string().describe('场景摘要，100字以内')
    })

    type SceneSummaryOutput = z.infer<typeof SceneSummarySchema>

    // 构建提示词
    const prompt = `你是一位专业的文本摘要专家。请为以下场景内容生成一个简洁的摘要，要求：
1. 字数控制在100字以内
2. 准确概括该场景的核心内容
3. 包含关键动作和对话要点

场景内容：
${sceneStory}`

    // 获取配置和 agent 实例（实时读取配置）
    const config = await this.getConfig()
    const agent = await this.ensureAgent()

    // 调用 Agent
    const result = await agent.structuredOutput<SceneSummaryOutput>(prompt, SceneSummarySchema, {
      maxRetries: 3,
      timeout: 60000, // 1分钟超时
      temperature: config.temperature ?? 0.3
    })

    // 处理结果
    if (!result.success) {
      const error = result.error!
      throw new Error(`场景摘要生成失败: ${error.message} (类型: ${error.type})`)
    }

    return result.data!.summary
  }

  /**
   * 批量场景摘要生成：为所有场景并行生成摘要
   */
  async generateSceneSummaries(sceneSegments: SceneSegment[]): Promise<string[]> {
    console.log(
      `[AgentSceneCharacterExtractor] 开始生成 ${sceneSegments.length} 个场景摘要（并行）`
    )

    // 并行生成所有场景摘要
    const summaries = await Promise.all(
      sceneSegments.map((segment) => this.generateSceneSummary(segment.story))
    )

    console.log(`[AgentSceneCharacterExtractor] 所有场景摘要生成完成`)

    return summaries
  }

  /**
   * 场景细化：生成详细的图片prompt和描述
   */
  async refineScenes(
    sceneSegments: SceneSegment[],
    chapterContent: string,
    artStyle: string
  ): Promise<
    Array<{
      name: string
      prompt: string
      description: string
    }>
  > {
    // 获取场景名称列表
    const sceneNames = sceneSegments.map((item) => item.scene)

    // 定义场景细化的 Zod Schema
    const SceneRefineSchema = z.object({
      scenes: z.array(
        z.object({
          name: z.string().describe('场景名称（与输入的场景名称完全一致）'),
          prompt: z.string().describe('用于图片生成的中文prompt，Stable Diffusion格式，逗号分隔'),
          description: z.string().describe('场景的中文描述，自然语句，50-100字')
        })
      )
    })

    type SceneRefineOutput = z.infer<typeof SceneRefineSchema>

    // 构建提示词
    const prompt = this.SCENE_REFINE_PROMPT_TEMPLATE.replace('{artStyle}', artStyle)
      .replace('{sceneNames}', JSON.stringify(sceneNames, null, 2))
      .replace('{chapterContent}', chapterContent)

    // 获取配置和 agent 实例（实时读取配置）
    const config = await this.getConfig()
    const agent = await this.ensureAgent()

    // 调用 Agent
    const result = await agent.structuredOutput<SceneRefineOutput>(prompt, SceneRefineSchema, {
      maxRetries: 3,
      timeout: 180000, // 3分钟超时
      temperature: config.temperature ?? 0.3
    })

    // 处理结果
    if (!result.success) {
      const error = result.error!
      throw new Error(`场景细化失败: ${error.message} (类型: ${error.type})`)
    }

    const refinedScenes = result.data!.scenes

    console.log(
      `[AgentSceneCharacterExtractor] 场景细化成功，共 ${refinedScenes.length} 个场景，耗时 ${result.metadata.duration}ms`
    )

    return refinedScenes
  }

  /**
   * 角色细化：生成详细的图片prompt和描述
   */
  async refineCharacters(
    sceneSegments: SceneSegment[],
    chapterContent: string,
    artStyle: string
  ): Promise<
    Array<{
      name: string
      prompt: string
      description: string
      appearance: string
    }>
  > {
    // 提取并去重所有角色名称
    const characterNamesSet = new Set<string>()
    sceneSegments.forEach((segment) => {
      segment.characters.forEach((name) => characterNamesSet.add(name))
    })
    const characterNames = Array.from(characterNamesSet)

    // 如果没有角色，直接返回空数组
    if (characterNames.length === 0) {
      return []
    }

    // 定义角色细化的 Zod Schema
    const CharacterRefineSchema = z.object({
      characters: z.array(
        z.object({
          name: z.string().describe('角色名称（与输入的角色名称完全一致）'),
          prompt: z
            .string()
            .describe(
              '用于图片生成的中文prompt，Stable Diffusion格式，逗号分隔，必须包含"纯白背景"'
            ),
          description: z.string().describe('角色的中文描述，自然语句，50-100字'),
          appearance: z.string().describe('角色最精简的外在形象描述，10字左右')
        })
      )
    })

    type CharacterRefineOutput = z.infer<typeof CharacterRefineSchema>

    // 构建提示词
    const prompt = this.CHARACTER_REFINE_PROMPT_TEMPLATE.replace('{artStyle}', artStyle)
      .replace('{characterNames}', JSON.stringify(characterNames, null, 2))
      .replace('{chapterContent}', chapterContent)

    // 获取配置和 agent 实例（实时读取配置）
    const config = await this.getConfig()
    const agent = await this.ensureAgent()

    // 调用 Agent
    const result = await agent.structuredOutput<CharacterRefineOutput>(
      prompt,
      CharacterRefineSchema,
      {
        maxRetries: 3,
        timeout: 180000, // 3分钟超时
        temperature: config.temperature ?? 0.3
      }
    )

    // 处理结果
    if (!result.success) {
      const error = result.error!
      throw new Error(`角色细化失败: ${error.message} (类型: ${error.type})`)
    }

    const refinedCharacters = result.data!.characters

    console.log(
      `[AgentSceneCharacterExtractor] 角色细化成功，共 ${refinedCharacters.length} 个角色，耗时 ${result.metadata.duration}ms`
    )

    return refinedCharacters
  }

  /**
   * 场景匹配的提示词模板
   */
  private readonly SCENE_MATCH_PROMPT_TEMPLATE = `你是一位专业的场景匹配专家，擅长识别相同或相似的场景。

## 任务目标

根据新场景和历史场景的信息，判断它们是否为同一个场景。

## 匹配标准

**场景被认为是"同一个"的条件**（同时满足）：
1. **地点相同或极其相似**：地点的核心属性一致（如都是"卧室"、都是"山顶"）
2. **时间段相同**：白天、夜晚、傍晚等时间段一致
3. **空间特征相似**：空间大小、布局、主要元素相似度高

**重要**：
- 相似度评分范围：0-100
- 只有相似度 >= 80 分的才视为可复用
- 评分时重点关注地点、时间段、空间特征的一致性

## 输入数据

**新场景列表**：
{newScenes}

**历史场景列表**：
{historyScenes}

## 输出格式

输出一个 JSON 对象，包含 matches 数组：

\`\`\`json
{
  "matches": [
    {
      "newSceneIndex": 0,
      "matchedSceneId": "scene-xxx-xxx",
      "similarity": 85
    }
  ]
}
\`\`\`

**说明**：
- \`newSceneIndex\`：新场景在输入数组中的索引（从 0 开始）
- \`matchedSceneId\`：匹配到的历史场景的 ID
- \`similarity\`：相似度评分（0-100）

**注意**：
- 只返回相似度 >= 80 的匹配结果
- 如果某个新场景没有找到相似度 >= 80 的历史场景，则不要在 matches 中包含它
- 每个新场景最多匹配 1 个历史场景（选择相似度最高的）`

  /**
   * 角色匹配的提示词模板
   */
  private readonly CHARACTER_MATCH_PROMPT_TEMPLATE = `你是一位专业的角色匹配专家，擅长识别相同或相似的角色。

## 任务目标

根据新角色和历史角色的信息，判断它们是否为同一个角色。

## 匹配标准

**角色被认为是"同一个"的条件**（同时满足）：
1. **名称相同或别名**：角色名称完全相同，或者是同一个人的不同称呼
2. **外貌特征高度一致**：性别、年龄段、发型、体型、服装风格等核心特征一致
3. **身份/职业相符**：角色的身份、职业、社会地位等设定一致

**重要**：
- 相似度评分范围：0-100
- 只有相似度 >= 80 分的才视为可复用
- 评分时重点关注名称、外貌、身份的一致性

## 输入数据

**新角色列表**：
{newCharacters}

**历史角色列表**：
{historyCharacters}

## 输出格式

输出一个 JSON 对象，包含 matches 数组：

\`\`\`json
{
  "matches": [
    {
      "newCharacterIndex": 0,
      "matchedCharacterId": "character-xxx-xxx",
      "similarity": 92
    }
  ]
}
\`\`\`

**说明**：
- \`newCharacterIndex\`：新角色在输入数组中的索引（从 0 开始）
- \`matchedCharacterId\`：匹配到的历史角色的 ID
- \`similarity\`：相似度评分（0-100）

**注意**：
- 只返回相似度 >= 80 的匹配结果
- 如果某个新角色没有找到相似度 >= 80 的历史角色，则不要在 matches 中包含它
- 每个新角色最多匹配 1 个历史角色（选择相似度最高的）`

  /**
   * 匹配相似的场景
   */
  async matchSimilarScenes(
    newScenes: Array<{ name: string; description: string }>,
    historyScenes: Array<{ id: string; name: string; description: string }>
  ): Promise<Array<{ newSceneIndex: number; matchedSceneId: string; similarity: number }>> {
    // 如果没有历史场景，直接返回空数组
    if (historyScenes.length === 0) {
      return []
    }

    // 定义匹配结果的 Zod Schema
    const SceneMatchSchema = z.object({
      matches: z.array(
        z.object({
          newSceneIndex: z.number().describe('新场景在输入数组中的索引'),
          matchedSceneId: z.string().describe('匹配到的历史场景的 ID'),
          similarity: z.number().min(0).max(100).describe('相似度评分（0-100）')
        })
      )
    })

    type SceneMatchOutput = z.infer<typeof SceneMatchSchema>

    // 构建提示词
    const prompt = this.SCENE_MATCH_PROMPT_TEMPLATE.replace(
      '{newScenes}',
      JSON.stringify(newScenes, null, 2)
    ).replace('{historyScenes}', JSON.stringify(historyScenes, null, 2))

    // 获取 agent 实例（实时读取配置）
    const agent = await this.ensureAgent()

    // 调用 Agent
    const result = await agent.structuredOutput<SceneMatchOutput>(prompt, SceneMatchSchema, {
      maxRetries: 3,
      timeout: 120000,
      temperature: 0.1 // 使用较低的温度以保证匹配的一致性
    })

    // 处理结果
    if (!result.success) {
      const error = result.error!
      throw new Error(`场景匹配失败: ${error.message} (类型: ${error.type})`)
    }

    // 过滤出相似度 >= 80 的匹配
    const filteredMatches = result.data!.matches.filter((match) => match.similarity >= 80)

    console.log(
      `[AgentSceneCharacterExtractor] 场景匹配完成，找到 ${filteredMatches.length} 个匹配，耗时 ${result.metadata.duration}ms`
    )

    return filteredMatches
  }

  /**
   * 匹配相似的角色
   */
  async matchSimilarCharacters(
    newCharacters: Array<{ name: string; description: string }>,
    historyCharacters: Array<{ id: string; name: string; description: string }>
  ): Promise<Array<{ newCharacterIndex: number; matchedCharacterId: string; similarity: number }>> {
    // 如果没有历史角色，直接返回空数组
    if (historyCharacters.length === 0) {
      return []
    }

    // 定义匹配结果的 Zod Schema
    const CharacterMatchSchema = z.object({
      matches: z.array(
        z.object({
          newCharacterIndex: z.number().describe('新角色在输入数组中的索引'),
          matchedCharacterId: z.string().describe('匹配到的历史角色的 ID'),
          similarity: z.number().min(0).max(100).describe('相似度评分（0-100）')
        })
      )
    })

    type CharacterMatchOutput = z.infer<typeof CharacterMatchSchema>

    // 构建提示词
    const prompt = this.CHARACTER_MATCH_PROMPT_TEMPLATE.replace(
      '{newCharacters}',
      JSON.stringify(newCharacters, null, 2)
    ).replace('{historyCharacters}', JSON.stringify(historyCharacters, null, 2))

    // 获取 agent 实例（实时读取配置）
    const agent = await this.ensureAgent()

    // 调用 Agent
    const result = await agent.structuredOutput<CharacterMatchOutput>(
      prompt,
      CharacterMatchSchema,
      {
        maxRetries: 3,
        timeout: 120000,
        temperature: 0.1 // 使用较低的温度以保证匹配的一致性
      }
    )

    // 处理结果
    if (!result.success) {
      const error = result.error!
      throw new Error(`角色匹配失败: ${error.message} (类型: ${error.type})`)
    }

    // 过滤出相似度 >= 80 的匹配
    const filteredMatches = result.data!.matches.filter((match) => match.similarity >= 80)

    console.log(
      `[AgentSceneCharacterExtractor] 角色匹配完成，找到 ${filteredMatches.length} 个匹配，耗时 ${result.metadata.duration}ms`
    )

    return filteredMatches
  }

  /**
   * 从章节中提取场景和角色
   */
  async extractScenesAndCharacters(
    chapter: Chapter,
    artStyle?: string
  ): Promise<SceneCharacterExtractResult> {
    console.log(`[AgentSceneCharacterExtractor] 开始提取章节场景和角色: ${chapter.title}`)

    // 使用传入的艺术风格或默认值
    const finalArtStyle = artStyle || '现代动漫风格'

    // 第一步：拆分场景并提取角色
    const sceneSegments = await this.splitChapterIntoScenes(chapter.content)
    console.log('@@@@场景拆分', sceneSegments)

    // 第二步：场景细化、角色细化、章节摘要、场景摘要并行执行
    const [refinedScenes, refinedCharacters, chapterSummary, sceneSummaries] = await Promise.all([
      this.refineScenes(sceneSegments, chapter.content, finalArtStyle),
      this.refineCharacters(sceneSegments, chapter.content, finalArtStyle),
      this.generateChapterSummary(chapter.content),
      this.generateSceneSummaries(sceneSegments)
    ])
    console.log('@@@@场景细化', refinedScenes)
    console.log('@@@@角色细化', refinedCharacters)
    console.log('@@@@章节摘要', chapterSummary)
    console.log('@@@@场景摘要', sceneSummaries)

    // 第三步：处理场景数据，将细化结果和原始分段数据映射到最终的场景数据结构
    const scenes: SceneExtractResult[] = refinedScenes.map((refinedScene, index) => {
      // 从场景名称中提取地点和时间
      const [location, atmosphere] = refinedScene.name.split('，').map((s) => s.trim())

      // 查找对应的原始场景分段，获取 story 和 characters
      const originalSegment = sceneSegments.find((seg) => seg.scene === refinedScene.name)
      if (!originalSegment) {
        throw new Error(`找不到场景 "${refinedScene.name}" 对应的原始分段数据`)
      }

      return {
        story: originalSegment.story,
        characters: originalSegment.characters,
        description: refinedScene.description,
        location: location || refinedScene.name,
        atmosphere: atmosphere || '未知',
        imagePrompt: refinedScene.prompt,
        summary: sceneSummaries[index]
      }
    })

    // 第四步：处理角色数据，将细化结果映射到最终的角色数据结构
    const characters: CharacterExtractResult[] = refinedCharacters.map((refinedCharacter) => {
      return {
        name: refinedCharacter.name,
        description: refinedCharacter.description,
        appearance: refinedCharacter.appearance,
        imagePrompt: refinedCharacter.prompt
      }
    })

    console.log(
      `[AgentSceneCharacterExtractor] 提取完成: ${scenes.length} 个场景, ${characters.length} 个角色`
    )

    return { scenes, characters, chapterSummary }
  }
}
