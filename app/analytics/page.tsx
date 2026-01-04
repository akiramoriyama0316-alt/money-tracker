'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
}

type CategoryData = {
  name: string
  value: number
}

type MonthlyData = {
  month: string
  収入: number
  支出: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'thisMonth' | 'lastMonth' | 'all'>('thisMonth')
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  async function fetchAnalytics() {
    try {
      setLoading(true)
      let query = supabase.from('transactions').select('*')

      const now = new Date()
      if (period === 'thisMonth') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        query = query.gte('date', firstDay.toISOString().split('T')[0])
      } else if (period === 'lastMonth') {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
        query = query
          .gte('date', firstDay.toISOString().split('T')[0])
          .lte('date', lastDay.toISOString().split('T')[0])
      }

      const { data } = await query

      if (data) {
        processData(data)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  function processData(transactions: Transaction[]) {
    // カテゴリ別支出の集計
    const expenseByCategory: Record<string, number> = {}
    let income = 0
    let expense = 0

    transactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount || 0
      } else {
        expense += t.amount || 0
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + (t.amount || 0)
      }
    })

    const categoryArray: CategoryData[] = Object.entries(expenseByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    setCategoryData(categoryArray)
    setTotalIncome(income)
    setTotalExpense(expense)

    // 月別データの集計
    const monthlyMap: Record<string, { income: number; expense: number }> = {}
    
    transactions.forEach((t) => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { income: 0, expense: 0 }
      }
      
      if (t.type === 'income') {
        monthlyMap[monthKey].income += t.amount || 0
      } else {
        monthlyMap[monthKey].expense += t.amount || 0
      }
    })

    const monthlyArray: MonthlyData[] = Object.entries(monthlyMap)
      .map(([month, data]) => ({
        month: month.replace('-', '年').replace(/(\d{2})$/, '$1月'),
        収入: data.income,
        支出: data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6) // 最新6ヶ月

    setMonthlyData(monthlyArray)
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
        <Link href="/" className="text-blue-400 hover:underline mb-6 inline-block">
          ← ホームに戻る
        </Link>

        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          📊 分析
        </h1>

        {/* 期間切り替え */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setPeriod('thisMonth')}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              period === 'thisMonth'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            今月
          </button>
          <button
            onClick={() => setPeriod('lastMonth')}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              period === 'lastMonth'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            先月
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              period === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            全期間
          </button>
        </div>

        {/* 合計金額 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 p-6 rounded-xl border border-green-500/30">
            <div className="text-gray-400 text-sm mb-2">合計収入</div>
            <div className="text-3xl font-bold text-green-400">
              ¥{totalIncome.toLocaleString()}
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-600/20 to-red-700/20 p-6 rounded-xl border border-red-500/30">
            <div className="text-gray-400 text-sm mb-2">合計支出</div>
            <div className="text-3xl font-bold text-red-400">
              ¥{totalExpense.toLocaleString()}
            </div>
          </div>
        </div>

        {/* カテゴリ別支出の円グラフ */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-4">カテゴリ別支出</h2>
          {categoryData.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              データがありません
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => `¥${(value || 0).toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {categoryData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="text-red-400 font-bold">
                      ¥{item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 月別収支の棒グラフ */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-4">月別収支</h2>
          {monthlyData.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              データがありません
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  formatter={(value: number | undefined) => `¥${(value || 0).toLocaleString()}`}
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                />
                <Legend />
                <Bar dataKey="収入" fill="#10b981" />
                <Bar dataKey="支出" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

