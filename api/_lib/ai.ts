// api/_lib/ai.ts
/**
 * AI 改写引擎 - OpenRouter 版本
 * 支持调用统计：每次调用记录 tokens、耗时、模型、状态
 */

// ============================================================
// Prompt（保持原有，不改动）
// ============================================================
const REWRITE_PROMPT = `你的角色与目标：
你现在扮演一个专业的"论文（或技术文档）修改助手"。你的核心任务是接收一段中文原文（通常是技术性或学术性的描述），并将其改写成一种特定的风格。这种风格的特点是：比原文稍微啰嗦、更具解释性、措辞上更偏向通俗或口语化（但保持专业底线），并且系统性地使用特定的替代词汇和句式结构。 你的目标是精确地模仿分析得出的修改模式，生成"修改后"风格的文本，同时务必保持原文的核心技术信息、逻辑关系和事实准确性，也不要添加过多的字数。
注意不要过于口语化（通常情况下不会过于口语化，有一些比如至于 xxx 呢，这种的不要有）
注意！你输出的内容不应原多于原文！应时刻记得字数和原文相符！
注意！不要有'xxx 呢'这种形式，如'至于 vue 呢'
不要第一人称
输入与输出：
输入： 一段中文原文（标记为"原文"）。
输出： 一段严格按照以下规则修改后的中文文本（标记为"修改后"）。
核心修改手法与规则（请严格遵守）：
增加冗余与解释性（Verbose Elaboration）：
动词短语扩展： 将简洁的动词或动词短语替换为更长的、带有动作过程描述的短语。
示例："管理" -> "开展...的管理工作" 或 "进行管理"
示例："交互" -> "进行交互" 或 "开展交互"
示例："配置" -> "进行配置"
示例："处理" -> "去处理...工作"
示例："恢复" -> "进行恢复"
示例："实现" -> "得以实现" 或 "来实现"
增加辅助词/结构： 在句子中添加语法上允许但非必需的词语，使句子更饱满。
示例：适当增加 "了"、"的"、"地"、"所"、"会"、"可以"、"这个"、"方面"、"当中" 等。
示例："提供功能" -> "有...功能" 或 "拥有...功能"
系统性词汇替换（Systematic Synonym/Phrasing Substitution）：
特定动词/介词/连词替换： 将原文中常用的某些词汇固定地替换为特定的替代词。这是模仿目标风格的关键。
采用 / 使用 -> 运用 / 选用 / 把...当作...来使用
基于 -> 鉴于 / 基于...来开展
利用 -> 借助 / 运用 / 凭借
通过 -> 借助 / 依靠 / 凭借
和 / 及 / 与 -> 以及 （尤其是在列举多项时）
并 -> 并且 / 还 / 同时
其 -> 它 / 其 （可根据语境选择，有时用"它"更口语化）
特定名词/形容词替换：
原因 -> 缘由 / 主要原因囊括...
符合 -> 契合
适合 -> 适宜
特点 -> 特性
提升 / 提高 -> 提高 / 提升 （可互换使用，保持多样性）
极大(地) -> 极大程度(上)
立即 -> 马上
括号内容处理（Bracket Content Integration/Removal）：
解释性括号： 对于原文中用于解释、举例或说明缩写的括号 (...) 或 （...）：
优先整合： 尝试将括号内的信息自然地融入句子，使用 "也就是"、"即"、"比如"、"像" 等引导词。
示例：ORM（对象关系映射） -> 对象关系映射即 ORM 或 ORM 也就是对象关系映射
示例：功能（如 ORM、Admin） -> 功能，比如 ORM、Admin 或 功能，像 ORM、Admin 等
谨慎省略： 如果整合后语句极其冗长或别扭，并且括号内容并非核心关键信息（例如，非常基础的缩写全称），可以考虑省略。但要极其小心，避免丢失重要上下文或示例。
代码/标识符旁括号： 对于紧跟在代码、文件名、类名旁的括号，通常直接移除括号。
示例：视图 (views.py) 中 -> 视图也就是 views.py 中
示例：权限类 (admin_panel.permissions) -> 权限类 admin_panel.permissions
句式微调与口语化倾向（Sentence Structure & Colloquial Touch）：
使用"把"字句： 在合适的场景下，倾向于使用"把"字句。
示例："会将对象移动" -> "会把对象移动"
条件句式转换： 将较书面的条件句式改为稍口语化的形式。
示例："若...，则..." -> "要是...，那就..." 或 "如果...，就..."
名词化与动词化转换： 根据需要进行调整，有时将名词性结构展开为动词性结构，反之亦然，以符合更自然的口语表达。
示例："为了将...解耦" -> "为了实现...的解耦"
增加语气词/连接词： 如在句首或句中添加"那么"、"这样"、"同时"等。
保持技术准确性（Maintain Technical Accuracy）：
绝对禁止修改： 所有的技术术语（如 Django, RESTful API, Ceph, RGW, S3, JWT, ORM, MySQL）、代码片段 (views.py, settings.py, accounts.CustomUser, .folder_marker）、库名 (Boto3, djangorestframework-simplejwt)、配置项(CEPH_STORAGE, DATABASES)、API 路径 (/accounts/api/token/refresh/) 等必须保持原样，不得修改或错误转写。
核心逻辑不变： 修改后的句子必须表达与原文完全相同的技术逻辑、因果关系和功能描述。
执行指令：
请根据以上所有规则，对接下来提供的"原文"进行修改，生成符合上述特定风格的"修改后"文本。务必仔细揣摩每个规则的细节和示例，力求在风格上高度一致。注意不要过于口语化（通常情况下不会过于口语化，有一些比如至于 xxx 呢，这种的不要有）注意！你输出的内容不应原多于原文！应时刻记得字数和原文相符！注意！不要有'xxx 呢'这种形式，如'至于 vue 呢'
不要第一人称
直接输出修改后的文本，不要加任何前言、标记或说明。
原文如下：
`;

// ============================================================
// 调用统计类型定义
// ============================================================
export interface AICallStats {
  jobId: string;
  userId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

// ============================================================
// OpenRouter 调用核心函数
// ============================================================
async function callOpenRouterAPI(
  text: string,
  jobId?: string
): Promise<{ result: string; stats: AICallStats }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-3-flash-preview';
  const siteUrl = process.env.SITE_URL || 'https://react-rewrite-application-architecture-mkd5cflfm.vercel.app/';

  if (!apiKey) {
    throw new Error('未配置 OPENROUTER_API_KEY');
  }

  const startTime = Date.now();

  const requestBody = {
    model: model,
    messages: [
      {
        role: 'system',
        content: REWRITE_PROMPT,
      },
      {
        role: 'user',
        content: text,
      },
    ],
    // OpenRouter 特有参数
    reasoning_effort: 'medium',   // 中等推理强度
    temperature: 1,               // 默认温度
    max_tokens: 8192,             // 足够处理 3000 字的输出
    stream: false,                // 非流式，Vercel Serverless 更兼容
  };

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': siteUrl,
        'X-Title': '学术改写引擎',   // 在 OpenRouter 后台显示的应用名
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (networkErr) {
    const durationMs = Date.now() - startTime;
    const stats: AICallStats = {
      jobId: jobId || 'unknown',
      model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      durationMs,
      success: false,
      error: '网络连接失败',
      timestamp: new Date().toISOString(),
    };
    console.error('[OpenRouter] 网络错误:', networkErr);
    throw Object.assign(new Error('OpenRouter 网络连接失败'), { stats });
  }

  const durationMs = Date.now() - startTime;

  if (!response.ok) {
    const errBody = await response.text().catch(() => '无法读取错误信息');
    console.error('[OpenRouter API Error]', response.status, errBody);

    const stats: AICallStats = {
      jobId: jobId || 'unknown',
      model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      durationMs,
      success: false,
      error: `HTTP ${response.status}: ${errBody.slice(0, 200)}`,
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(
      new Error(`OpenRouter API 调用失败 (${response.status})`),
      { stats }
    );
  }

  const data = await response.json();

  // 提取结果文本
  const resultText = data?.choices?.[0]?.message?.content;
  if (!resultText) {
    const stats: AICallStats = {
      jobId: jobId || 'unknown',
      model,
      inputTokens: data?.usage?.prompt_tokens || 0,
      outputTokens: data?.usage?.completion_tokens || 0,
      totalTokens: data?.usage?.total_tokens || 0,
      durationMs,
      success: false,
      error: 'API 返回内容为空',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error('OpenRouter API 返回内容为空'), { stats });
  }

  // 提取 Token 使用量（OpenRouter 兼容 OpenAI 格式）
  const inputTokens = data?.usage?.prompt_tokens || 0;
  const outputTokens = data?.usage?.completion_tokens || 0;
  const totalTokens = data?.usage?.total_tokens || 0;

  const stats: AICallStats = {
    jobId: jobId || 'unknown',
    model: data?.model || model,  // 使用 API 返回的实际模型名
    inputTokens,
    outputTokens,
    totalTokens,
    durationMs,
    success: true,
    timestamp: new Date().toISOString(),
  };

  // 打印统计日志（在 Vercel Functions 日志中可见）
  console.log(
    `[OpenRouter Stats] jobId=${jobId} model=${stats.model} ` +
    `tokens=${inputTokens}+${outputTokens}=${totalTokens} ` +
    `duration=${durationMs}ms success=true`
  );

  return { result: resultText.trim(), stats };
}

// ============================================================
// Mock 模式（无 API Key 时使用）
// ============================================================
const REPLACEMENTS: Record<string, string> = {
  '因此': '所以', '然而': '不过', '此外': '另外',
  '首先': '第一', '其次': '第二', '最后': '最终',
  '显著': '明显', '有效': '切实', '实现': '达成',
  '进行': '开展', '提供': '给予', '包括': '涵盖',
  '通过': '借助', '利用': '运用', '基于': '依托',
  '针对': '面向', '提高': '提升', '增加': '增多',
  '减少': '降低', '可以': '能够', '具有': '拥有',
  '使用': '运用', '开发': '研发', '设计': '规划',
  '分析': '剖析', '研究': '探究', '方法': '手段',
};

async function callMockAI(text: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000));
  let result = text;
  for (const [from, to] of Object.entries(REPLACEMENTS)) {
    if (Math.random() < 0.6) {
      result = result.replaceAll(from, to);
    }
  }
  return result;
}

// ============================================================
// 对外暴露的主函数（供 api/rewrite/status/[jobId].ts 调用）
// ============================================================
export async function callRewriteAI(
  text: string,
  jobId?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (apiKey && apiKey.trim() !== '') {
    console.log(`[AI] 使用 OpenRouter API 改写，jobId=${jobId}`);
    const { result } = await callOpenRouterAPI(text, jobId);
    return result;
  }

  console.log('[AI] 使用 Mock 改写（未配置 OPENROUTER_API_KEY）');
  return callMockAI(text);
}