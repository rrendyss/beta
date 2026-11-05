import type { ReactNode } from "react";

/** Layout overlay: latar transparan untuk OBS browser source. */
export default function OverlayLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{"html,body{background:transparent!important;margin:0;overflow:hidden;}"}</style>
      {children}
    </>
  );
}
