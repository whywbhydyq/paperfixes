export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">隐私政策</h1>
        <p className="mt-4 text-sm text-gray-500">更新日期：2026-08-09</p>

        <div className="mt-10 space-y-8 text-sm leading-8 text-gray-700">
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">1. 我们收集的信息</h2>
            <p>为提供登录、额度管理、改写任务和支付服务，我们会处理手机号、登录状态、订单记录、任务状态、套餐信息和必要的技术日志。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">2. 论文文本处理</h2>
            <p>为提供改写服务和账号历史记录，PaperFix 会在账号存续期间保存用户提交的原文、处理结果和任务记录，以及登录、套餐、订单和必要技术记录。</p>
            <p className="mt-3">请勿提交未公开科研数据、商业秘密、患者信息、个人敏感信息或其他你无权处理的内容。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">3. 第三方服务</h2>
            <p>系统会使用数据库、短信、支付和 AI 模型服务完成必要功能。提交的文本会发送给 AI 模型服务进行处理；手机号、订单和支付信息会按对应功能交由相关服务处理。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">4. 数据安全</h2>
            <p>我们会尽力通过环境变量、访问控制、日志脱敏和权限隔离保护用户数据。但互联网服务无法保证绝对安全，用户也应妥善保管账号和验证码。</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">5. 联系与账号数据问题</h2>
            <p>如对账号数据、历史记录或本政策有疑问，可通过站点展示的联系方式与运营方联系。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
