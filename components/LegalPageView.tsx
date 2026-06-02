"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  subscribeLegalPage,
  type LegalPageContent,
  type LegalPageSlug,
  type LegalSection,
} from "@/lib/legalPagesService";

interface Props {
  slug: LegalPageSlug;
  initialContent: LegalPageContent;
}

export default function LegalPageView({ slug, initialContent }: Props) {
  const [content, setContent] = useState<LegalPageContent>(initialContent);

  useEffect(() => {
    const unsub = subscribeLegalPage(slug, (fresh) => {
      if (fresh) setContent(fresh);
    });
    return () => unsub();
  }, [slug]);

  const other = slug === "privacy" ? "/terms" : "/privacy";
  const otherLabel = slug === "privacy" ? "閱讀服務條款 →" : "閱讀隱私權政策 →";

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
        <p className="text-sm font-semibold text-gold">{content.badge}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{content.title}</h1>
        <div className="mt-4 leading-7 text-parchment">
          <RichText body={content.intro} />
        </div>
        {content.lastUpdated ? (
          <p className="mt-3 text-xs text-parchment/70">
            最後更新日期：{content.lastUpdated}
          </p>
        ) : null}
      </div>

      {content.noticeTitle || content.noticeBody ? (
        <div className="mt-4 rounded-xl bg-parchment p-4 text-sm leading-7 text-ink">
          {content.noticeTitle ? (
            <p className="font-bold text-pine">{content.noticeTitle}</p>
          ) : null}
          {content.noticeBody ? (
            <div className="mt-2">
              <RichText body={content.noticeBody} />
            </div>
          ) : null}
        </div>
      ) : null}

      <article className="mt-6 space-y-4 text-sm leading-7 text-ink">
        {content.sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </article>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href={other}
          className="flex h-12 w-full items-center justify-center rounded-full bg-clay px-5 text-sm font-bold text-white"
        >
          {otherLabel}
        </Link>
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-full border border-pine bg-white px-5 text-sm font-bold text-pine"
        >
          回到首頁
        </Link>
      </div>
    </section>
  );
}

function SectionCard({ section }: { section: LegalSection }) {
  const className = section.highlight
    ? "rounded-[1.5rem] border-2 border-clay bg-[#FFF5F0] p-5 shadow-sm"
    : "rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm";
  return (
    <section className={className}>
      {section.highlight ? (
        <p className="text-xs font-semibold text-clay">⚠️ 重要宣導</p>
      ) : null}
      <h2 className={`${section.highlight ? "mt-2 " : ""}text-lg font-bold text-pine`}>
        {section.heading}
      </h2>
      <div className="mt-3">
        <RichText body={section.body} />
      </div>
    </section>
  );
}

function RichText({ body }: { body: string }) {
  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, blockIdx) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const allBullets = lines.length > 0 && lines.every((l) => l.startsWith("- "));
        if (allBullets) {
          return (
            <ul key={blockIdx} className="list-disc space-y-2 pl-5 text-muted [&:not(:first-child)]:mt-3">
              {lines.map((line, lineIdx) => (
                <li key={lineIdx}>
                  <Inline text={line.slice(2)} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={blockIdx} className="[&:not(:first-child)]:mt-3">
            {lines.map((line, lineIdx) => (
              <Fragment key={lineIdx}>
                {lineIdx > 0 ? <br /> : null}
                <Inline text={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

const INLINE_PATTERN = /(\*\*[^*]+\*\*)|(mailto:[^\s)]+)|(https?:\/\/[^\s)]+)/g;

function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  INLINE_PATTERN.lastIndex = 0;
  let key = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("mailto:")) {
      parts.push(
        <a
          key={key++}
          href={token}
          className="font-semibold text-clay underline decoration-clay/40 underline-offset-2 hover:text-pine"
        >
          {token.slice("mailto:".length)}
        </a>,
      );
    } else {
      parts.push(
        <a
          key={key++}
          href={token}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-clay underline decoration-clay/40 underline-offset-2 hover:text-pine"
        >
          {token}
        </a>,
      );
    }
    lastIdx = INLINE_PATTERN.lastIndex;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return <>{parts}</>;
}
