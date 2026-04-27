'use client'

import { createContext, useContext, useCallback } from 'react'
import en from '@/messages/en.json'

export type Lang = 'en' | 'zh'

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
  const setLang = () => {}

  const t = useCallback(
    (key: string): string => en[key as keyof typeof en] ?? key,
    []
  )

  return (
    <LanguageContext.Provider value={{ lang: 'en', setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
export const useLanguage = useLang
