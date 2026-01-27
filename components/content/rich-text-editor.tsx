"use client";

import { useState, useCallback } from "react";
import { Bold, Italic, Link, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * RichTextEditor Props
 */
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  minHeight?: string;
  className?: string;
}

/**
 * Formatting button props
 */
interface FormatButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * FormatButton Component
 */
function FormatButton({ icon, label, onClick, disabled }: FormatButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
    >
      {icon}
    </Button>
  );
}

/**
 * RichTextEditor Component
 *
 * A simple rich text editor for text posts.
 * Supports basic markdown-style formatting: bold, italic, links, lists.
 *
 * Note: This is a simplified implementation using markdown syntax.
 * For a full WYSIWYG experience, consider using Tiptap or Slate.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your post...",
  disabled = false,
  maxLength = 50000,
  minHeight = "200px",
  className,
}: RichTextEditorProps) {
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(
    null,
  );

  /**
   * Insert formatting around selected text
   */
  const insertFormatting = useCallback(
    (prefix: string, suffix: string = prefix) => {
      if (!textareaRef) return;

      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const selectedText = value.substring(start, end);

      const newText =
        value.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        value.substring(end);

      onChange(newText);

      // Restore cursor position
      setTimeout(() => {
        textareaRef.focus();
        if (selectedText) {
          textareaRef.setSelectionRange(
            start + prefix.length,
            end + prefix.length,
          );
        } else {
          textareaRef.setSelectionRange(
            start + prefix.length,
            start + prefix.length,
          );
        }
      }, 0);
    },
    [textareaRef, value, onChange],
  );

  /**
   * Insert list formatting at the start of the current line
   */
  const insertList = useCallback(
    (listPrefix: string) => {
      if (!textareaRef) return;

      const start = textareaRef.selectionStart;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;

      const newText =
        value.substring(0, lineStart) + listPrefix + value.substring(lineStart);

      onChange(newText);

      // Move cursor after the prefix
      setTimeout(() => {
        textareaRef.focus();
        const newPosition = lineStart + listPrefix.length;
        textareaRef.setSelectionRange(newPosition, newPosition);
      }, 0);
    },
    [textareaRef, value, onChange],
  );

  /**
   * Insert link
   */
  const insertLink = useCallback(() => {
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = value.substring(start, end);

    const linkText = selectedText || "link text";
    const linkFormat = `[${linkText}](url)`;

    const newText =
      value.substring(0, start) + linkFormat + value.substring(end);

    onChange(newText);

    // Select the URL part for easy editing
    setTimeout(() => {
      textareaRef.focus();
      const urlStart = start + linkText.length + 3; // After "[text]("
      const urlEnd = urlStart + 3; // "url"
      textareaRef.setSelectionRange(urlStart, urlEnd);
    }, 0);
  }, [textareaRef, value, onChange]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            insertFormatting("**");
            break;
          case "i":
            e.preventDefault();
            insertFormatting("*");
            break;
          case "k":
            e.preventDefault();
            insertLink();
            break;
        }
      }
    },
    [insertFormatting, insertLink],
  );

  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.9;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
        <FormatButton
          icon={<Bold className="size-4" />}
          label="Bold (Cmd+B)"
          onClick={() => insertFormatting("**")}
          disabled={disabled}
        />
        <FormatButton
          icon={<Italic className="size-4" />}
          label="Italic (Cmd+I)"
          onClick={() => insertFormatting("*")}
          disabled={disabled}
        />
        <FormatButton
          icon={<Link className="size-4" />}
          label="Link (Cmd+K)"
          onClick={insertLink}
          disabled={disabled}
        />

        <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <FormatButton
          icon={<List className="size-4" />}
          label="Bullet list"
          onClick={() => insertList("- ")}
          disabled={disabled}
        />
        <FormatButton
          icon={<ListOrdered className="size-4" />}
          label="Numbered list"
          onClick={() => insertList("1. ")}
          disabled={disabled}
        />

        {/* Character count */}
        <div className="ml-auto pr-2">
          <span
            className={cn(
              "text-xs",
              isOverLimit
                ? "text-destructive"
                : isNearLimit
                  ? "text-orange-600 dark:text-orange-500"
                  : "text-muted-foreground",
            )}
          >
            {characterCount.toLocaleString()}/{maxLength.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Editor */}
      <Textarea
        ref={setTextareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "resize-none font-mono text-sm",
          isOverLimit && "border-destructive focus-visible:ring-destructive",
        )}
        style={{ minHeight }}
        aria-label="Post content"
        aria-describedby="editor-help"
      />

      {/* Help text */}
      <p id="editor-help" className="text-xs text-muted-foreground">
        Use markdown for formatting: **bold**, *italic*, [link](url)
      </p>
    </div>
  );
}
