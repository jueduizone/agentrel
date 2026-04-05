'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import en from '@/messages/en.json'
import zh from '@/messages/zh.json'

export type Lang = 'en' | 'zh'

const messages: Record<Lang, Record<string, string>> = { en, zh }

type LanguageContextValue = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('agentrel_lang') as Lang
    if (saved === 'zh' || saved === 'en') setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('agentrel_lang', l)
  }

  const t = useCallback(
    (key: string): string => messages[lang][key] ?? key,
    [lang]
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
export const useLanguage = useLang
