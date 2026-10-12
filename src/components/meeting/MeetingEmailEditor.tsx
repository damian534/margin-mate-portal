import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MeetingEmailEditor({ value, onChange, disabled }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable: !disabled,
    editorProps: { attributes: {
      role: 'textbox', 'aria-label': 'Email message', 'aria-multiline': 'true',
      class: 'prose prose-sm max-w-none min-h-[280px] p-5 focus:outline-none text-foreground prose-headings:text-foreground prose-headings:font-semibold prose-headings:text-base prose-p:my-3 prose-li:my-1 break-words',
    } },
    onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
  });

  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);

  if (!editor) return null;
  const tools = [
    { label: 'Bold', icon: Bold, active: editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
    { label: 'Italic', icon: Italic, active: editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Bullet list', icon: List, active: editor.isActive('bulletList'), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered list', icon: ListOrdered, active: editor.isActive('orderedList'), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Undo', icon: Undo2, active: false, run: () => editor.chain().focus().undo().run() },
    { label: 'Redo', icon: Redo2, active: false, run: () => editor.chain().focus().redo().run() },
  ];
  return (
    <div className="rounded-md border bg-background overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b bg-muted/30 p-1.5" role="toolbar" aria-label="Email formatting">
        {tools.map(tool => <Button key={tool.label} type="button" size="icon" variant={tool.active ? 'secondary' : 'ghost'} className="h-8 w-8" title={tool.label} aria-label={tool.label} aria-pressed={tool.active} disabled={disabled} onClick={tool.run}><tool.icon className="h-4 w-4" /></Button>)}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}