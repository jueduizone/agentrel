'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

type Lang = 'en' | 'zh'

interface I18nContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function useLanguage() {
  return useContext(I18nContext)
}

const messages: Record<Lang, Record<string, string>> = {
  en: {
    // Navbar
    'nav.explore': 'Explore',
    'nav.ecosystems': 'Ecosystems',
    'nav.build': 'Build',
    'nav.resources': 'Resources',
    'nav.submit': 'Submit Skill',
    'nav.signin': 'Sign In',
    'nav.register': 'Register',
    // Hero
    'hero.title': 'Web3 AI Context Infrastructure',
    'hero.subtitle': 'Fix AI hallucinations on Web3. Give your AI agent accurate, up-to-date context for any blockchain ecosystem.',
    'hero.cta.primary': 'Browse Skills',
    'hero.cta.secondary': 'Submit a Skill',
    'hero.stats.skills': 'Skills',
    'hero.stats.ecosystems': 'Ecosystems',
    'hero.stats.free': 'Free',
    // Skills page
    'skills.title': 'Skills',
    'skills.subtitle': 'Browse AI context skills for Web3 development',
    'skills.search.placeholder': 'Search skills...',
    'skills.filter.all': 'All',
    'skills.filter.official': 'Official',
    'skills.filter.community': 'Community',
    'skills.filter.aiGenerated': 'AI Generated',
    'skills.empty': 'No skills found',
    // Benchmark
    'benchmark.title': 'AgentRel Benchmark',
    'benchmark.run': 'Run',
    'benchmark.judge': 'Judge',
    'benchmark.strategy': 'Strategy',
    'benchmark.control': 'Control',
    'benchmark.test': 'Test',
    'benchmark.delta': 'Delta',
    'benchmark.questions': 'Questions',
    // Footer
    'footer.product': 'Product',
    'footer.community': 'Community',
    'footer.ecosystem': 'OpenBuild Ecosystem',
    'footer.powered': 'Powered by OpenBuild',
    'footer.rights': '© 2026 AgentRel · MIT License',
  },
  zh: {
    // Navbar
    'nav.explore': '探索',
    'nav.ecosystems': '生态系统',
    'nav.build': '构建',
    'nav.resources': '资源',
    'nav.submit': '提交 Skill',
    'nav.signin': '登录',
    'nav.register': '注册',
    // Hero
    'hero.title': 'Web3 AI 上下文基础设施',
    'hero.subtitle': '修复 AI 在 Web3 上的幻觉。为你的 AI 智能体提供任意区块链生态的准确、最新上下文。',
    'hero.cta.primary': '浏览 Skills',
    'hero.cta.secondary': '提交 Skill',
    'hero.stats.skills': 'Skills',
    'hero.stats.ecosystems': '生态',
    'hero.stats.free': '免费',
    // Skills page
    'skills.title': 'Skills',
    'skills.subtitle': '浏览 Web3 开发的 AI 上下文 Skills',
    'skills.search.placeholder': '搜索 Skills...',
    'skills.filter.all': '全部',
    'skills.filter.official': '官方',
    'skills.filter.community': '社区',
    'skills.filter.aiGenerated': 'AI 生成',
    'skills.empty': '未找到相关 Skills',
    // Benchmark
    'benchmark.title': 'AgentRel 基准测试',
    'benchmark.run': '运行时间',
    'benchmark.judge': '评判模型',
    'benchmark.strategy': '注入策略',
    'benchmark.control': '对照组',
    'benchmark.test': '测试组',
    'benchmark.delta': '提升',
    'benchmark.questions': '题目数',
    // Footer
    'footer.product': '产品',
    'footer.community': '社区',
    'footer.ecosystem': 'OpenBuild 生态',
    'footer.powered': 'Powered by OpenBuild',
    'footer.rights': '© 2026 AgentRel · MIT License',
  },
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = (typeof window !== 'undefined' ? localStorage.getItem('agentrel_lang') : null) as Lang | null
    if (saved === 'zh' || saved === 'en') setLangState(saved)
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    if (typeof window !== 'undefined') localStorage.setItem('agentrel_lang', l)
  }, [])

  const t = useCallback((key: string): string => {
    return messages[lang][key] ?? messages['en'][key] ?? key
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}
