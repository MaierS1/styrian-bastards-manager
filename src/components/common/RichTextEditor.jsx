import { useCallback, useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { colors, isMobile } from '../../styles/appStyles'
import { normalizeRichTextHtml } from '../../utils/sanitizeHtml'

const toolbarButtonStyle = (active = false, disabled = false) => ({
  minWidth: 42,
  minHeight: 40,
  padding: '8px 10px',
  border: `1px solid ${active ? colors.red : colors.border}`,
  borderRadius: 8,
  background: active ? colors.red : colors.white,
  color: active ? colors.white : colors.black,
  fontWeight: 900,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
})

const selectStyle = {
  minHeight: 40,
  padding: '8px 10px',
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  background: colors.white,
  color: colors.black,
  fontWeight: 800,
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Text eingeben...',
  disabled = false,
  minHeight = 180,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        inline: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(normalizeRichTextHtml(currentEditor.getHTML()))
    },
  })

  useEffect(() => {
    if (!editor) return

    editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) return

    const sanitizedValue = normalizeRichTextHtml(value)
    if (sanitizedValue !== normalizeRichTextHtml(editor.getHTML())) {
      editor.commands.setContent(sanitizedValue || '', false)
    }
  }, [editor, value])

  const runCommand = useCallback((command) => {
    if (!editor || disabled) return
    command(editor.chain().focus()).run()
  }, [disabled, editor])

  const setLink = useCallback(() => {
    if (!editor || disabled) return

    const previousUrl = editor.getAttributes('link').href || ''
    const url = window.prompt('Link-URL', previousUrl)

    if (url === null) return

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmedUrl }).run()
  }, [disabled, editor])

  if (!editor) return null

  return (
    <div style={editorShellStyle}>
      <style>{editorCss}</style>
      <div style={toolbarStyle}>
        <button type="button" style={toolbarButtonStyle(editor.isActive('bold'), disabled)} onClick={() => runCommand((chain) => chain.toggleBold())} disabled={disabled} title="Fett">
          B
        </button>
        <button type="button" style={toolbarButtonStyle(editor.isActive('italic'), disabled)} onClick={() => runCommand((chain) => chain.toggleItalic())} disabled={disabled} title="Kursiv">
          I
        </button>

        <select
          value={getHeadingValue(editor)}
          onChange={(event) => {
            const value = event.target.value
            if (value === 'paragraph') runCommand((chain) => chain.setParagraph())
            if (value === 'heading2') runCommand((chain) => chain.toggleHeading({ level: 2 }))
            if (value === 'heading3') runCommand((chain) => chain.toggleHeading({ level: 3 }))
          }}
          style={selectStyle}
          disabled={disabled}
          title="Absatzformat"
        >
          <option value="paragraph">Absatz</option>
          <option value="heading2">Überschrift</option>
          <option value="heading3">Zwischentitel</option>
        </select>

        <button type="button" style={toolbarButtonStyle(editor.isActive('bulletList'), disabled)} onClick={() => runCommand((chain) => chain.toggleBulletList())} disabled={disabled} title="Liste">
          Liste
        </button>
        <button type="button" style={toolbarButtonStyle(editor.isActive('orderedList'), disabled)} onClick={() => runCommand((chain) => chain.toggleOrderedList())} disabled={disabled} title="Nummerierte Liste">
          1.
        </button>
        <button type="button" style={toolbarButtonStyle(editor.isActive('blockquote'), disabled)} onClick={() => runCommand((chain) => chain.toggleBlockquote())} disabled={disabled} title="Zitat">
          Zitat
        </button>
        <button type="button" style={toolbarButtonStyle(false, disabled)} onClick={() => runCommand((chain) => chain.setHorizontalRule())} disabled={disabled} title="Trennlinie">
          Linie
        </button>
        <button type="button" style={toolbarButtonStyle(editor.isActive('link'), disabled)} onClick={setLink} disabled={disabled} title="Link einfügen">
          Link
        </button>
        <button type="button" style={toolbarButtonStyle(false, disabled || !editor.isActive('link'))} onClick={() => runCommand((chain) => chain.unsetLink())} disabled={disabled || !editor.isActive('link')} title="Link entfernen">
          Link aus
        </button>
        <button type="button" style={toolbarButtonStyle(false, disabled)} onClick={() => runCommand((chain) => chain.undo())} disabled={disabled} title="Rückgängig">
          Zurück
        </button>
        <button type="button" style={toolbarButtonStyle(false, disabled)} onClick={() => runCommand((chain) => chain.redo())} disabled={disabled} title="Wiederholen">
          Vor
        </button>
      </div>

      <div
        style={{
          ...editorContentStyle,
          minHeight,
          opacity: disabled ? 0.72 : 1,
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function getHeadingValue(editor) {
  if (editor.isActive('heading', { level: 2 })) return 'heading2'
  if (editor.isActive('heading', { level: 3 })) return 'heading3'
  return 'paragraph'
}

const editorShellStyle = {
  width: '100%',
  marginBottom: 12,
  border: `2px solid ${colors.border}`,
  borderRadius: 12,
  background: colors.white,
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

const toolbarStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  padding: isMobile ? 8 : 10,
  borderBottom: `1px solid ${colors.border}`,
  background: colors.offWhite,
}

const editorContentStyle = {
  padding: isMobile ? 14 : 16,
  color: colors.text,
  fontSize: isMobile ? 17 : 16,
  lineHeight: 1.6,
  outline: 'none',
}

const editorCss = `
.ProseMirror {
  min-height: inherit;
  outline: none;
}
.ProseMirror p,
.ProseMirror h2,
.ProseMirror h3,
.ProseMirror ul,
.ProseMirror ol,
.ProseMirror blockquote {
  margin-top: 0;
  margin-bottom: 0.85em;
}
.ProseMirror ul,
.ProseMirror ol {
  padding-left: 1.35em;
}
.ProseMirror blockquote {
  border-left: 4px solid ${colors.red};
  padding-left: 12px;
  color: ${colors.muted};
}
.ProseMirror hr {
  border: 0;
  border-top: 2px solid ${colors.border};
  margin: 16px 0;
}
.ProseMirror a {
  color: ${colors.blue};
  text-decoration: underline;
}
.ProseMirror p.is-editor-empty:first-child::before {
  color: ${colors.muted};
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
`
