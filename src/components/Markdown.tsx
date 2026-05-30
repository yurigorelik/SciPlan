"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders the AI-finalized study as nicely styled Markdown (headings, tables,
// lists, emphasis) instead of raw text.
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1 className="mb-3 mt-6 text-xl font-bold text-slate-900 first:mt-0" {...props} />
          ),
          h2: (props) => (
            <h2
              className="mb-2 mt-6 border-b border-slate-200 pb-1 text-lg font-semibold text-slate-900 first:mt-0"
              {...props}
            />
          ),
          h3: (props) => (
            <h3 className="mb-1.5 mt-4 text-base font-semibold text-brand-800" {...props} />
          ),
          p: (props) => <p className="my-2" {...props} />,
          ul: (props) => (
            <ul className="my-2 list-disc space-y-1 pl-5 marker:text-slate-400" {...props} />
          ),
          ol: (props) => (
            <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-slate-400" {...props} />
          ),
          li: (props) => <li className="pl-1" {...props} />,
          strong: (props) => <strong className="font-semibold text-slate-900" {...props} />,
          a: (props) => (
            <a
              className="text-brand-700 underline underline-offset-2 hover:text-brand-800"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          code: (props) => (
            <code
              className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800"
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="my-3 border-l-4 border-brand-200 bg-brand-50/50 py-1 pl-4 text-slate-600"
              {...props}
            />
          ),
          hr: () => <hr className="my-5 border-slate-200" />,
          table: (props) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-sm" {...props} />
            </div>
          ),
          thead: (props) => <thead className="bg-slate-50" {...props} />,
          th: (props) => (
            <th
              className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700"
              {...props}
            />
          ),
          td: (props) => (
            <td className="border-b border-slate-100 px-3 py-2 align-top" {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
