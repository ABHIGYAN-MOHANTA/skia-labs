import { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import EditorClient from "./EditorClient";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const id = resolvedSearchParams?.id;

  if (id && typeof id === "string") {
    const baseUrl = "https://skialabs.dev";
    const imageUrl = `${baseUrl}/api/thumbnail/${id}`;

    return {
      title: "Skia Labs - Shader",
      description: "Check out this shader created on Skia Labs.",
      openGraph: {
        title: "Skia Labs - Shader",
        description: "Check out this shader created on Skia Labs.",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: "Shader preview",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Skia Labs - Shader",
        description: "Check out this shader created on Skia Labs.",
        images: [imageUrl],
      },
    };
  }

  return {};
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div></div>}>
      <EditorClient />
    </Suspense>
  );
}
