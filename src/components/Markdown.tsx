"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders the AI-finalized study as nicely styled Markdown (headings, tables,
// lists, emphasis) instead of raw text.
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[15px] leading-relaxed text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1
              className="mb-4 mt-8 font-display text-2xl font-semibold text-slate-900 first:mt-0"
              {...props}
            />
          ),
          h2: (props) => (
            <h2
              className="mb-3 mt-8 border-b-2 border-slate-900 pb-1.5 font-display text-xl font-semibold text-slate-900 first:mt-0"
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className="mb-1.5 mt-5 font-display text-lg font-semibold text-slate-900"
              {...props}
            />
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
              className="text-slate-900 underline decoration-citron-400 decoration-2 underline-offset-2 hover:decoration-slate-900"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          code: (props) => (
            <code
              className="rounded-sm bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800"
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="my-3 border-l-2 border-citron-400 bg-citron-50 py-1.5 pl-4 text-slate-600"
              {...props}
            />
          ),
          hr: () => <hr className="my-6 border-slate-200" />,
          table: (props) => (
            <div className="my-4 overflow-x-auto border border-slate-300">
              <table className="w-full border-collapse text-left text-sm" {...props} />
            </div>
          ),
          thead: (props) => <thead className="bg-slate-50" {...props} />,
          th: (props) => (
            <th
              className="border-b border-slate-300 px-3 py-2 font-mono text-[11px] uppercase tracking-label text-slate-600"
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
