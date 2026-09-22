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
        useDarkTheme={false}
        styles={{
          variables: {
            light: {
              diffViewerBackground: "transparent",
            },
          },
        }}
      />
    </div>
  );
}
