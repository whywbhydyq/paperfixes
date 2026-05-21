export interface ContentInsight {
  topic: string;
  intent: '工具选择' | '方法寻找' | '检测报告' | '毕业论文' | '专业场景' | '风险顾虑' | '免费试用' | '原理科普';
  keyword: string;
  angle: string;
}

export const contentInsights: ContentInsight[] = [
  { topic: '论文AI率高怎么办', intent: '方法寻找', keyword: '论文AI率高怎么办', angle: '先定位高风险段落，再分段优化表达' },
  { topic: 'AIGC检测率怎么降低', intent: '方法寻找', keyword: 'AIGC检测率降低', angle: '强调句式重构、细节补充和人工复核' },
  { topic: 'AI论文降重工具怎么选', intent: '工具选择', keyword: 'AI论文降重工具', angle: '比较术语保护、字数控制、隐私和失败退还' },
  { topic: '免费AI论文降重是否靠谱', intent: '免费试用', keyword: '免费AI论文降重', angle: '引导先用典型段落测试，而不是整篇盲改' },
  { topic: 'ChatGPT写论文会被检测吗', intent: '风险顾虑', keyword: 'ChatGPT论文检测', angle: '解释通用段落、模板表达和缺少研究细节的风险' },
  { topic: '知网/维普/万方AIGC检测差异', intent: '检测报告', keyword: 'AIGC检测平台差异', angle: '提醒不同工具阈值不同，不要迷信单次结果' },
  { topic: 'AIGC检测报告怎么看', intent: '检测报告', keyword: 'AIGC检测报告', angle: '看章节分布和高风险段落，而不是只看总分' },
  { topic: '摘要AI率高怎么办', intent: '毕业论文', keyword: '摘要AI率高', angle: '按目的、方法、结果、结论重写结构' },
  { topic: '引言AI率高怎么办', intent: '毕业论文', keyword: '引言AI率高', angle: '减少研究意义套话，补充选题背景' },
  { topic: '结论AI率高怎么办', intent: '毕业论文', keyword: '结论AI率高', angle: '加入实验结果和局限性，不写万能总结' },
  { topic: '文献综述如何降AI率', intent: '毕业论文', keyword: '文献综述降AI率', angle: '保留引用归属，避免把他人观点改成自己的判断' },
  { topic: '本科毕业论文降AI率', intent: '毕业论文', keyword: '本科论文AI率', angle: '优先处理摘要、引言、研究意义和总结' },
  { topic: '硕士论文降AI率', intent: '毕业论文', keyword: '硕士论文AI率', angle: '保护逻辑链、研究问题和方法路线' },
  { topic: '计算机论文改写', intent: '专业场景', keyword: '计算机论文AI降重', angle: '保护代码名、框架名、API、变量名' },
  { topic: '医学论文改写', intent: '专业场景', keyword: '医学论文AI率', angle: '疾病名、药物名、指标和结论不能改错' },
  { topic: '理工科论文AI化表达', intent: '专业场景', keyword: '理工科论文降AI率', angle: '补充实验条件、参数说明和异常分析' },
  { topic: '技术文档AI改写', intent: '专业场景', keyword: '技术文档AI改写', angle: '保持接口字段和配置项准确' },
  { topic: 'AI降重和论文润色区别', intent: '原理科普', keyword: 'AI降重和论文润色', angle: '区分检测特征优化与语言质量优化' },
  { topic: '论文查重和AI检测区别', intent: '原理科普', keyword: '重复率和AI率区别', angle: '查重看相似度，AI检测看生成特征' },
  { topic: 'AI文本痕迹有哪些', intent: '原理科普', keyword: 'AI文本痕迹', angle: '通用句、空泛句、结构过整齐' },
  { topic: '机器化表达怎么改', intent: '方法寻找', keyword: '机器化表达优化', angle: '改变句子节奏，减少模板连接词' },
  { topic: '论文表达自然化', intent: '方法寻找', keyword: '论文表达自然化', angle: '增加真实研究语境和作者判断' },
  { topic: '如何避免术语被改错', intent: '风险顾虑', keyword: '论文术语保护', angle: '列出不可改内容清单' },
  { topic: '降AI率会不会影响质量', intent: '风险顾虑', keyword: '论文降AI率风险', angle: '强调原意、引用和数据复核' },
  { topic: 'AI检测工具准不准', intent: '风险顾虑', keyword: 'AI检测工具准确率', angle: '解释误判和不同平台差异' },
  { topic: '检测结果不一致怎么办', intent: '检测报告', keyword: 'AI检测结果不一致', angle: '关注共同高风险段落，不追求单一分数' },
  { topic: '如何分段降AI率', intent: '方法寻找', keyword: '分段降AI率', angle: '按摘要、引言、方法、结果、结论分批处理' },
  { topic: '降AI率后如何复核', intent: '检测报告', keyword: '论文改写后复核', angle: '检查原意、术语、数据、引用和衔接' },
  { topic: '如何选择高风险段落测试', intent: '免费试用', keyword: '免费降AI率测试', angle: '先选摘要、引言或检测报告红色段落' },
  { topic: '免费试用怎么用最划算', intent: '免费试用', keyword: 'AI降重免费试用', angle: '三次免费分别测试摘要、专业段落和高风险段落' },
  { topic: '论文AI率多少算高', intent: '检测报告', keyword: '论文AI率多少算高', angle: '提醒以学校和平台要求为准' },
  { topic: '学校查AI率怎么办', intent: '风险顾虑', keyword: '学校查AI率', angle: '合规使用工具，保留研究过程和人工修改' },
  { topic: 'AI改写算不算学术不端', intent: '风险顾虑', keyword: 'AI改写学术诚信', angle: '工具服务表达，不替代研究和引用' },
  { topic: '英文论文AI检测', intent: '专业场景', keyword: '英文论文AI检测', angle: '区分中英文表达习惯和非母语误判风险' },
  { topic: '中文论文AI检测', intent: '专业场景', keyword: '中文论文AI检测', angle: '中文句式节奏和连接词是优化重点' },
  { topic: '降低ChatGPT痕迹', intent: '方法寻找', keyword: '降低ChatGPT痕迹', angle: '减少万能总结和过度平滑表达' },
  { topic: '论文AI率检测前准备', intent: '检测报告', keyword: 'AI检测前准备', angle: '清理参考文献、代码块、目录和无关格式' },
  { topic: '降AI率失败怎么办', intent: '风险顾虑', keyword: '降AI率失败', angle: '重新选择段落、调整长度、人工补充细节' },
  { topic: 'AIGC检测原理', intent: '原理科普', keyword: 'AIGC检测原理', angle: '解释概率分布、句式规律和语义平滑' },
  { topic: 'AI检测为什么会误判', intent: '原理科普', keyword: 'AI检测误判', angle: '模板化人工写作也可能被标高' }
];

export const featuredIntentKeywords = [
  '论文AI率高怎么办',
  '降低AIGC检测率',
  'AI论文降重工具',
  'AIGC检测报告怎么看',
  'ChatGPT论文检测',
  '免费AI论文降重',
  '计算机论文改写',
  '论文改写后复核'
];
