import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { ToolWorkspace } from "@/components/tools/tool-workspace";
import { getSiteName } from "@/lib/site-config";
import { getAllToolSlugs, getToolBySlug } from "@/lib/tools-registry";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return getAllToolSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) {
    return {};
  }
  const siteName = getSiteName();
  const description = tool.ogDescription ?? tool.summary;
  const pageTitle = `${tool.title} · ${siteName}`;

  return {
    title: tool.title,
    description,
    alternates: {
      canonical: `/tools/${slug}`,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: `/tools/${slug}`,
      type: "website",
      locale: "zh_TW",
      siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
    },
  };
}

export default async function ToolPage({ params }: ToolPageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) {
    notFound();
  }
  return <ToolWorkspace tool={tool} />;
}
