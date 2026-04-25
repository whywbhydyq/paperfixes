import { useState, useCallback, useEffect } from 'react';
import JobPoller from '../components/JobPoller';
import { Send, RotateCcw, AlertCircle, FileUp, Info, Check, Copy, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { submitRewriteJob } from '../lib/api';

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
  // 兜底
  const defaults: Record<string, number> = { free: 500, basic: 3000, pro: 5000 };
  return defaults[plan] ?? 500;
}

type Phase = 'input' | 'processing' | 'done';

const MIN_CHARS = 40;

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

  // 动态拉取当前套餐的 maxChars
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

  const isOverLimit = countChars(text) > MAX_CHARS;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    saveInputText(e.target.value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) { setError('目前仅支持 .txt 和 .md 文件'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
      setError('');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setError('');
    if (!text.trim()) { setError('请输入需要改写的文本'); return; }
    if (countChars(text) < MIN_CHARS) { setError(`文本太短，请至少输入${MIN_CHARS}个字符`); return; }
    if (isOverLimit) { setError(`当前套餐单次最多${MAX_CHARS}字，请精简后重试或升级套餐`); return; }
    if (!isLoggedIn) { openLoginModal(); return; }
    if ((user?.quota ?? 0) <= 0) { setError('额度不足，请前往定价页面购买'); return; }
    setSubmitting(true);
    try {
      const data = await submitRewriteJob(text.trim(), token);
      setJobId(data.jobId);
      setPhase('processing');
      setActiveJob({ jobId: data.jobId, phase: 'processing' });
      updateQuota(data.quota, user!.totalUsed + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '提交失败，请重试';
      setError(message);
    } finally { setSubmitting(false); }
  };

  const handleComplete = useCallback((res: string, _inputLen: number, outLen: number) => {
    setResult(res);
    setOutputLen(outLen);
    setPhase('done');
    setActiveJob({ jobId, phase: 'done', result: res, outputLen: outLen });
  }, [jobId, setActiveJob]);

  const handleError = useCallback((err: string) => {
    setError(err); setPhase('input'); clearActiveJob();
  }, [clearActiveJob]);

  const handleReset = () => {
    setText(''); setResult(''); setJobId(''); setPhase('input'); setError('');
    setOutputLen(0); clearActiveJob(); clearInputText();
  };

  const handleCopyResult = () => {
    navigator.clipboard.writeText(result).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const isEditable = phase === 'input';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">学术改写引擎</h1>
          <p className="mt-1 text-sm text-gray-500">粘贴论文段落，智能降低AIGC检测率 · 技术术语零破坏 · 字数严格控制</p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 左栏：原文 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <FileText size={14} />
              </div>
              <span className="text-sm font-semibold text-gray-900">{isEditable ? '原文输入' : '原文'}</span>
              {isEditable && (
                <span className={`ml-auto text-xs font-medium ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
                  {countChars(text)} / {MAX_CHARS} 字{isOverLimit && '（超出限制）'}
                </span>
              )}
            </div>
            {isEditable ? (
              <>
                <textarea
                  value={text}
                  onChange={handleTextChange}
                  placeholder={"在此粘贴需要降低AIGC检测率的论文段落...\n\n引擎将严格执行：增加解释性冗余、系统性同义替换、把字句转换等策略，同时保护所有技术术语不被修改。"}
                  className={`custom-scrollbar w-full min-h-[320px] resize-none rounded-xl border bg-gray-50/50 p-4 text-[15px] leading-relaxed text-gray-800 outline-none transition-colors focus:bg-white focus:ring-2 placeholder:text-gray-400 ${isOverLimit ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-primary-400 focus:ring-primary-100'}`}
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <label className="flex cursor-pointer items-center gap-1 text-gray-400 hover:text-primary-600 transition-colors">
                    <FileUp size={12} /> 上传 .txt 文件
                    <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {isLoggedIn && (
                    <span className="text-gray-400">
                      剩余额度：<span className="font-medium text-primary-600">{user?.quota ?? 0}</span> 次
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="custom-scrollbar rounded-xl border border-gray-100 bg-gray-50 p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-gray-600">{text}</div>
            )}
          </div>

          {/* 右栏：结果 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${phase === 'done' ? 'bg-green-100 text-green-600' : 'bg-primary-100 text-primary-600'}`}>
                  {phase === 'done' ? <Check size={14} /> : <Sparkles size={14} />}
                </div>
                <span className="text-sm font-semibold text-gray-900">改写结果</span>
                {phase === 'done' && countChars(text) > 0 && (
                  <span className="text-xs text-gray-400">{countChars(text)}字 → <span className="text-green-600 font-medium">{outputLen}字</span></span>
                )}
              </div>
              {phase === 'done' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 font-medium">{outputLen}字</span>
                  <button onClick={handleCopyResult} className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${copied ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {copied ? <><Check size={12} className="text-green-600" /> 已复制</> : <><Copy size={12} /> 复制</>}
                  </button>
                </div>
              )}
            </div>

            {phase === 'input' && (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-400"><Sparkles size={28} /></div>
                <p className="text-sm font-medium text-gray-500">粘贴文本后点击"开始改写"</p>
                <p className="mt-1.5 text-xs text-gray-400">结果将在这里显示，与原文对照查看</p>
              </div>
            )}

            {phase === 'processing' && (
              <div className="min-h-[320px]">
          <JobPoller jobId={jobId} onComplete={handleComplete} onError={handleError} />
              </div>
            )}

            {phase === 'done' && (
              <div className="custom-scrollbar min-h-[320px] rounded-xl border border-gray-100 bg-green-50/30 p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-gray-800">{result}</div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="mt-4">
          {phase === 'input' ? (
            <>
              <button onClick={handleSubmit} disabled={submitting || !text.trim() || isOverLimit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-200 transition-all hover:shadow-xl hover:shadow-primary-300 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none">
                {submitting ? (<><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> 提交中...</>) : !isLoggedIn ? (<><Send size={18} /> 登录后开始改写</>) : (<><Send size={18} /> 开始改写 <ArrowRight size={16} className="ml-1" /></>)}
              </button>
              <div className="mt-3 flex items-start gap-2 px-1 text-xs text-gray-400">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>单次 {MIN_CHARS}-{MAX_CHARS} 字</span>
              </div>
            </>
          ) : phase === 'done' ? (
            <button onClick={handleReset} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
              <RotateCcw size={16} /> 继续改写
            </button>
          ) : null}
        </div>

        
      </div>
    </div>
  );
}
