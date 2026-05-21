export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">隐私政策</h1>
        <p className="mt-4 text-sm text-gray-500">更新日期：2026-05-21</p>

        <div className="mt-10 space-y-8 text-sm leading-8 text-gray-700">
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">1. 我们收集的信息</h2>
            <p>为提供登录、额度管理、改写任务和支付服务，我们可能会处理手机号、登录状态、订单记录、任务状态、套餐信息和必要的技术日志。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">2. 论文文本处理</h2>
            <p>PaperFix 的产品目标是处理完成后不留存任何原文。用户仍应避免提交包含个人隐私、未公开科研数据、商业秘密或其他敏感信息的文本。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">3. 第三方服务</h2>
            <p>系统可能使用数据库、短信、支付和 AI 模型服务来完成必要功能。相关数据仅用于实现用户请求、订单确认、额度扣减和任务处理。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">4. 数据安全</h2>
            <p>我们会尽力通过环境变量、访问控制、日志脱敏和权限隔离保护用户数据。但互联网服务无法保证绝对安全，用户也应妥善保管账号和验证码。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">5. 联系与删除</h2>
            <p>如需查询、删除或处理个人账号相关数据，可通过站点展示的联系方式与我们联系。我们会在合理范围内协助处理。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
