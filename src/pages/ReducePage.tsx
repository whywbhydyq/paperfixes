import { useState, useCallback, useEffect } from 'react';
import JobPoller from '../components/JobPoller';
import { Send, RotateCcw, AlertCircle, FileUp, Info, Check, Copy, FileText, Sparkles, ArrowRight, Gift, Wand2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { submitRewriteJob } from '../lib/api';
import { trackEvent } from '../lib/analytics';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function fetchPlanMaxChars(plan: string, token: string | null): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/api/admin?resource=config`);
    const data = await res.json();
    if (data.plans) {
      const found = data.plans.find((p: { planKey: string; maxChars: number }) => p.planKey === plan);
      if (found) return found.maxChars;
    }
  } catch {}
  const defaults: Record<string, number> = { free: 500, basic: 3000, pro: 5000 };
  return defaults[plan] ?? 500;
}

type Phase = 'input' | 'processing' | 'done';

const MIN_CHARS = 40;
const SAMPLE_TEXT = '随着人工智能生成内容技术的快速发展，AIGC 在论文写作中的应用越来越广泛。虽然该技术能够提高文本生成效率，但也容易导致论文表达出现模板化、概括化和机器化的问题。因此，本文从文本表达优化角度出发，对相关内容进行分析，并提出一种更自然的学术表达改写思路。';

const countChars = (s: string) => s.replace(/\s/g, '').length;

export default function ReducePage() {
  const { isLoggedIn, user, token, openLoginModal, updateQuota, activeJob, setActiveJob, clearActiveJob, inputText: savedText, saveInputText, clearInputText } = useAuthStore();
  const [text, setText] = useState(savedText || '');
  const [phase, setPhase] = useState<Phase>('input');
  const [jobId, setJobId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState('');
  const [outputLen, setOutputLen] = useState(0);
  const [copied, setCopied] = useState(false);
  const [MAX_CHARS, setMaxChars] = useState(500);

  useEffect(() => {
    fetchPlanMaxChars(user?.plan ?? 'free', token).then(setMaxChars);
  }, [user?.plan, token]);

  useEffect(() => {
    if (activeJob) {
      if (activeJob.phase === 'processing' && activeJob.jobId) {
        setPhase('processing');
        setJobId(activeJob.jobId);
      } else if (activeJob.phase === 'done' && activeJob.result) {
        setPhase('done');
        setResult(activeJob.result);
        setOutputLen(activeJob.outputLen ?? 0);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const charCount = countChars(text);
  const isOverLimit = charCount > MAX_CHARS;
  const progress = Math.min(100, Math.round((charCount / MAX_CHARS) * 100));

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    saveInputText(e.target.value);
  };

  const fillSampleText = () => {
    setText(SAMPLE_TEXT);
    saveInputText(SAMPLE_TEXT);
    setError('');
    trackEvent('sample_text_fill', { char_count: countChars(SAMPLE_TEXT) });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    trackEvent('file_upload_attempt', { name_ext: file.name.split('.').pop() || 'unknown' });
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) { setError('目前仅支持 .txt 和 .md 文件'); trackEvent('file_upload_rejected'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
      setError('');
      trackEvent('file_upload_success', { char_count: countChars(content) });
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    const charCount = countChars(text);
    setError('');
    if (!text.trim()) { setError('先粘贴一段需要优化的论文文本，或点击“试用示例文本”。'); trackEvent('rewrite_submit_blocked', { reason: 'empty' }); return; }
    if (charCount < MIN_CHARS) { setError(`文本有点短，请至少输入 ${MIN_CHARS} 个有效字符。`); trackEvent('rewrite_submit_blocked', { reason: 'too_short', char_count: charCount }); return; }
    if (isOverLimit) { setError(`当前套餐单次最多 ${MAX_CHARS} 字，请精简文本或升级套餐。`); trackEvent('rewrite_submit_blocked', { reason: 'too_long', char_count: charCount, max_chars: MAX_CHARS }); return; }
    if (!isLoggedIn) { trackEvent('free_trial_click', { source: 'rewrite_submit', char_count: charCount }); openLoginModal(); return; }
    if ((user?.quota ?? 0) <= 0) { setError('你的免费额度已用完，可以前往定价页购买更多改写额度。'); trackEvent('quota_exhausted', { source: 'rewrite_submit', plan: user?.plan || 'unknown', total_used: user?.totalUsed ?? 0 }); return; }
    trackEvent((user?.totalUsed ?? 0) === 0 ? 'first_submit' : 'rewrite_submit', { char_count: charCount, plan: user?.plan || 'unknown', quota_before: user?.quota ?? 0 });
    setSubmitting(true);
    try {
      const data = await submitRewriteJob(text.trim(), token);
      setJobId(data.jobId);
      setPhase('processing');
      setActiveJob({ jobId: data.jobId, phase: 'processing' });
      updateQuota(data.quota, user!.totalUsed + 1);
      trackEvent('rewrite_submit_success', { job_id: data.jobId, quota_after: data.quota, char_count: charCount });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '提交失败，请稍后再试';
      trackEvent('rewrite_submit_fail', { error: message, char_count: charCount });
      setError(message);
    } finally { setSubmitting(false); }
  };

  const handleComplete = useCallback((res: string, _inputLen: number, outLen: number) => {
    setResult(res);
    setOutputLen(outLen);
    setPhase('done');
    setActiveJob({ jobId, phase: 'done', result: res, outputLen: outLen });
    trackEvent('rewrite_done', { job_id: jobId, output_len: outLen });
  }, [jobId, setActiveJob]);

  const handleError = useCallback((err: string) => {
    trackEvent('rewrite_processing_fail', { job_id: jobId, error: err });
    setError(err); setPhase('input'); clearActiveJob();
  }, [clearActiveJob, jobId]);

  const handleReset = () => {
    trackEvent('rewrite_reset');
    setText(''); setResult(''); setJobId(''); setPhase('input'); setError('');
    setOutputLen(0); clearActiveJob(); clearInputText();
  };

  const handleCopyResult = () => {
    navigator.clipboard.writeText(result).then(() => {
      trackEvent('rewrite_result_copy', { output_len: outputLen });
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTrialPromptClick = () => {
    trackEvent('free_trial_click', { source: 'top_prompt' });
    openLoginModal();
  };

  const isEditable = phase === 'input';

  return (
    <div className="min-h-screen overflow-hidden bg-gray-50/70">
      <div className="mx-auto max-w-7xl px-6 py-5 lg:py-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={handleTrialPromptClick}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-primary-100 bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm transition-colors hover:bg-primary-50"
          >
            <Gift size={15} /> 新用户 3 次免费体验
            {!isLoggedIn && <ArrowRight size={14} />}
          </button>
          {isLoggedIn && (
            <div className="text-sm text-gray-500">
              剩余额度：<span className="font-semibold text-primary-600">{user?.quota ?? 0}</span> 次
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <FileText size={15} />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{isEditable ? '输入论文段落' : '原文'}</div>
                <div className="text-xs text-gray-400">建议优先处理摘要、引言、结论等高风险段落</div>
              </div>
              {isEditable && (
                <span className={`ml-auto text-xs font-semibold ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
                  {charCount}/{MAX_CHARS} 字
                </span>
              )}
            </div>
            {isEditable ? (
              <>
                <textarea
                  value={text}
                  onChange={handleTextChange}
                  placeholder={"粘贴需要降低 AI 味的论文段落，例如摘要、引言、文献综述或结论。\n\n建议：一次处理一个自然段，改写后再人工复核术语、数据和引用。"}
                  className={`custom-scrollbar w-full min-h-[460px] resize-none rounded-2xl border bg-gray-50/60 p-4 text-[15px] leading-relaxed text-gray-800 outline-none transition-colors focus:bg-white focus:ring-2 placeholder:text-gray-400 ${isOverLimit ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-primary-400 focus:ring-primary-100'}`}
                />
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-red-400' : 'bg-primary-500'}`} style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-1.5 text-gray-400 transition-colors hover:text-primary-600">
                      <FileUp size={12} /> 上传 .txt/.md
                      <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button onClick={fillSampleText} className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700">
                      <Wand2 size={12} /> 试用示例文本
                    </button>
                  </div>
                  {!isLoggedIn && <span className="font-medium text-primary-500">登录后可免费体验 3 次</span>}
                </div>
              </>
            ) : (
              <div className="custom-scrollbar rounded-2xl border border-gray-100 bg-gray-50 p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-gray-600">{text}</div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${phase === 'done' ? 'bg-green-100 text-green-600' : 'bg-primary-100 text-primary-600'}`}>
                  {phase === 'done' ? <Check size={15} /> : <Sparkles size={15} />}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">优化结果</div>
                  <div className="text-xs text-gray-400">保留原意，重构句式，降低模板化表达</div>
                </div>
              </div>
              {phase === 'done' && (
                <button onClick={handleCopyResult} className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${copied ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {copied ? <><Check size={12} className="text-green-600" /> 已复制</> : <><Copy size={12} /> 复制结果</>}
                </button>
              )}
            </div>

            {phase === 'input' && (
              <div className="flex min-h-[460px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-400"><Sparkles size={28} /></div>
                <p className="text-sm font-semibold text-gray-600">优化结果会显示在这里</p>
                <p className="mt-1.5 max-w-xs text-xs leading-5 text-gray-400">提交后可与原文对照，重点检查术语、数据、引用和结论是否保持一致。</p>
              </div>
            )}

            {phase === 'processing' && (
              <div className="min-h-[460px]">
                <JobPoller jobId={jobId} onComplete={handleComplete} onError={handleError} />
              </div>
            )}

            {phase === 'done' && (
              <div className="custom-scrollbar min-h-[460px] rounded-2xl border border-green-100 bg-green-50/30 p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-gray-800">{result}</div>
            )}
          </div>
        </div>

        <div className="mt-5">
          {phase === 'input' ? (
            <>
              <button onClick={handleSubmit} disabled={submitting || !text.trim() || isOverLimit} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 py-4 text-base font-bold text-white shadow-xl shadow-primary-100 transition-all hover:shadow-2xl hover:shadow-primary-200 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none">
                {submitting ? (<><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> 正在提交...</>) : !isLoggedIn ? (<><Send size={18} /> 免费注册并开始优化</>) : (<><Send size={18} /> 开始优化文本 <ArrowRight size={16} className="ml-1" /></>)}
              </button>
              <div className="mt-3 flex items-start justify-center gap-2 px-1 text-xs text-gray-400">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>单次 {MIN_CHARS}-{MAX_CHARS} 字；结果仅供写作辅助，请结合论文要求人工复核。</span>
              </div>
            </>
          ) : phase === 'done' ? (
            <button onClick={handleReset} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
              <RotateCcw size={16} /> 继续优化下一段
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
