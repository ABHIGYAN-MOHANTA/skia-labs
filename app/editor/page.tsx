import { Suspense } from "react";
import EditorClient from "./EditorClient";

export default function EditorPage() {
  return (
    <Suspense fallback={<div></div>}>
      <EditorClient />
    </Suspense>
  );
}
