import { useState, useEffect, useRef } from 'react';
import { Loader2, Clock } from 'lucide-react';
import { pollJobStatus, type JobStatus as JobStatusType, type JobStatusResponse } from '../lib/api';

const MAX_POLL_SECONDS = 300; // 5 minutes max

interface JobPollerProps {
  jobId: string;
  onComplete: (result: string, inputLen: number, outputLen: number) => void;
  onError: (error: string) => void;
}

export default function JobPoller({ jobId, onComplete, onError }: JobPollerProps) {
  const [status, setStatus] = useState<JobStatusType>('PENDING');
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  // Stable refs for callbacks to avoid effect re-triggering
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  useEffect(() => {
    completedRef.current = false;

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    // Start polling every 2 seconds
    pollRef.current = setInterval(async () => {
      try {
        const data: JobStatusResponse = await pollJobStatus(jobId);
        setStatus(data.status);

        if (data.status === 'DONE' && data.result) {
          if (!completedRef.current) {
            completedRef.current = true;
            clearInterval(pollRef.current!);
            clearInterval(timerRef.current!);
            pollRef.current = null;
            timerRef.current = null;
            onCompleteRef.current(data.result, data.inputLen ?? 0, data.outputLen ?? 0);
          }
        } else if (data.status === 'FAILED') {
          if (!completedRef.current) {
            completedRef.current = true;
            clearInterval(pollRef.current!);
            clearInterval(timerRef.current!);
            pollRef.current = null;
            timerRef.current = null;
            onErrorRef.current(data.error || '处理失败，额度已退还');
          }
        }
      } catch {
        // Silently retry on network errors
      }
    }, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [jobId]);

  // Timeout detection - separate effect to avoid interfering with poll effect
  useEffect(() => {
    if (elapsed >= MAX_POLL_SECONDS && !completedRef.current) {
      completedRef.current = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      onErrorRef.current('处理超时，请稍后重试。额度已退还');
    }
  }, [elapsed]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  };

  return (
    <div className="flex flex-col items-center py-12 animate-fade-in-up">
      <div className="relative mb-6">
        <div className="h-16 w-16 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin-slow" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={20} className="text-primary-600 animate-spin" />
        </div>
      </div>
      <p className="text-lg font-semibold text-gray-900">
        {status === 'PENDING' ? '正在思考...' : '正在改写中...'}
      </p>
      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
        <Clock size={14} />
        已等待 {formatTime(elapsed)}
      </div>
      <div className="mt-6 w-full max-w-md">
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-1000"
            style={{ width: `${Math.min((elapsed / MAX_POLL_SECONDS) * 100, 95)}%` }}
          />
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          通常需要 10-30 秒，复杂文本可能更久
        </p>
      </div>
    </div>
  );
}
