'use client'
import { useState } from 'react'
import { copyToClipboard } from '@/lib/utils'

export function TemplateModal({ templateMd, grantTitle }: { templateMd: string; grantTitle: string }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle')

  const copy = async () => {
    const ok = await copyToClipboard(templateMd)
    setState(ok ? 'ok' : 'err')
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <>
      {templateMd ? (
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-300 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors">
          📄 Get application template
        </button>
      ) : (
        <button disabled
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground/50 cursor-not-allowed">
          📄 No application template
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-foreground">Application template — {grantTitle}</h3>
              <div className="flex items-center gap-2">
                <button onClick={copy}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${state === 'ok' ? 'bg-green-600 text-white' : state === 'err' ? 'bg-red-600 text-white' : 'bg-muted text-foreground/80 hover:bg-muted'}`}>
                  {state === 'ok' ? '✓ Copied' : state === 'err' ? 'Copy failed, please copy manually' : 'Copy Markdown'}
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
