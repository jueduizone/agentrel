'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import en from '@/messages/en.json'
import zh from '@/messages/zh.json'

export type Lang = 'en' | 'zh'

type Messages = Record<string, string>
const messages: Record<Lang, Messages> = { en, zh }

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
    const saved = localStorage.getItem('agentrel_lang')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted preference after mount
    if (saved === 'zh' || saved === 'en') setLangState(saved)
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('agentrel_lang', l)
  }, [])

  const t = useCallback(
    (key: string): string => messages[lang][key] ?? messages.en[key] ?? key,
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
