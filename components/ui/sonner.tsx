'use client'

import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-paper group-[.toaster]:text-ink group-[.toaster]:border-hairline group-[.toaster]:shadow-elevated group-[.toaster]:rounded-apple',
          description: 'group-[.toast]:text-graphite',
          actionButton:
            'group-[.toast]:bg-accent group-[.toast]:text-paper',
          cancelButton:
            'group-[.toast]:bg-mist group-[.toast]:text-graphite',
          error:
            'group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 group-[.toaster]:border-red-200',
          success:
            'group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 group-[.toaster]:border-green-200',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
