'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Goal = {
  id: string
  target_amount: number
  current_amount: number
  target_date?: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchGoal()
  }, [])

  async function fetchGoal() {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .limit(1)
      .single()

    if (data) {
      setGoal(data)
      setTargetAmount(data.target_amount?.toString() || '1000000')
      setTargetDate(data.target_date ? data.target_date.split('T')[0] : '')
    } else if (error && error.code === 'PGRST116') {
      // 目標が存在しない場合はデフォルトを作成
      const { data: newGoal } = await supabase
        .from('goals')
        .insert([{ target_amount: 1000000, current_amount: 0 }])
        .select()
        .single()
      
      if (newGoal) {
        setGoal(newGoal)
        setTargetAmount('1000000')
        setTargetDate('')
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const amountNum = parseFloat(targetAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('有効な目標金額を入力してください')
      return
    }

    if (targetDate) {
      const date = new Date(targetDate)
      if (isNaN(date.getTime())) {
        setError('有効な日付を入力してください')
        return
      }
    }

    try {
      setLoading(true)

      if (!goal) {
        setError('目標データが見つかりません')
        return
      }

      const updateData: any = {
        target_amount: amountNum,
      }

      if (targetDate) {
        updateData.target_date = targetDate
      } else {
        updateData.target_date = null
      }

      const { error: updateError } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', goal.id)

      if (updateError) {
        setError('保存に失敗しました: ' + updateError.message)
        return
      }

      setSuccess('設定を保存しました！')
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (err) {
      setError('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function resetCurrentAmount() {
    if (!confirm('現在の貯金額を0にリセットしてもよろしいですか？')) return

    if (!goal) return

    supabase
      .from('goals')
      .update({ current_amount: 0 })
      .eq('id', goal.id)
      .then(() => {
        setSuccess('貯金額をリセットしました')
        fetchGoal()
      })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-blue-400 hover:underline mb-6 inline-block">
          ← ホームに戻る
        </Link>

        <div className="bg-gray-800 rounded-xl p-6 sm:p-8 border border-gray-700 shadow-lg">
          <h1 className="text-3xl font-bold mb-6">⚙️ 設定</h1>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-600/20 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* 成功メッセージ */}
          {success && (
            <div className="bg-green-600/20 border border-green-500 text-green-400 p-4 rounded-lg mb-6">
              {success}
            </div>
          )}

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 目標金額 */}
            <div>
              <label className="block text-gray-400 mb-2">目標金額 *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="1000000"
                  min="1"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                達成したい貯金額を設定します
              </p>
            </div>

            {/* 達成目標日 */}
            <div>
              <label className="block text-gray-400 mb-2">達成目標日（任意）</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-2">
                目標達成を目指す日付を設定します（未設定でも可）
              </p>
            </div>

            {/* 保存ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg font-bold text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </form>

          {/* 現在の貯金額リセット */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <h2 className="text-xl font-bold mb-4">危険な操作</h2>
            <button
              onClick={resetCurrentAmount}
              className="w-full py-3 rounded-lg font-bold bg-red-600/20 border border-red-500 text-red-400 hover:bg-red-600/30 transition"
            >
              現在の貯金額を0にリセット
            </button>
            <p className="text-sm text-gray-500 mt-2">
              現在の貯金額を0にリセットします。この操作は取り消せません。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

