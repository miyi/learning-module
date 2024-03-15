import * as monaco from "https://esm.sh/monaco-editor";

export const monacoEditor = monaco.editor;

const EMPTY_ELEMENTS = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "menuitem",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
];

const DIRECTIVES = [
  "+loading",
  "+loaded",
  "+unloading",
  "+unloaded",
  "$checked",
  "$class",
  "$exist",
  "$each",
  "$focus",
  "$html",
  "$selected",
  "$style",
  "$value",
  "$watch",
];

const dgjsTokenizer = {
  root: [
    [/<!DOCTYPE/, "metatag", "@doctype"],
    [/<!--/, "comment", "@comment"],
    [
      /(<)((?:[\w\-]+:)?[\w\-]+)(\s*)(\/>)/,
      ["delimiter", "tag", "", "delimiter"],
    ],
    [/(<)(script)/, ["delimiter", { token: "tag", next: "@script" }]],
    [/(<)(style)/, ["delimiter", { token: "tag", next: "@style" }]],
    [
      /(<)((?:[\w\-]+:)?[\w\-]+)/,
      ["delimiter", { token: "tag.$2", next: "@otherTag", bracket: "@open" }],
    ],
    [
      /(<\/)((?:[\w\-]+:)?[\w\-]+)/,
      ["delimiter", { token: "tag.$2", next: "@otherTag", bracket: "@close" }],
    ],
    [/</, "delimiter"],
    [/[ \t\r\n]+/], // whitespace
    [/\$[ \t]*\{[ \t]*[a-zA-Z_$][a-zA-Z0-9_$]*[ \t]*\}/, "expression"],
    [/[^<]+/, "text"], // text
  ],

  doctype: [
    [/[^>]+/, "metatag.content"],
    [/>/, "metatag", "@pop"],
  ],

  comment: [
    [/-->/, "comment", "@pop"],
    [/[^-]+/, "comment.content"],
    [/./, "comment.content"],
  ],

  otherTag: [
    [
      /(\+)(loading|loaded|unloading|unloaded)/,
      { token: "directive", next: "@tagAfterDirective" },
    ],
    [
      /(\$)(checked|class|exist|each|focus|html|selected|style|value|watch)/,
      {
        token: "directive",
        next: "@tagAfterDirective",
      },
    ],
    [/\/?>/, "delimiter", "@pop"],
    [/"([^"]*)"/, "attribute.value"],
    [/'([^']*)'/, "attribute.value"],
    [/[\w\-]+/, "attribute.name"],
    [/=/, "delimiter"],
    [/[ \t\r\n]+/], // whitespace
  ],
  // <xxx +loading=
  tagAfterDirective: [
    [/#\w+/, "directive.decorator"], // todo: decorator
    [
      /="/,
      {
        token: "delimiter",
        next: "@tagAfterDirectiveDoubleQuote",
        nextEmbedded: "text/javascript",
      },
    ],
    [
      /='/,
      {
        token: "delimiter",
        next: "@tagAfterDirectiveQuote",
        nextEmbedded: "text/javascript",
      },
    ],
    [/["']/, "delimiter", "@pop"],
    [/[ \t\r\n]+/],
    [/\/?>/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
  ],
  // <xxx +loading="
  tagAfterDirectiveDoubleQuote: [
    [/"/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
    [/[^"]+/, ""],
  ],
  // <xxx +loading='
  tagAfterDirectiveQuote: [
    [/'/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
    [/[^']+/, ""],
  ],

  // -- BEGIN <script> tags handling

  // After <script
  script: [
    [/type/, "attribute.name", "@scriptAfterType"],
    [/"([^"]*)"/, "attribute.value"],
    [/'([^']*)'/, "attribute.value"],
    [/[\w\-]+/, "attribute.name"],
    [/=/, "delimiter"],
    [
      />/,
      {
        token: "delimiter",
        next: "@scriptEmbedded",
        nextEmbedded: "text/javascript",
      },
    ],
    [/[ \t\r\n]+/], // whitespace
    [
      /(<\/)(script\s*)(>)/,
      ["delimiter", "tag", { token: "delimiter", next: "@pop" }],
    ],
  ],

  // After <script ... type
  scriptAfterType: [
    [/=/, "delimiter", "@scriptAfterTypeEquals"],
    [
      />/,
      {
        token: "delimiter",
        next: "@scriptEmbedded",
        nextEmbedded: "text/javascript",
      },
    ], // cover invalid e.g. <script type>
    [/[ \t\r\n]+/], // whitespace
    [/<\/script\s*>/, { token: "@rematch", next: "@pop" }],
  ],

  // After <script ... type =
  scriptAfterTypeEquals: [
    [
      /"(dagger\/)?modules"/,
      {
        token: "attribute.value",
        switchTo: "@scriptWithCustomType.text/javascript",
      },
    ],
    [
      /'(dagger\/)?modules'/,
      {
        token: "attribute.value",
        switchTo: "@scriptWithCustomType.text/javascript",
      },
    ],
    [
      /"([^"]*)"/,
      {
        token: "attribute.value",
        switchTo: "@scriptWithCustomType.$1",
      },
    ],
    [
      /'([^']*)'/,
      {
        token: "attribute.value",
        switchTo: "@scriptWithCustomType.$1",
      },
    ],
    [
      />/,
      {
        token: "delimiter",
        next: "@scriptEmbedded",
        nextEmbedded: "text/javascript",
      },
    ], // cover invalid e.g. <script type=>
    [/[ \t\r\n]+/], // whitespace
    [/<\/script\s*>/, { token: "@rematch", next: "@pop" }],
  ],

  // After <script ... type = $S2
  scriptWithCustomType: [
    [
      />/,
      {
        token: "delimiter",
        next: "@scriptEmbedded.$S2",
        nextEmbedded: "$S2",
      },
    ],
    [/"([^"]*)"/, "attribute.value"],
    [/'([^']*)'/, "attribute.value"],
    [/[\w\-]+/, "attribute.name"],
    [/=/, "delimiter"],
    [/[ \t\r\n]+/], // whitespace
    [/<\/script\s*>/, { token: "@rematch", next: "@pop" }],
  ],

  scriptEmbedded: [
    [/<\/script/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
    [/[^<]+/, ""],
  ],

  // -- END <script> tags handling

  // -- BEGIN <style> tags handling

  // After <style
  style: [
    [/type/, "attribute.name", "@styleAfterType"],
    [/"([^"]*)"/, "attribute.value"],
    [/'([^']*)'/, "attribute.value"],
    [/[\w\-]+/, "attribute.name"],
    [/=/, "delimiter"],
    [
      />/,
      {
        token: "delimiter",
        next: "@styleEmbedded",
        nextEmbedded: "text/css",
      },
    ],
    [/[ \t\r\n]+/], // whitespace
    [
      /(<\/)(style\s*)(>)/,
      ["delimiter", "tag", { token: "delimiter", next: "@pop" }],
    ],
  ],

  // After <style ... type
  styleAfterType: [
    [/=/, "delimiter", "@styleAfterTypeEquals"],
    [
      />/,
      {
        token: "delimiter",
        next: "@styleEmbedded",
        nextEmbedded: "text/css",
      },
    ], // cover invalid e.g. <style type>
    [/[ \t\r\n]+/], // whitespace
    [/<\/style\s*>/, { token: "@rematch", next: "@pop" }],
  ],

  // After <style ... type =
  styleAfterTypeEquals: [
    [
      /"([^"]*)"/,
      {
        token: "attribute.value",
        switchTo: "@styleWithCustomType.$1",
      },
    ],
    [
      /'([^']*)'/,
      {
        token: "attribute.value",
        switchTo: "@styleWithCustomType.$1",
      },
    ],
    [
      />/,
      {
        token: "delimiter",
        next: "@styleEmbedded",
        nextEmbedded: "text/css",
      },
    ], // cover invalid e.g. <style type=>
    [/[ \t\r\n]+/], // whitespace
    [/<\/style\s*>/, { token: "@rematch", next: "@pop" }],
  ],

  // After <style ... type = $S2
  styleWithCustomType: [
    [
      />/,
      {
        token: "delimiter",
        next: "@styleEmbedded.$S2",
        nextEmbedded: "$S2",
      },
    ],
    [/"([^"]*)"/, "attribute.value"],
    [/'([^']*)'/, "attribute.value"],
    [/[\w\-]+/, "attribute.name"],
    [/=/, "delimiter"],
    [/[ \t\r\n]+/], // whitespace
    [/<\/style\s*>/, { token: "@rematch", next: "@pop" }],
  ],

  styleEmbedded: [
    [/<\/style/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
    [/[^<]+/, ""],
  ],

  // -- END <style> tags handling
};

monaco.languages.register({
  id: "daggerJs",
  extensions: [".html"],
  aliases: ["daggerJs", "dg"],
  mimetypes: ["text/html"],
});

monaco.languages.setMonarchTokensProvider("daggerJs", {
  ignoreCase: true,
  tokenizer: dgjsTokenizer,
});

monaco.editor.defineTheme("dgTheme", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "008800", fontStyle: "italic underline" },
    { token: "directive", foreground: "#ba99f6" },
    { token: "directive.decorator", foreground: "FF8888" },
    { token: "expression", foreground: "6bb2ab" },
  ],
  colors: {
    "editor.background": "#09151b",
  },
});

monaco.languages.setLanguageConfiguration("daggerJs", {
  wordPattern:
    /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,

  comments: {
    blockComment: ["<!--", "-->"],
  },

  brackets: [
    ["<!--", "-->"],
    ["<", ">"],
    ["{", "}"],
    ["(", ")"],
  ],

  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: "<", close: ">" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],

  surroundingPairs: [
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: "<", close: ">" },
  ],

  onEnterRules: [
    {
      beforeText: new RegExp(
        `<(?!(?:${EMPTY_ELEMENTS.join(
          "|"
        )}))([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`,
        "i"
      ),
      afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>$/i,
      action: {
        indentAction: monaco.languages.IndentAction.IndentOutdent,
      },
    },
    {
      beforeText: new RegExp(
        `<(?!(?:${EMPTY_ELEMENTS.join(
          "|"
        )}))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`,
        "i"
      ),
      action: { indentAction: monaco.languages.IndentAction.Indent },
    },
  ],

  folding: {
    markers: {
      start: new RegExp("^\\s*<!--\\s*#region\\b.*-->"),
      end: new RegExp("^\\s*<!--\\s*#endregion\\b.*-->"),
    },
  },
});

export const initMonaco = (monaco, $node) => {
  if (monaco) {
    return monaco.create($node, {
      value: [
        `<div class="card" +loading="{a: '123', b: 1}" $watch="b++">`,
        "     ${a}",
        "     ${b}",
        `</div>`,
      ].join("\n"),
      language: "daggerJs",
      theme: "dgTheme",
      minimap: {
        enabled: false,
      },
      fontSize: "20px",
      scrollbar: {
        vertical: "hidden",
        horizontal: "hidden",
      },
      wordWrap: 'on',
      automaticLayout: true
    });
  }
};
export const downloadCode=(monaco) => {
    const url = getGeneratedPageURL(monaco.getModels()[0].getValue());
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(url);
}

export const getGeneratedPageURL = (html) => {
  const dagger_cdn = "https://cdn.jsdelivr.net/npm/@miyi/dagger.js@0.9.22";
  const getBlobURL = (code, type) => {
    const blob = new Blob([code], { type });
    return URL.createObjectURL(blob);
  };

  const source = `<html lang="en">
  <head>
    <script type="module" crossorigin="anonymous" src="${dagger_cdn}" defer>
    </script><script type="dagger/modules"></script>
    <title>Dagger JS Learning Module</title>
  </head>
  <body>
${html || ""}
  </body>
</html>
`;

  return getBlobURL(source, "text/html");
};
export const getData = (URI, monaco) => {
  fetch(URI)
    .then((res) => res.text())
    .then((text) => {
      monaco.getModels()[0].setValue(text);
    });
};

export const loadEditor = (code, $scope) => {
  $scope.monaco.getModels()[0].setValue(code);
  $scope.editorValue = $scope.editor.getValue();
};

export const resetEditor = (monaco) => {
  let value =  [
        `<div class="card" +loading="{a: '123', b: 1}" $watch="b++">`,
        "     ${a}",
        "     ${b}",
        `</div>`,
      ].join("\n");
    monaco.getModels()[0].setValue(value);
}