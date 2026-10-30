'use strict';
(() => {
  const host = document.getElementById('editor-host');
  let editor = null;
  let applying = false;

  function boot() {
    require.config({ paths: { vs: 'vendor/vs' } });
    require(['vs/editor/editor.main'], () => {
      monaco.editor.defineTheme('axiom', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '5f5878', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'c084fc' },
          { token: 'string', foreground: '7ee0b0' },
          { token: 'number', foreground: 'ffd479' },
          { token: 'identifier', foreground: 'e8e4f5' },
          { token: 'delimiter', foreground: '9d95b8' }
        ],
        colors: {
          'editor.background': '#08070d',
          'editor.foreground': '#ece9f6',
          'editorLineNumber.foreground': '#3b3450',
          'editorLineNumber.activeForeground': '#a855f7',
          'editor.lineHighlightBackground': '#100d18',
          'editor.selectionBackground': '#3d2a5e',
          'editorCursor.foreground': '#ffffff',
          'editorIndentGuide.background': '#1b1728',
          'editorGutter.background': '#08070d',
          'minimap.background': '#08070d',
          'scrollbarSlider.background': '#241f3380'
        }
      });

      editor = monaco.editor.create(host, {
        value: '',
        language: 'lua',
        theme: 'axiom',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
        fontLigatures: true,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderLineHighlight: 'all',
        roundedSelection: true,
        padding: { top: 14, bottom: 60 },
        minimap: { enabled: true, renderCharacters: false, maxColumn: 90 },
        scrollBeyondLastLine: false,
        tabSize: 2,
        wordWrap: 'on',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }
      });

      editor.onDidChangeModelContent(() => {
        if (applying) return;
        const tab = window.Tabs.active();
        if (tab) window.Tabs.setCode(tab.id, editor.getValue());
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => { if (window.executeActive) window.executeActive(); });
      editor.addCommand(monaco.KeyCode.F5, () => { if (window.executeActive) window.executeActive(); });

      window.Editor = {
        setValue(code) {
          applying = true;
          const model = editor.getModel();
          if (model) {
            const pos = editor.getPosition();
            editor.setValue(code);
            if (pos) editor.setPosition(pos);
          }
          applying = false;
        },
        value: () => editor.getValue(),
        focus: () => editor.focus(),
        options: (o) => editor.updateOptions(o),
        format: () => { const a = editor.getAction('editor.action.formatDocument'); if (a) a.run(); }
      };

      window.dispatchEvent(new Event('editor-ready'));
    });
  }

  boot();
})();
