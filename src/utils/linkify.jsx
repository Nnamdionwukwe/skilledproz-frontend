// src/utils/linkify.jsx
import React from "react";

export function linkify(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "underline" }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
