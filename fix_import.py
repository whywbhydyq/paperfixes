with open('src/components/PaymentModal.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace("import { X, Alipay, Wallet, Loader2 } from 'lucide-react';", "import { X, Loader2 } from 'lucide-react';")
with open('src/components/PaymentModal.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('✅ 修复 PaymentModal import')
