"use client";

import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";

type EssayDiffProps = {
  userText: string;
  modelText: string;
};

export function EssayDiff({ userText, modelText }: EssayDiffProps) {
  return (
    <div className="overflow-x-auto rounded-lg border text-sm">
      <ReactDiffViewer
        oldValue={userText}
        newValue={modelText}
        splitView
        compareMethod={DiffMethod.WORDS}
        leftTitle="Bài của bạn"
        rightTitle="Band 6 mẫu"
        useDarkTheme
        styles={{
          variables: {
            dark: {
              diffViewerBackground: "transparent",
              diffViewerColor: "var(--foreground)",
              addedBackground: "color-mix(in oklab, var(--primary) 22%, transparent)",
              removedBackground: "color-mix(in oklab, var(--destructive) 22%, transparent)",
              wordAddedBackground: "color-mix(in oklab, var(--primary) 35%, transparent)",
              wordRemovedBackground: "color-mix(in oklab, var(--destructive) 35%, transparent)",
              addedGutterBackground: "color-mix(in oklab, var(--primary) 18%, transparent)",
              removedGutterBackground: "color-mix(in oklab, var(--destructive) 18%, transparent)",
              gutterBackground: "var(--muted)",
              gutterBackgroundDark: "var(--muted)",
              highlightBackground: "color-mix(in oklab, var(--accent) 20%, transparent)",
              highlightGutterBackground: "color-mix(in oklab, var(--accent) 20%, transparent)",
              codeFoldGutterBackground: "var(--muted)",
              codeFoldBackground: "var(--card)",
              emptyLineBackground: "transparent",
              gutterColor: "var(--muted-foreground)",
              addedColor: "var(--foreground)",
              removedColor: "var(--foreground)",
              codeFoldContentColor: "var(--muted-foreground)",
              diffViewerTitleBackground: "var(--card)",
              diffViewerTitleColor: "var(--foreground)",
              diffViewerTitleBorderColor: "var(--border)",
            },
          },
        }}
      />
    </div>
  );
}
