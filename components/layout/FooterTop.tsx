"use client";

import type { ReactNode } from "react";

export interface FooterContactItem {
  title: string;
  subtitle: string;
  icon: ReactNode;
  href?: string;
}

interface FooterTopProps {
  items: FooterContactItem[];
}

const FooterTop = ({ items }: FooterTopProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 border-b">
      {items.map((item, index) => (
        <ContactItem
          key={`${item.title}-${index}`}
          icon={item.icon}
          title={item.title}
          content={item.subtitle}
          href={item.href}
        />
      ))}
    </div>
  );
};

interface ContactItemProps {
  icon: ReactNode;
  title: string;
  content: string;
  href?: string;
}

const ContactItem = ({ icon, title, content, href }: ContactItemProps) => {
  const Component = href ? "a" : "div";
  const props = href
    ? {
        href,
        target: href.startsWith("http") ? "_blank" : "_self",
        rel: href.startsWith("http") ? "noopener noreferrer" : undefined,
      }
    : {};

  return (
    <Component
      {...props}
      className="flex items-center gap-3 group hover:bg-gray-50 p-4 transition-colors cursor-pointer"
    >
      {icon}
      <div>
        <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 text-sm mt-1 group-hover:text-gray-900 transition-colors">
          {content}
        </p>
      </div>
    </Component>
  );
};

export default FooterTop;
