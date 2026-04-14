'use client'
import { useState } from 'react'

export function TemplateModal({ templateMd, grantTitle }: { templateMd: string; grantTitle: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(templateMd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {templateMd ? (
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-300 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors">
          📄 获取申请模板
        </button>
      ) : (
        <button disabled
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground/50 cursor-not-allowed">
          📄 暂无申请模板
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-foreground">申请模板 — {grantTitle}</h3>
              <div className="flex items-center gap-2">
                <button onClick={copy}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-muted text-foreground/80 hover:bg-muted'}`}>
                  {copied ? '✓ 已复制' : '复制 Markdown'}
                </button>
                <button onClick={() => setOpen(false)} className="text-muted-foreground/50 hover:text-muted-foreground text-xl leading-none">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-mono bg-muted/50 rounded-lg p-4">{templateMd}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
