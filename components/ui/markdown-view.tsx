import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { cn } from '@/lib/utils'

interface MarkdownViewProps {
  content: string
  className?: string
}

// Custom sanitize schema allowing safe attributes
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a || []),
      'target',
      'rel',
      'href',
      'title',
    ],
    code: [...(defaultSchema.attributes?.code || []), 'className'],
  },
}

export function MarkdownView({ content, className }: MarkdownViewProps) {
  if (!content) return null

  return (
    <div
      className={cn(
        'prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed break-words',
        'prose-headings:font-bricolage prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground',
        'prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-3',
        'prose-h2:text-xl prose-h2:mt-5 prose-h2:mb-2',
        'prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2',
        'prose-p:my-2.5 prose-p:leading-relaxed',
        'prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5',
        'prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-5',
        'prose-li:my-1',
        'prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
        'prose-code:font-mono prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-muted/80 prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto',
        'prose-a:text-brand prose-a:underline-offset-4 hover:prose-a:underline',
        'prose-hr:my-6 prose-hr:border-border',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          a: ({ ...props }) => {
            const { node, ...rest } = props as { node?: unknown } & React.AnchorHTMLAttributes<HTMLAnchorElement>
            void node
            return (
              <a
                {...rest}
                target="_blank"
                rel="nofollow ugc noopener"
                className="text-brand hover:underline font-medium"
              />
            )
          },
          pre: ({ ...props }) => {
            const { node, ...rest } = props as { node?: unknown } & React.HTMLAttributes<HTMLPreElement>
            void node
            return (
              <pre
                {...rest}
                className="my-3 overflow-x-auto rounded-xl border border-border bg-muted/60 p-4 font-mono text-xs text-foreground"
              />
            )
          },
          code: ({ className, children, ...props }) => {
            const { node, ...rest } = props as { node?: unknown } & React.HTMLAttributes<HTMLElement>
            void node
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && typeof children === 'string' && !children.includes('\n')
            return isInline ? (
              <code
                {...rest}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
              >
                {children}
              </code>
            ) : (
              <code {...rest} className={cn('font-mono text-xs', className)}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
