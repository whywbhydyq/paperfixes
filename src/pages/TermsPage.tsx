export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">服务条款</h1>
        <p className="mt-4 text-sm text-gray-500">更新日期：2026-05-21</p>

        <div className="mt-10 space-y-8 text-sm leading-8 text-gray-700">
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">1. 服务性质</h2>
            <p>PaperFix 提供学术文本表达优化和改写辅助服务，生成内容仅供参考。用户应对最终提交、发表或使用的内容承担全部责任。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">2. 学术诚信</h2>
            <p>本平台反对任何形式的学术不端行为。用户不得使用本服务伪造研究、编造数据、生成虚假引用、规避学校或机构的正当管理要求。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">3. 检测结果说明</h2>
            <p>不同 AIGC 检测平台的模型、阈值和样本库不同，PaperFix 不承诺任何检测平台的必然通过结果。服务目标是降低机器化表达特征并提升文本自然度。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">4. 额度与支付</h2>
            <p>用户购买或获得的额度用于提交改写任务。若任务处理失败，系统应按规则自动退还额度。支付、退款或异常订单以平台实际记录为准。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">5. 禁止行为</h2>
            <p>用户不得利用本服务提交违法、侵权、恶意攻击、垃圾内容或包含高度敏感信息的文本，不得批量刷取短信验证码、恶意消耗接口资源或绕过系统限制。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
