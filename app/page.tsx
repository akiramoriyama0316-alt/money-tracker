'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  memo: string
  date: string
  created_at: string
}

type Goal = {
  id: string
  target_amount: number
  current_amount: number
  target_date?: string | null
}

export default function Home() {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [currentAmount, setCurrentAmount] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyExpense, setMonthlyExpense] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()

    // リアルタイム更新の設定
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      await Promise.all([
        fetchGoal(),
        fetchMonthlySummary(),
        fetchTransactions()
      ])
    } finally {
      setLoading(false)
    }
  }

  async function fetchGoal() {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .limit(1)
      .single()

    if (data) {
      setGoal(data)
      setCurrentAmount(data.current_amount || 0)
    } else if (error && error.code === 'PGRST116') {
      // 目標が存在しない場合はデフォルトを作成
      const { data: newGoal } = await supabase
        .from('goals')
        .insert([{ target_amount: 1000000, current_amount: 0 }])
        .select()
        .single()
      
      if (newGoal) {
        setGoal(newGoal)
        setCurrentAmount(0)
      }
    }
  }

  async function fetchMonthlySummary() {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const { data: incomeData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'income')
      .gte('date', firstDay.toISOString().split('T')[0])
      .lte('date', lastDay.toISOString().split('T')[0])

    const { data: expenseData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'expense')
      .gte('date', firstDay.toISOString().split('T')[0])
      .lte('date', lastDay.toISOString().split('T')[0])

    const income = incomeData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    const expense = expenseData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

    setMonthlyIncome(income)
    setMonthlyExpense(expense)
  }

  async function fetchTransactions() {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setTransactions(data)
  }

  async function deleteTransaction(id: string) {
    if (!confirm('この取引を削除してもよろしいですか？')) return

    await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    fetchData()
  }

  const progress = goal ? (currentAmount / goal.target_amount) * 100 : 0
  const monthlyBalance = monthlyIncome - monthlyExpense

  // 達成目標日と残り日数の計算
  const targetDate = goal?.target_date ? new Date(goal.target_date) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysRemaining = targetDate ? Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
  const isOverdue = daysRemaining !== null && daysRemaining < 0

  const categoryIcons: Record<string, string> = {
    給料: '💰',
    副業: '💼',
    お小遣い: '🎁',
    その他: '📦',
    食費: '🍔',
    交通費: '🚃',
    娯楽: '🎮',
    教育: '📚',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              MoneyTracker
            </h1>
            <p className="text-gray-400">家計簿管理アプリ</p>
          </div>
          <Link
            href="/settings"
            className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition hover:bg-gray-700"
            title="設定"
          >
            <span className="text-2xl">⚙️</span>
          </Link>
        </header>

        {/* 目標表示エリア */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg mb-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-4">🎯 貯金目標</h2>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">現在の貯金額</span>
              <span className="text-3xl font-bold text-green-400">
                ¥{currentAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400">目標金額</span>
              <span className="text-xl text-gray-300">
                ¥{goal?.target_amount.toLocaleString() || '1,000,000'}
              </span>
            </div>
            {targetDate && (
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400">達成目標日</span>
                <span className={`text-lg font-semibold ${isOverdue ? 'text-red-400' : 'text-yellow-400'}`}>
                  {targetDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}
            {daysRemaining !== null && (
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">残り日数</span>
                  <span className={`text-xl font-bold ${isOverdue ? 'text-red-400' : daysRemaining <= 30 ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {isOverdue ? `${Math.abs(daysRemaining)}日超過` : `${daysRemaining}日`}
                  </span>
                </div>
                {!isOverdue && daysRemaining > 0 && (
                  <div className="mt-2 text-sm text-gray-500">
                    1日あたり ¥{Math.ceil(((goal?.target_amount || 0) - currentAmount) / daysRemaining).toLocaleString()} が必要
                  </div>
                )}
              </div>
            )}
            <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-green-400 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="text-right mt-2 text-sm text-gray-400">
              {progress.toFixed(1)}% 達成
            </div>
          </div>
          {progress >= 100 && (
            <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg text-center">
              <span className="text-2xl">🎉</span>
              <p className="text-yellow-400 font-bold mt-2">目標達成おめでとうございます！</p>
            </div>
          )}
        </div>

        {/* 今月の収支サマリー */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition">
            <div className="text-gray-400 text-sm mb-2">今月の収入</div>
            <div className="text-2xl font-bold text-green-400">
              ¥{monthlyIncome.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-red-500 transition">
            <div className="text-gray-400 text-sm mb-2">今月の支出</div>
            <div className="text-2xl font-bold text-red-400">
              ¥{monthlyExpense.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition">
            <div className="text-gray-400 text-sm mb-2">今月の残高</div>
            <div className={`text-2xl font-bold ${monthlyBalance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              ¥{monthlyBalance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Link
            href="/add"
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 rounded-xl font-bold text-center hover:from-blue-500 hover:to-blue-400 transition shadow-lg hover:shadow-xl"
          >
            + 新規入力
          </Link>
          <Link
            href="/analytics"
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-4 rounded-xl font-bold text-center hover:from-purple-500 hover:to-purple-400 transition shadow-lg hover:shadow-xl"
          >
            📊 分析
          </Link>
        </div>

        {/* 収支履歴 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-4">📋 最近の取引</h2>
          {transactions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              取引がありません。「+ 新規入力」から追加してください。
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-2xl">
                      {categoryIcons[transaction.category] || '📝'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{transaction.category}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          transaction.type === 'income' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {transaction.type === 'income' ? '収入' : '支出'}
                        </span>
                      </div>
                      {transaction.memo && (
                        <div className="text-sm text-gray-400 truncate">
                          {transaction.memo}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(transaction.date).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xl font-bold ${
                      transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => deleteTransaction(transaction.id)}
                      className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded hover:bg-red-500/10 transition"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
