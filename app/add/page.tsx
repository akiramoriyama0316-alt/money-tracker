'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type TransactionType = 'income' | 'expense'

const incomeCategories = ['給料', '副業', 'お小遣い', 'その他']
const expenseCategories = ['食費', '交通費', '娯楽', '教育', 'その他']

export default function AddTransactionPage() {
  const router = useRouter()
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = type === 'income' ? incomeCategories : expenseCategories

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!amount || !category) {
      setError('金額とカテゴリを入力してください')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('有効な金額を入力してください')
      return
    }

    try {
      setLoading(true)

      // 取引を保存
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          type,
          amount: amountNum,
          category,
          memo: memo || null,
          date,
        }])

      if (transactionError) {
        setError('保存に失敗しました: ' + transactionError.message)
        return
      }

      // 収入の場合は目標の現在額を更新
      if (type === 'income') {
        const { data: goalData } = await supabase
          .from('goals')
          .select('current_amount')
          .limit(1)
          .single()

        if (goalData) {
          await supabase
            .from('goals')
            .update({ current_amount: (goalData.current_amount || 0) + amountNum })
            .eq('id', goalData.id)
        }
      }

      router.push('/')
    } catch (err) {
      setError('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-blue-400 hover:underline mb-6 inline-block">
          ← ホームに戻る
        </Link>

        <div className="bg-gray-800 rounded-xl p-6 sm:p-8 border border-gray-700 shadow-lg">
          <h1 className="text-3xl font-bold mb-6">💰 新規入力</h1>

          {/* タブ切り替え */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setType('income')
                setCategory('')
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-bold transition ${
                type === 'income'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              収入
            </button>
            <button
              onClick={() => {
                setType('expense')
                setCategory('')
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-bold transition ${
                type === 'expense'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              支出
            </button>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-600/20 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 金額入力 */}
            <div>
              <label className="block text-gray-400 mb-2">金額 *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="1"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* カテゴリ選択 */}
            <div>
              <label className="block text-gray-400 mb-2">カテゴリ *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
                disabled={loading}
              >
                <option value="">選択してください</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* メモ入力 */}
            <div>
              <label className="block text-gray-400 mb-2">メモ（任意）</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="メモを入力..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
                disabled={loading}
              />
            </div>

            {/* 日付選択 */}
            <div>
              <label className="block text-gray-400 mb-2">日付 *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
                disabled={loading}
              />
            </div>

            {/* 保存ボタン */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-lg font-bold text-lg transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                type === 'income'
                  ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400'
                  : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'
              }`}
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

