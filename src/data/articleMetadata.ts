import { toInternalArticleSlug } from './articleSlugMap';

export interface ArticleMetadata {
  internalSlug: string;
  publicSlug: string;
  title: string;
  description: string;
  updatedAt: string;
  faqs: Array<{ question: string; answer: string }>;
}

export const articleMetadata = [
  {
    "internalSlug": "ai-lunwen-jiangchong-gongju",
    "publicSlug": "ai-lunwen-jiangchong-gongju",
    "title": "AI论文降重工具怎么选？从改写质量、术语保护和安全性判断",
    "description": "选择AI论文降重工具时，不只看是否能降AI率，还要关注技术术语保护、字数控制、隐私安全和失败退还机制。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "AI论文降重工具能保证检测通过吗？",
        "answer": "不建议相信“保证通过”的承诺。检测结果受检测平台、文本主题和人工修改程度影响，合理做法是工具改写后再人工复核。"
      },
      {
        "question": "降重后还需要自己改吗？",
        "answer": "建议需要。尤其是摘要、结论、创新点和实验描述，最好结合自己的研究内容再检查一遍。"
      }
    ]
  },
  {
    "internalSlug": "jiangdi-aigc-jiance-lv-fangfa",
    "publicSlug": "jiangdi-aigc-jiance-lv-fangfa",
    "title": "降低AIGC检测率的实用方法：不是简单替换近义词",
    "description": "降低AIGC检测率需要从句式、逻辑连接、表达节奏和专业术语保护入手，单纯近义词替换往往效果有限。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "降低AIGC检测率和论文降重一样吗？",
        "answer": "不完全一样。论文降重偏向重复率，AIGC 检测偏向机器生成特征，两者需要不同的改写策略。"
      },
      {
        "question": "一次改写整篇论文好吗？",
        "answer": "不建议。更稳妥的方法是按章节或段落处理，尤其是方法、实验和结论部分要逐段复核。"
      }
    ]
  },
  {
    "internalSlug": "lunwen-ai-lv-gao-zenmeban",
    "publicSlug": "lunwen-ai-lv-gao-zenmeban",
    "title": "论文AI率高怎么办？先判断原因，再分段优化表达",
    "description": "论文AI率高可能来自模板化表达、过度平滑的句式、缺少个人研究细节。建议先定位高风险段落，再分段改写。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "AI率高的段落都要删除吗？",
        "answer": "不需要。多数情况下只需要重构表达、加入研究细节和人工复核。"
      },
      {
        "question": "摘要AI率高怎么办？",
        "answer": "摘要要保留研究目的、方法、结果和结论，不要只写泛泛的价值描述。可以先重写结构，再做表达优化。"
      }
    ]
  },
  {
    "internalSlug": "aigc-jiance-yuanli-jianming",
    "publicSlug": "aigc-jiance-yuanli-jianming",
    "title": "AIGC检测原理简明解释：为什么有些文本容易被判为AI生成",
    "description": "AIGC检测通常关注文本概率、句式规律、词汇分布和语义连贯模式。理解原理后，才能更合理地优化论文表达。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "人工写的论文会被判AI吗？",
        "answer": "有可能。模板化、通用化、缺少具体研究细节的文本，即使人工写作也可能出现较高风险。"
      },
      {
        "question": "理解检测原理有什么用？",
        "answer": "可以帮助你避免无效改写，把重点放在句式重构、细节补充和逻辑自然化上。"
      }
    ]
  },
  {
    "internalSlug": "chatgpt-lunwen-hui-bei-jiance-ma",
    "publicSlug": "chatgpt-lunwen-hui-bei-jiance-ma",
    "title": "ChatGPT写论文会被检测吗？风险来自表达模式和内容空泛",
    "description": "ChatGPT辅助写论文可能被检测出AI特征，尤其是背景、意义、总结等通用段落。建议保留个人研究细节并进行人工改写。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "ChatGPT生成的内容一定会被查出来吗？",
        "answer": "不一定，但直接使用高风险很大，尤其是通用段落和套话较多的内容。"
      },
      {
        "question": "可以完全不用AI吗？",
        "answer": "可以。AI更适合辅助理解和表达优化，关键学术判断仍应由作者完成。"
      }
    ]
  },
  {
    "internalSlug": "ai-jiangchong-he-lunwen-runse-qubie",
    "publicSlug": "ai-jiangchong-he-lunwen-runse-qubie",
    "title": "AI降重和论文润色有什么区别？目标、方法和使用场景不同",
    "description": "AI降重关注重复率和AI检测特征，论文润色关注语法、流畅度和表达质量。实际写作中两者可以配合使用。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "论文润色能降低AI率吗？",
        "answer": "不一定。润色可能让文本更规范，有时反而更像机器生成，需要结合句式重构。"
      },
      {
        "question": "降重会影响论文质量吗？",
        "answer": "如果工具不保护术语或乱改逻辑，会影响质量。因此必须对照原文复核。"
      }
    ]
  },
  {
    "internalSlug": "xueshu-gai写-zhuyishixiang",
    "publicSlug": "xueshu-gaixie-zhuyishixiang",
    "title": "学术改写注意事项：不要让降重破坏论文逻辑",
    "description": "学术改写要遵守原意不变、术语不乱改、引用不丢失、逻辑不跳跃四个原则，避免为了降重牺牲论文质量。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "学术改写算不算抄袭？",
        "answer": "如果只是换词但不标注来源，仍可能存在问题。引用他人观点时应保留引用，自己的研究表达可以优化。"
      },
      {
        "question": "改写后需要查重吗？",
        "answer": "建议需要。改写后再次检测可以帮助发现仍然风险较高的段落。"
      }
    ]
  },
  {
    "internalSlug": "jisuanji-lunwen-gai写-jishu-shuyu",
    "publicSlug": "jisuanji-lunwen-gaixie-jishu-shuyu",
    "title": "计算机论文改写指南：代码名、框架名和技术术语不能乱改",
    "description": "计算机论文改写要特别保护框架名、接口名、文件名、变量名和缩写，避免为了降重导致技术表达错误。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "计算机论文可以批量改写吗？",
        "answer": "可以分段处理，但不要一次处理包含大量代码和公式的长文本。"
      },
      {
        "question": "英文缩写需要翻译吗？",
        "answer": "通常不需要。除非原文有解释性括号，否则缩写应保持不变。"
      }
    ]
  },
  {
    "internalSlug": "yixue-lunwen-gai写-anquan",
    "publicSlug": "yixue-lunwen-gaixie-anquan",
    "title": "医学论文改写要注意什么？准确性比文字变化更重要",
    "description": "医学论文改写必须保护疾病名称、药物名称、指标数值和研究结论，不能为了降低AI率改变医学事实。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "医学论文能用AI降重吗？",
        "answer": "可以辅助表达优化，但必须人工复核，不能把工具结果直接作为最终稿。"
      },
      {
        "question": "药物名能不能改成通俗说法？",
        "answer": "论文中通常不建议。专业名称应保持准确，必要时可在解释性语句中补充说明。"
      }
    ]
  },
  {
    "internalSlug": "ligongke-lunwen-aihua-biaoda",
    "publicSlug": "ligongke-lunwen-aihua-biaoda",
    "title": "理工科论文如何降低AI化表达？从实验过程和结果解释入手",
    "description": "理工科论文降低AI化表达，应补充实验细节、参数说明、异常分析和结果解释，而不是简单替换专业词。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "公式和数据可以改写吗？",
        "answer": "不建议改动公式和数据。可以改写解释文字，但数值、符号和结论必须一致。"
      },
      {
        "question": "实验过程写得越详细越好吗？",
        "answer": "要适度。关键是补充与研究结论相关的条件和观察，不要堆无关细节。"
      }
    ]
  },
  {
    "internalSlug": "lunwen-biaoda-ziranhua-jiqiao",
    "publicSlug": "lunwen-biaoda-ziranhua-jiqiao",
    "title": "论文表达自然化技巧：让学术文本不再像模板生成",
    "description": "论文表达自然化可以通过句式变化、连接方式调整、细节补充和段落节奏优化实现，避免模板化表达。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "论文表达自然化会不会变口语？",
        "answer": "不应该。目标是更自然的学术表达，而不是聊天式口语。"
      },
      {
        "question": "自然化和降AI率有关吗？",
        "answer": "有关。机器化表达减少后，文本通常更符合人工写作特征。"
      }
    ]
  },
  {
    "internalSlug": "ai-wenben-henji-youhua",
    "publicSlug": "ai-wenben-henji-youhua",
    "title": "AI文本痕迹如何优化？重点看通用句、空泛句和过度总结",
    "description": "AI文本痕迹常表现为通用套话、结构过整齐、缺少细节和过度总结。优化时要补充语境并重构表达。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "AI痕迹优化是不是越复杂越好？",
        "answer": "不是。过度复杂会影响可读性，关键是具体、准确、自然。"
      },
      {
        "question": "所有套话都要删吗？",
        "answer": "不必。可以保留必要学术表达，但要补充具体对象和依据。"
      }
    ]
  },
  {
    "internalSlug": "lunwen-jiangai-gongju-shiyongliucheng",
    "publicSlug": "lunwen-jiangai-gongju-shiyongliucheng",
    "title": "论文降AI工具使用流程：提交前、改写中、完成后三步检查",
    "description": "使用论文降AI工具时，建议先清理文本、分段改写，再对照结果检查术语、引用、逻辑和字数。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "整篇上传会更省事吗？",
        "answer": "省事但风险更高。分段处理更容易控制质量。"
      },
      {
        "question": "改写失败扣额度吗？",
        "answer": "PaperFix 的设计是处理失败自动退还额度，适合先小段测试。"
      }
    ]
  },
  {
    "internalSlug": "benke-biye-lunwen-ai-lv-jiangdi",
    "publicSlug": "benke-biye-lunwen-ai-lv-jiangdi",
    "title": "本科毕业论文AI率怎么降低？先处理摘要、引言和总结",
    "description": "本科毕业论文AI率偏高，常见于摘要、引言、研究意义和总结部分。建议优先优化这些模板化段落。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "本科论文AI率多少算安全？",
        "answer": "不同学校和平台标准不同，应以学校要求为准。工具只能帮助优化表达。"
      },
      {
        "question": "改写摘要要注意什么？",
        "answer": "摘要要保留目的、方法、结果和结论，不要改成泛泛介绍。"
      }
    ]
  },
  {
    "internalSlug": "shuoboshi-lunwen-gai写-shendu",
    "publicSlug": "shuoboshi-lunwen-gaixie-shendu",
    "title": "硕博论文改写更要重视逻辑链：不要只改表面文字",
    "description": "硕博论文篇幅长、逻辑链复杂，改写时要保护研究问题、方法路线、实验证据和结论之间的关系。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "硕博论文能批量降AI吗？",
        "answer": "可以分章节处理，但每章都需要人工复核，尤其是方法和实验部分。"
      },
      {
        "question": "文献综述怎么改写？",
        "answer": "要保留引用和观点归属，不能把别人的研究结论改成自己的判断。"
      }
    ]
  },
  {
    "internalSlug": "zhongyingwen-lunwen-ai-jiance-chayi",
    "publicSlug": "zhongyingwen-lunwen-ai-jiance-chayi",
    "title": "中文论文和英文论文的AI检测差异：改写策略也不同",
    "description": "中文论文和英文论文在句式、连接词和术语表达上差异明显，降低AI检测率时应采用不同策略。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "中文论文能直接翻译成英文再降重吗？",
        "answer": "不建议。翻译会改变表达结构，最好分别按语言习惯处理。"
      },
      {
        "question": "英文论文能用中文工具处理吗？",
        "answer": "除非工具明确支持英文，否则可能无法保护英文术语和语法结构。"
      }
    ]
  },
  {
    "internalSlug": "lunwen-chachong-he-ai-jiance-qubie",
    "publicSlug": "lunwen-chachong-he-ai-jiance-qubie",
    "title": "论文查重和AI检测有什么区别？重复率不等于AI率",
    "description": "论文查重主要关注文本相似度，AI检测关注机器生成特征。重复率低不代表AI率低，二者需要分别优化。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "重复率低但AI率高正常吗？",
        "answer": "正常。原创文本如果很模板化，也可能被AI检测标高。"
      },
      {
        "question": "降AI率会影响查重吗？",
        "answer": "通常会有帮助，但不是绝对。改写后仍建议重新检测。"
      }
    ]
  },
  {
    "internalSlug": "aigc-jiance-baogao-kanfa",
    "publicSlug": "aigc-jiance-baogao-kanfa",
    "title": "AIGC检测报告怎么看？重点不是总分，而是高风险段落",
    "description": "阅读AIGC检测报告时，应重点关注高风险段落、重复出现的表达模式和章节分布，而不是只看总分。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "只看总AI率够吗？",
        "answer": "不够。总分只能反映整体风险，不能告诉你具体该改哪里。"
      },
      {
        "question": "报告结果不同怎么办？",
        "answer": "不同平台结果可能不同，建议关注共同标出的高风险段落。"
      }
    ]
  },
  {
    "internalSlug": "jishu-wendang-ai-gai写",
    "publicSlug": "jishu-wendang-ai-gaixie",
    "title": "技术文档AI改写指南：保持准确、降低模板感",
    "description": "技术文档改写要保护接口名、参数名、配置项和代码片段，同时优化说明文字的自然度和可读性。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "技术文档需要降AI率吗？",
        "answer": "如果文档用于课程、项目报告或公开发布，优化机器化表达有助于提升可信度。"
      },
      {
        "question": "代码块可以改写吗？",
        "answer": "一般不建议。代码块应保持原样，最多优化代码前后的解释文字。"
      }
    ]
  },
  {
    "internalSlug": "mianfei-ai-lunwen-jiangchong",
    "publicSlug": "mianfei-ai-lunwen-jiangchong",
    "title": "免费AI论文降重怎么用更稳？先用小段测试效果",
    "description": "免费AI论文降重适合先测试工具质量。建议选择典型段落，检查术语、逻辑和字数，再决定是否批量处理。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "免费工具够用吗？",
        "answer": "如果只是测试效果，免费额度通常够用；如果要处理整篇论文，可能需要更多额度。"
      },
      {
        "question": "免费试用会影响隐私吗？",
        "answer": "PaperFix 会保存提交的原文、处理结果和任务状态，以便账号查看最近 50 条历史记录。请勿提交个人敏感信息、未公开科研数据或其他无权处理的内容。"
      }
    ]
  },
  {
    "internalSlug": "lunwen-jiangai-lv-changjian-wuqu",
    "publicSlug": "lunwen-jiangai-lv-changjian-wuqu",
    "title": "降低论文AI率的常见误区：别把好论文改成坏论文",
    "description": "降低论文AI率时，常见误区包括乱换术语、过度口语化、删除引用、整篇机器改写和不复核结果。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "论文越口语化AI率越低吗？",
        "answer": "不一定，而且会影响论文规范。目标是自然的学术表达，不是口语化。"
      },
      {
        "question": "降AI率会不会被老师发现？",
        "answer": "如果改写导致逻辑不通或术语错误，反而更容易被发现。质量复核很重要。"
      }
    ]
  },
  {
    "internalSlug": "lunwen-gai写-hou-ruhe-fuhe",
    "publicSlug": "lunwen-gaixie-hou-ruhe-fuhe",
    "title": "论文改写后如何复核？五个检查点避免质量下降",
    "description": "论文改写后应检查原意、术语、数据、引用和段落衔接，避免为了降低AI率造成内容错误。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "复核需要多久？",
        "answer": "取决于篇幅。建议至少按章节检查，不要只看改写后的表面流畅度。"
      },
      {
        "question": "改写后可以直接提交吗？",
        "answer": "不建议。最好先复核，再根据学校要求重新检测。"
      }
    ]
  },
  {
    "internalSlug": "aigc-lunwen-youhua-he-xueshuchengxin",
    "publicSlug": "aigc-lunwen-youhua-he-xueshuchengxin",
    "title": "AIGC论文优化与学术诚信：工具应服务表达，而不是替代研究",
    "description": "AIGC论文优化应遵守学术诚信，工具可以帮助表达优化，但不能替代研究过程、数据分析和原创判断。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "用AI工具改写论文违规吗？",
        "answer": "要看学校或机构规定。一般来说，表达辅助和语言优化相对常见，但必须遵守具体要求。"
      },
      {
        "question": "工具能代替自己写论文吗？",
        "answer": "不能。工具只能辅助表达，研究设计、数据分析和学术判断必须由作者完成。"
      }
    ]
  },
  {
    "internalSlug": "paperfix-shiyong-zhinan",
    "publicSlug": "paperfix-shiyong-zhinan",
    "title": "PaperFix使用指南：三次免费体验如何发挥最大价值",
    "description": "PaperFix新用户注册即送3次免费体验。建议先选择高风险段落测试，再根据结果决定后续处理策略。",
    "updatedAt": "2026-05-21",
    "faqs": [
      {
        "question": "PaperFix免费几次？",
        "answer": "新用户注册即送 3 次免费体验额度。"
      },
      {
        "question": "适合整篇论文吗？",
        "answer": "建议先用免费额度测试，再按章节分段处理整篇论文。"
      }
    ]
  }
] satisfies ArticleMetadata[];

export function getArticleMetadataByPublicSlug(slug?: string): ArticleMetadata | undefined {
  if (!slug) return undefined;
  const internalSlug = toInternalArticleSlug(slug);
  return articleMetadata.find((article) => article.internalSlug === internalSlug);
}
