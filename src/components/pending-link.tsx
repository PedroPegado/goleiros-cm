"use client";
import NextLink, { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
import { useRef, type ComponentProps } from "react";

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className="navigation-pending" role="status">
      <LoaderCircle size={16} className="spin" />
      Carregando...
    </span>
  ) : null;
}
export default function Link({
  children,
  onNavigate,
  ...props
}: ComponentProps<typeof NextLink>) {
  const element = useRef<HTMLAnchorElement>(null);
  return (
    <NextLink
      {...props}
      ref={element}
      onNavigate={(event) => {
        if (element.current?.querySelector(".navigation-pending"))
          event.preventDefault();
        else onNavigate?.(event);
      }}
    >
      {children}
      <Pending />
    </NextLink>
  );
}
