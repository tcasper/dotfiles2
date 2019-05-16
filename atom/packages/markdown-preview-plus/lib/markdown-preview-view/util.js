"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const util_1 = require("../util");
function editorForId(editorId) {
    for (const editor of atom.workspace.getTextEditors()) {
        if (editor.id === editorId) {
            return editor;
        }
    }
    return undefined;
}
exports.editorForId = editorForId;
let getStylesOverride = undefined;
function __setGetStylesOverride(f) {
    getStylesOverride = f;
}
exports.__setGetStylesOverride = __setGetStylesOverride;
function* getStyles(context) {
    const elements = atom.styles.getStyleElements();
    for (const element of elements) {
        if (context === undefined || element.getAttribute('context') === context) {
            yield element.innerText;
        }
    }
}
function getClientStyle(file) {
    return atom.themes.loadStylesheet(path.join(__dirname, '..', '..', 'styles-client', `${file}.less`));
}
function getUserStyles() {
    const el = atom.styles.styleElementsBySourcePath[atom.styles.getUserStyleSheetPath()];
    if (!el)
        return [];
    return [el.innerText];
}
exports.getUserStyles = getUserStyles;
function getSyntaxTheme(themeName) {
    if (themeName !== '') {
        const themes = atom.themes.getLoadedThemes();
        if (themes) {
            const [theme] = themes.filter((x) => x.name === themeName);
            if (theme) {
                const stshts = theme
                    .getStylesheetPaths()
                    .map((p) => atom.themes.loadStylesheet(p));
                return processEditorStyles(stshts);
            }
        }
        atom.notifications.addWarning('Failed to load syntax theme', {
            detail: `Markdown-preview-plus couldn't find '${themeName}'`,
        });
    }
    return processEditorStyles(getStyles('atom-text-editor'));
}
function* getActivePackageStyles(packageName) {
    const pack = atom.packages.getActivePackage(packageName);
    if (!pack)
        return;
    const stylesheets = pack.getStylesheetPaths();
    for (const ss of stylesheets) {
        const element = atom.styles.styleElementsBySourcePath[ss];
        if (element)
            yield element.innerText;
    }
}
function getPreviewStyles(display) {
    if (getStylesOverride)
        return getStylesOverride(display);
    const styles = [];
    if (display) {
        const globalStyles = atom.styles.styleElementsBySourcePath['global-text-editor-styles'];
        if (globalStyles) {
            styles.push(...processWorkspaceStyles([globalStyles.innerText]));
        }
        styles.push(getClientStyle('editor-global-font'));
        const packList = util_1.atomConfig().importPackageStyles;
        if (packList.includes('*')) {
            styles.push(...processEditorStyles(getStyles()));
            styles.push(getClientStyle('patch'));
        }
        else {
            for (const pack of packList) {
                styles.push(...processEditorStyles(getActivePackageStyles(pack)));
            }
            if (packList.includes('fonts')) {
                const fontsVar = atom.styles.styleElementsBySourcePath['fonts-package-editorfont'];
                if (fontsVar)
                    styles.push(...processEditorStyles([fontsVar.innerText]));
            }
        }
    }
    styles.push(getClientStyle('generic'));
    if (display)
        styles.push(getClientStyle('display'));
    if (util_1.atomConfig().useGitHubStyle) {
        styles.push(getClientStyle('github'));
    }
    else {
        styles.push(getClientStyle('default'));
    }
    styles.push(...getSyntaxTheme(util_1.atomConfig().syntaxThemeName));
    styles.push(...processEditorStyles(getUserStyles()));
    return styles;
}
exports.getPreviewStyles = getPreviewStyles;
function* processEditorStyles(styles) {
    for (const style of styles) {
        yield style.replace(/\batom-text-editor\b/g, 'pre.editor-colors');
    }
}
function* processWorkspaceStyles(styles) {
    for (const style of styles) {
        yield style.replace(/\batom-workspace\b/g, ':root');
    }
}
function getMarkdownPreviewCSS() {
    const cssUrlRefExp = /url\(atom:\/\/markdown-preview-plus\/assets\/(.*)\)/;
    return getPreviewStyles(false)
        .join('\n')
        .replace(cssUrlRefExp, function (_match, assetsName, _offset, _string) {
        const assetPath = path.join(__dirname, '../../assets', assetsName);
        const originalData = fs.readFileSync(assetPath, 'binary');
        const base64Data = new Buffer(originalData, 'binary').toString('base64');
        return `url('data:image/jpeg;base64,${base64Data}')`;
    });
}
function decodeTag(token) {
    if (token.tag === 'math') {
        return 'span';
    }
    if (token.tag === 'code') {
        return 'atom-text-editor';
    }
    if (token.tag === '') {
        return null;
    }
    return token.tag;
}
function buildLineMap(tokens) {
    const lineMap = {};
    const tokenTagCount = {};
    tokenTagCount[0] = {};
    for (const token of tokens) {
        if (token.hidden)
            continue;
        if (token.map == null)
            continue;
        const tag = decodeTag(token);
        if (tag === null)
            continue;
        if (token.nesting === 1) {
            for (let line = token.map[0]; line < token.map[1]; line += 1) {
                if (lineMap[line] == null)
                    lineMap[line] = [];
                lineMap[line].push({
                    tag: tag,
                    index: tokenTagCount[token.level][tag] || 0,
                });
            }
            tokenTagCount[token.level + 1] = {};
        }
        else if (token.nesting === 0) {
            for (let line = token.map[0]; line < token.map[1]; line += 1) {
                if (lineMap[line] == null)
                    lineMap[line] = [];
                lineMap[line].push({
                    tag: tag,
                    index: tokenTagCount[token.level][tag] || 0,
                });
            }
        }
        const ttc = tokenTagCount[token.level][tag];
        tokenTagCount[token.level][tag] = ttc ? ttc + 1 : 1;
    }
    return lineMap;
}
exports.buildLineMap = buildLineMap;
function mathJaxScript(texConfig) {
    return `\
<script type="text/x-mathjax-config">
  MathJax.Hub.Config({
    jax: ["input/TeX","output/HTML-CSS"],
    extensions: ["[a11y]/accessibility-menu.js"],
    'HTML-CSS': {
      availableFonts: [],
      webFont: 'TeX',
      undefinedFamily: ${JSON.stringify(util_1.atomConfig().mathConfig.undefinedFamily)},
      mtextFontInherit: true,
    },
    TeX: ${JSON.stringify(texConfig, undefined, 2)},
    showMathMenu: true
  });
</script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/MathJax.js"></script>`;
}
function mkHtml(title, html, renderLaTeX, texConfig) {
    let maybeMathJaxScript;
    if (renderLaTeX) {
        maybeMathJaxScript = mathJaxScript(texConfig);
    }
    else {
        maybeMathJaxScript = '';
    }
    return `\
<!DOCTYPE html>
<html data-markdown-preview-plus-context="html-export">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>${maybeMathJaxScript}
    <style>${getMarkdownPreviewCSS()}</style>
${html.head.innerHTML}
  </head>
  <body>
    ${html.body.innerHTML}
  </body>
</html>
`;
}
exports.mkHtml = mkHtml;
function destroy(item) {
    const pane = atom.workspace.paneForItem(item);
    if (pane)
        util_1.handlePromise(pane.destroyItem(item));
}
exports.destroy = destroy;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYXJrZG93bi1wcmV2aWV3LXZpZXcvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLDZCQUE0QjtBQUM1Qix5QkFBd0I7QUFFeEIsa0NBQW1EO0FBRW5ELFNBQWdCLFdBQVcsQ0FBQyxRQUFnQjtJQUMxQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLEVBQUU7UUFDcEQsSUFBSSxNQUFNLENBQUMsRUFBRSxLQUFLLFFBQVEsRUFBRTtZQUMxQixPQUFPLE1BQU0sQ0FBQTtTQUNkO0tBQ0Y7SUFDRCxPQUFPLFNBQVMsQ0FBQTtBQUNsQixDQUFDO0FBUEQsa0NBT0M7QUFHRCxJQUFJLGlCQUFpQixHQUF3QyxTQUFTLENBQUE7QUFFdEUsU0FBZ0Isc0JBQXNCLENBQUMsQ0FBMkI7SUFDaEUsaUJBQWlCLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZCLENBQUM7QUFGRCx3REFFQztBQUVELFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUF1QjtJQUN6QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUE7SUFFL0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUU7UUFDOUIsSUFBSSxPQUFPLEtBQUssU0FBUyxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssT0FBTyxFQUFFO1lBQ3hFLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQTtTQUN4QjtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLElBQVk7SUFDbEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUNsRSxDQUFBO0FBQ0gs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V0FBVyxFQUFFO1FBQ2Ysa0JBQWtCLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0tBQzlDO1NBQU07UUFDTCxrQkFBa0IsR0FBRyxFQUFFLENBQUE7S0FDeEI7SUFDRCxPQUFPOzs7OzthQUtJLEtBQUssV0FBVyxrQkFBa0I7YUFDbEMscUJBQXFCLEVBQUU7RUFDbEMsSUFBSSxDQUFDLElBQUssQ0FBQyxTQUFTOzs7TUFHaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTOzs7Q0FHeEIsQ0FBQTtBQUNELENBQUM7QUExQkQsd0JBMEJDO0FBRUQsU0FBZ0IsT0FBTyxDQUFDLElBQVk7SUFDbEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0MsSUFBSSxJQUFJO1FBQUUsb0JBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7QUFDakQsQ0FBQztBQUhELDBCQUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGV4dEVkaXRvciB9IGZyb20gJ2F0b20nXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCBUb2tlbiA9IHJlcXVpcmUoJ21hcmtkb3duLWl0L2xpYi90b2tlbicpXG5pbXBvcnQgeyBoYW5kbGVQcm9taXNlLCBhdG9tQ29uZmlnIH0gZnJvbSAnLi4vdXRpbCdcblxuZXhwb3J0IGZ1bmN0aW9uIGVkaXRvckZvcklkKGVkaXRvcklkOiBudW1iZXIpOiBUZXh0RWRpdG9yIHwgdW5kZWZpbmVkIHtcbiAgZm9yIChjb25zdCBlZGl0b3Igb2YgYXRvbS53b3Jrc3BhY2UuZ2V0VGV4dEVkaXRvcnMoKSkge1xuICAgIGlmIChlZGl0b3IuaWQgPT09IGVkaXRvcklkKSB7XG4gICAgICByZXR1cm4gZWRpdG9yXG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWRcbn1cblxuLy8gdGhpcyB3ZWlyZG5lc3MgYWxsb3dzIG92ZXJyaWRpbmcgaW4gdGVzdHNcbmxldCBnZXRTdHlsZXNPdmVycmlkZTogdHlwZW9mIGdldFByZXZpZXdTdHlsZXMgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuZXhwb3J0IGZ1bmN0aW9uIF9fc2V0R2V0U3R5bGVzT3ZlcnJpZGUoZj86IHR5cGVvZiBnZXRQcmV2aWV3U3R5bGVzKSB7XG4gIGdldFN0eWxlc092ZXJyaWRlID0gZlxufVxuXG5mdW5jdGlvbiogZ2V0U3R5bGVzKGNvbnRleHQ/OiBzdHJpbmcgfCBudWxsKTogSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgY29uc3QgZWxlbWVudHMgPSBhdG9tLnN0eWxlcy5nZXRTdHlsZUVsZW1lbnRzKClcblxuICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcbiAgICBpZiAoY29udGV4dCA9PT0gdW5kZWZpbmVkIHx8IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdjb250ZXh0JykgPT09IGNvbnRleHQpIHtcbiAgICAgIHlpZWxkIGVsZW1lbnQuaW5uZXJUZXh0XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldENsaWVudFN0eWxlKGZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBhdG9tLnRoZW1lcy5sb2FkU3R5bGVzaGVldChcbiAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnc3R5bGVzLWNsaWVudCcsIGAke2ZpbGV9Lmxlc3NgKSxcbiAgKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VXNlclN0eWxlcygpIHtcbiAgY29uc3QgZWwgPVxuICAgIGF0b20uc3R5bGVzLnN0eWxlRWxlbWVudHNCeVNvdXJjZVBhdGhbYXRvbS5zdHlsZXMuZ2V0VXNlclN0eWxlU2hlZXRQYXRoKCldXG4gIGlmICghZWwpIHJldHVybiBbXVxuICByZXR1cm4gW2VsLmlubmVyVGV4dF1cbn1cblxuZnVuY3Rpb24gZ2V0U3ludGF4VGhlbWUodGhlbWVOYW1lOiBzdHJpbmcpOiBJdGVyYWJsZTxzdHJpbmc+IHtcbiAgaWYgKHRoZW1lTmFtZSAhPT0gJycpIHtcbiAgICBjb25zdCB0aGVtZXMgPSBhdG9tLnRoZW1lcy5nZXRMb2FkZWRUaGVtZXMoKVxuICAgIGlmICh0aGVtZXMpIHtcbiAgICAgIGNvbnN0IFt0aGVtZV0gPSB0aGVtZXMuZmlsdGVyKCh4KSA9PiB4Lm5hbWUgPT09IHRoZW1lTmFtZSlcbiAgICAgIGlmICh0aGVtZSkge1xuICAgICAgICBjb25zdCBzdHNodHMgPSB0aGVtZVxuICAgICAgICAgIC5nZXRTdHlsZXNoZWV0UGF0aHMoKVxuICAgICAgICAgIC5tYXAoKHApID0+IGF0b20udGhlbWVzLmxvYWRTdHlsZXNoZWV0KHApKVxuICAgICAgICByZXR1cm4gcHJvY2Vzc0VkaXRvclN0eWxlcyhzdHNodHMpXG4gICAgICB9XG4gICAgfVxuICAgIGF0b20ubm90aWZpY2F0aW9ucy5hZGRXYXJuaW5nKCdGYWlsZWQgdG8gbG9hZCBzeW50YXggdGhlbWUnLCB7XG4gICAgICBkZXRhaWw6IGBNYXJrZG93bi1wcmV2aWV3LXBsdXMgY291bGRuJ3QgZmluZCAnJHt0aGVtZU5hbWV9J2AsXG4gICAgfSlcbiAgfVxuICAvLyBkZWZhdWx0XG4gIHJldHVybiBwcm9jZXNzRWRpdG9yU3R5bGVzKGdldFN0eWxlcygnYXRvbS10ZXh0LWVkaXRvcicpKVxufVxuXG5mdW5jdGlvbiogZ2V0QWN0aXZlUGFja2FnZVN0eWxlcyhcbiAgcGFja2FnZU5hbWU6IHN0cmluZyxcbik6IEl0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPiB7XG4gIGNvbnN0IHBhY2sgPSBhdG9tLnBhY2thZ2VzLmdldEFjdGl2ZVBhY2thZ2UocGFja2FnZU5hbWUpXG4gIGlmICghcGFjaykgcmV0dXJuXG4gIGNvbnN0IHN0eWxlc2hlZXRzID0gcGFjay5nZXRTdHlsZXNoZWV0UGF0aHMoKVxuICBmb3IgKGNvbnN0IHNzIG9mIHN0eWxlc2hlZXRzKSB7XG4gICAgY29uc3QgZWxlbWVudCA9IGF0b20uc3R5bGVzLnN0eWxlRWxlbWVudHNCeVNvdXJjZVBhdGhbc3NdXG4gICAgaWYgKGVsZW1lbnQpIHlpZWxkIGVsZW1lbnQuaW5uZXJUZXh0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByZXZpZXdTdHlsZXMoZGlzcGxheTogYm9vbGVhbik6IHN0cmluZ1tdIHtcbiAgaWYgKGdldFN0eWxlc092ZXJyaWRlKSByZXR1cm4gZ2V0U3R5bGVzT3ZlcnJpZGUoZGlzcGxheSlcbiAgY29uc3Qgc3R5bGVzID0gW11cbiAgaWYgKGRpc3BsYXkpIHtcbiAgICAvLyBnbG9iYWwgZWRpdG9yIHN0eWxlc1xuICAgIGNvbnN0IGdsb2JhbFN0eWxlcyA9XG4gICAgICBhdG9tLnN0eWxlcy5zdHlsZUVsZW1lbnRzQnlTb3VyY2VQYXRoWydnbG9iYWwtdGV4dC1lZGl0b3Itc3R5bGVzJ11cbiAgICBpZiAoZ2xvYmFsU3R5bGVzKSB7XG4gICAgICBzdHlsZXMucHVzaCguLi5wcm9jZXNzV29ya3NwYWNlU3R5bGVzKFtnbG9iYWxTdHlsZXMuaW5uZXJUZXh0XSkpXG4gICAgfVxuICAgIHN0eWxlcy5wdXNoKGdldENsaWVudFN0eWxlKCdlZGl0b3ItZ2xvYmFsLWZvbnQnKSlcbiAgICAvLyBwYWNrYWdlIHN0eWxlc1xuICAgIGNvbnN0IHBhY2tMaXN0ID0gYXRvbUNvbmZpZygpLmltcG9ydFBhY2thZ2VTdHlsZXNcbiAgICBpZiAocGFja0xpc3QuaW5jbHVkZXMoJyonKSkge1xuICAgICAgc3R5bGVzLnB1c2goLi4ucHJvY2Vzc0VkaXRvclN0eWxlcyhnZXRTdHlsZXMoKSkpXG4gICAgICBzdHlsZXMucHVzaChnZXRDbGllbnRTdHlsZSgncGF0Y2gnKSlcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChjb25zdCBwYWNrIG9mIHBhY2tMaXN0KSB7XG4gICAgICAgIHN0eWxlcy5wdXNoKC4uLnByb2Nlc3NFZGl0b3JTdHlsZXMoZ2V0QWN0aXZlUGFja2FnZVN0eWxlcyhwYWNrKSkpXG4gICAgICB9XG4gICAgICAvLyBleHBsaWNpdCBjb21wYXRpYmlsaXR5IHdpdGggdGhlIGZvbnRzIHBhY2thZ2VcbiAgICAgIGlmIChwYWNrTGlzdC5pbmNsdWRlcygnZm9udHMnKSkge1xuICAgICAgICBjb25zdCBmb250c1ZhciA9XG4gICAgICAgICAgYXRvbS5zdHlsZXMuc3R5bGVFbGVtZW50c0J5U291cmNlUGF0aFsnZm9udHMtcGFja2FnZS1lZGl0b3Jmb250J11cbiAgICAgICAgaWYgKGZvbnRzVmFyKSBzdHlsZXMucHVzaCguLi5wcm9jZXNzRWRpdG9yU3R5bGVzKFtmb250c1Zhci5pbm5lclRleHRdKSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzdHlsZXMucHVzaChnZXRDbGllbnRTdHlsZSgnZ2VuZXJpYycpKVxuICBpZiAoZGlzcGxheSkgc3R5bGVzLnB1c2goZ2V0Q2xpZW50U3R5bGUoJ2Rpc3BsYXknKSlcbiAgaWYgKGF0b21Db25maWcoKS51c2VHaXRIdWJTdHlsZSkge1xuICAgIHN0eWxlcy5wdXNoKGdldENsaWVudFN0eWxlKCdnaXRodWInKSlcbiAgfSBlbHNlIHtcbiAgICBzdHlsZXMucHVzaChnZXRDbGllbnRTdHlsZSgnZGVmYXVsdCcpKVxuICB9XG4gIHN0eWxlcy5wdXNoKC4uLmdldFN5bnRheFRoZW1lKGF0b21Db25maWcoKS5zeW50YXhUaGVtZU5hbWUpKVxuICBzdHlsZXMucHVzaCguLi5wcm9jZXNzRWRpdG9yU3R5bGVzKGdldFVzZXJTdHlsZXMoKSkpXG4gIHJldHVybiBzdHlsZXNcbn1cblxuZnVuY3Rpb24qIHByb2Nlc3NFZGl0b3JTdHlsZXMoc3R5bGVzOiBJdGVyYWJsZTxzdHJpbmc+KSB7XG4gIGZvciAoY29uc3Qgc3R5bGUgb2Ygc3R5bGVzKSB7XG4gICAgeWllbGQgc3R5bGUucmVwbGFjZSgvXFxiYXRvbS10ZXh0LWVkaXRvclxcYi9nLCAncHJlLmVkaXRvci1jb2xvcnMnKVxuICB9XG59XG5cbmZ1bmN0aW9uKiBwcm9jZXNzV29ya3NwYWNlU3R5bGVzKHN0eWxlczogSXRlcmFibGU8c3RyaW5nPikge1xuICBmb3IgKGNvbnN0IHN0eWxlIG9mIHN0eWxlcykge1xuICAgIHlpZWxkIHN0eWxlLnJlcGxhY2UoL1xcYmF0b20td29ya3NwYWNlXFxiL2csICc6cm9vdCcpXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0TWFya2Rvd25QcmV2aWV3Q1NTKCkge1xuICBjb25zdCBjc3NVcmxSZWZFeHAgPSAvdXJsXFwoYXRvbTpcXC9cXC9tYXJrZG93bi1wcmV2aWV3LXBsdXNcXC9hc3NldHNcXC8oLiopXFwpL1xuXG4gIHJldHVybiBnZXRQcmV2aWV3U3R5bGVzKGZhbHNlKVxuICAgIC5qb2luKCdcXG4nKVxuICAgIC5yZXBsYWNlKGNzc1VybFJlZkV4cCwgZnVuY3Rpb24oXG4gICAgICBfbWF0Y2gsXG4gICAgICBhc3NldHNOYW1lOiBzdHJpbmcsXG4gICAgICBfb2Zmc2V0LFxuICAgICAgX3N0cmluZyxcbiAgICApIHtcbiAgICAgIC8vIGJhc2U2NCBlbmNvZGUgYXNzZXRzXG4gICAgICBjb25zdCBhc3NldFBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vYXNzZXRzJywgYXNzZXRzTmFtZSlcbiAgICAgIGNvbnN0IG9yaWdpbmFsRGF0YSA9IGZzLnJlYWRGaWxlU3luYyhhc3NldFBhdGgsICdiaW5hcnknKVxuICAgICAgY29uc3QgYmFzZTY0RGF0YSA9IG5ldyBCdWZmZXIob3JpZ2luYWxEYXRhLCAnYmluYXJ5JykudG9TdHJpbmcoJ2Jhc2U2NCcpXG4gICAgICByZXR1cm4gYHVybCgnZGF0YTppbWFnZS9qcGVnO2Jhc2U2NCwke2Jhc2U2NERhdGF9JylgXG4gICAgfSlcbn1cblxuLy9cbi8vIERlY29kZSB0YWdzIHVzZWQgYnkgbWFya2Rvd24taXRcbi8vXG4vLyBAcGFyYW0ge21hcmtkb3duLWl0LlRva2VufSB0b2tlbiBEZWNvZGUgdGhlIHRhZyBvZiB0b2tlbi5cbi8vIEByZXR1cm4ge3N0cmluZ3xudWxsfSBEZWNvZGVkIHRhZyBvciBgbnVsbGAgaWYgdGhlIHRva2VuIGhhcyBubyB0YWcuXG4vL1xuZnVuY3Rpb24gZGVjb2RlVGFnKHRva2VuOiBUb2tlbik6IHN0cmluZyB8IG51bGwge1xuICBpZiAodG9rZW4udGFnID09PSAnbWF0aCcpIHtcbiAgICByZXR1cm4gJ3NwYW4nXG4gIH1cbiAgaWYgKHRva2VuLnRhZyA9PT0gJ2NvZGUnKSB7XG4gICAgcmV0dXJuICdhdG9tLXRleHQtZWRpdG9yJ1xuICB9XG4gIGlmICh0b2tlbi50YWcgPT09ICcnKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuICByZXR1cm4gdG9rZW4udGFnXG59XG5cbi8vXG4vLyBEZXRlcm1pbmUgcGF0aCB0byBhIHRhcmdldCB0b2tlbi5cbi8vXG4vLyBAcGFyYW0geyhtYXJrZG93bi1pdC5Ub2tlbilbXX0gdG9rZW5zIEFycmF5IG9mIHRva2VucyBhcyByZXR1cm5lZCBieVxuLy8gICBgbWFya2Rvd24taXQucGFyc2UoKWAuXG4vLyBAcGFyYW0ge251bWJlcn0gbGluZSBMaW5lIHJlcHJlc2VudGluZyB0aGUgdGFyZ2V0IHRva2VuLlxuLy8gQHJldHVybiB7KHRhZzogPHRhZz4sIGluZGV4OiA8aW5kZXg+KVtdfSBBcnJheSByZXByZXNlbnRpbmcgYSBwYXRoIHRvIHRoZVxuLy8gICB0YXJnZXQgdG9rZW4uIFRoZSByb290IHRva2VuIGlzIHJlcHJlc2VudGVkIGJ5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZVxuLy8gICBhcnJheSBhbmQgdGhlIHRhcmdldCB0b2tlbiBieSB0aGUgbGFzdCBlbG1lbnQuIEVhY2ggZWxlbWVudCBjb25zaXN0cyBvZiBhXG4vLyAgIGB0YWdgIGFuZCBgaW5kZXhgIHJlcHJlc2VudGluZyBpdHMgaW5kZXggYW1vbmdzdCBpdHMgc2libGluZyB0b2tlbnMgaW5cbi8vICAgYHRva2Vuc2Agb2YgdGhlIHNhbWUgYHRhZ2AuIGBsaW5lYCB3aWxsIGxpZSBiZXR3ZWVuIHRoZSBwcm9wZXJ0aWVzXG4vLyAgIGBtYXBbMF1gIGFuZCBgbWFwWzFdYCBvZiB0aGUgdGFyZ2V0IHRva2VuLlxuLy9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZExpbmVNYXAodG9rZW5zOiBSZWFkb25seUFycmF5PFJlYWRvbmx5PFRva2VuPj4pIHtcbiAgY29uc3QgbGluZU1hcDogeyBbbGluZTogbnVtYmVyXTogQXJyYXk8eyB0YWc6IHN0cmluZzsgaW5kZXg6IG51bWJlciB9PiB9ID0ge31cbiAgY29uc3QgdG9rZW5UYWdDb3VudDogeyBbbGluZTogbnVtYmVyXTogeyBbdGFnOiBzdHJpbmddOiBudW1iZXIgfSB9ID0ge31cbiAgdG9rZW5UYWdDb3VudFswXSA9IHt9XG5cbiAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICBpZiAodG9rZW4uaGlkZGVuKSBjb250aW51ZVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpzdHJpY3QtdHlwZS1wcmVkaWNhdGVzIC8vIFRPRE86IGNvbXBsYWluIG9uIERUXG4gICAgaWYgKHRva2VuLm1hcCA9PSBudWxsKSBjb250aW51ZVxuXG4gICAgY29uc3QgdGFnID0gZGVjb2RlVGFnKHRva2VuKVxuICAgIGlmICh0YWcgPT09IG51bGwpIGNvbnRpbnVlXG5cbiAgICBpZiAodG9rZW4ubmVzdGluZyA9PT0gMSkge1xuICAgICAgLy8gb3BlbmluZyB0YWdcbiAgICAgIGZvciAobGV0IGxpbmUgPSB0b2tlbi5tYXBbMF07IGxpbmUgPCB0b2tlbi5tYXBbMV07IGxpbmUgKz0gMSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6c3RyaWN0LXR5cGUtcHJlZGljYXRlc1xuICAgICAgICBpZiAobGluZU1hcFtsaW5lXSA9PSBudWxsKSBsaW5lTWFwW2xpbmVdID0gW11cbiAgICAgICAgbGluZU1hcFtsaW5lXS5wdXNoKHtcbiAgICAgICAgICB0YWc6IHRhZyxcbiAgICAgICAgICBpbmRleDogdG9rZW5UYWdDb3VudFt0b2tlbi5sZXZlbF1bdGFnXSB8fCAwLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgdG9rZW5UYWdDb3VudFt0b2tlbi5sZXZlbCArIDFdID0ge31cbiAgICB9IGVsc2UgaWYgKHRva2VuLm5lc3RpbmcgPT09IDApIHtcbiAgICAgIC8vIHNlbGYtY2xvc2luZyB0YWdcbiAgICAgIGZvciAobGV0IGxpbmUgPSB0b2tlbi5tYXBbMF07IGxpbmUgPCB0b2tlbi5tYXBbMV07IGxpbmUgKz0gMSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6c3RyaWN0LXR5cGUtcHJlZGljYXRlc1xuICAgICAgICBpZiAobGluZU1hcFtsaW5lXSA9PSBudWxsKSBsaW5lTWFwW2xpbmVdID0gW11cbiAgICAgICAgbGluZU1hcFtsaW5lXS5wdXNoKHtcbiAgICAgICAgICB0YWc6IHRhZyxcbiAgICAgICAgICBpbmRleDogdG9rZW5UYWdDb3VudFt0b2tlbi5sZXZlbF1bdGFnXSB8fCAwLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0dGMgPSB0b2tlblRhZ0NvdW50W3Rva2VuLmxldmVsXVt0YWddXG4gICAgdG9rZW5UYWdDb3VudFt0b2tlbi5sZXZlbF1bdGFnXSA9IHR0YyA/IHR0YyArIDEgOiAxXG4gIH1cblxuICByZXR1cm4gbGluZU1hcFxufVxuXG5mdW5jdGlvbiBtYXRoSmF4U2NyaXB0KHRleENvbmZpZzogTWF0aEpheC5UZVhJbnB1dFByb2Nlc3Nvcikge1xuICByZXR1cm4gYFxcXG48c2NyaXB0IHR5cGU9XCJ0ZXh0L3gtbWF0aGpheC1jb25maWdcIj5cbiAgTWF0aEpheC5IdWIuQ29uZmlnKHtcbiAgICBqYXg6IFtcImlucHV0L1RlWFwiLFwib3V0cHV0L0hUTUwtQ1NTXCJdLFxuICAgIGV4dGVuc2lvbnM6IFtcIlthMTF5XS9hY2Nlc3NpYmlsaXR5LW1lbnUuanNcIl0sXG4gICAgJ0hUTUwtQ1NTJzoge1xuICAgICAgYXZhaWxhYmxlRm9udHM6IFtdLFxuICAgICAgd2ViRm9udDogJ1RlWCcsXG4gICAgICB1bmRlZmluZWRGYW1pbHk6ICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgIGF0b21Db25maWcoKS5tYXRoQ29uZmlnLnVuZGVmaW5lZEZhbWlseSxcbiAgICAgICl9LFxuICAgICAgbXRleHRGb250SW5oZXJpdDogdHJ1ZSxcbiAgICB9LFxuICAgIFRlWDogJHtKU09OLnN0cmluZ2lmeSh0ZXhDb25maWcsIHVuZGVmaW5lZCwgMil9LFxuICAgIHNob3dNYXRoTWVudTogdHJ1ZVxuICB9KTtcbjwvc2NyaXB0PlxuPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIgc3JjPVwiaHR0cHM6Ly9jZG5qcy5jbG91ZGZsYXJlLmNvbS9hamF4L2xpYnMvbWF0aGpheC8yLjcuNC9NYXRoSmF4LmpzXCI+PC9zY3JpcHQ+YFxufVxuXG5leHBvcnQgZnVuY3Rpb24gbWtIdG1sKFxuICB0aXRsZTogc3RyaW5nLFxuICBodG1sOiBIVE1MRG9jdW1lbnQsXG4gIHJlbmRlckxhVGVYOiBib29sZWFuLFxuICB0ZXhDb25maWc6IE1hdGhKYXguVGVYSW5wdXRQcm9jZXNzb3IsXG4pIHtcbiAgbGV0IG1heWJlTWF0aEpheFNjcmlwdDogc3RyaW5nXG4gIGlmIChyZW5kZXJMYVRlWCkge1xuICAgIG1heWJlTWF0aEpheFNjcmlwdCA9IG1hdGhKYXhTY3JpcHQodGV4Q29uZmlnKVxuICB9IGVsc2Uge1xuICAgIG1heWJlTWF0aEpheFNjcmlwdCA9ICcnXG4gIH1cbiAgcmV0dXJuIGBcXFxuPCFET0NUWVBFIGh0bWw+XG48aHRtbCBkYXRhLW1hcmtkb3duLXByZXZpZXctcGx1cy1jb250ZXh0PVwiaHRtbC1leHBvcnRcIj5cbiAgPGhlYWQ+XG4gICAgPG1ldGEgY2hhcnNldD1cInV0Zi04XCIgLz5cbiAgICA8dGl0bGU+JHt0aXRsZX08L3RpdGxlPiR7bWF5YmVNYXRoSmF4U2NyaXB0fVxuICAgIDxzdHlsZT4ke2dldE1hcmtkb3duUHJldmlld0NTUygpfTwvc3R5bGU+XG4ke2h0bWwuaGVhZCEuaW5uZXJIVE1MfVxuICA8L2hlYWQ+XG4gIDxib2R5PlxuICAgICR7aHRtbC5ib2R5LmlubmVySFRNTH1cbiAgPC9ib2R5PlxuPC9odG1sPlxuYCAvLyBFbnN1cmUgdHJhaWxpbmcgbmV3bGluZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzdHJveShpdGVtOiBvYmplY3QpIHtcbiAgY29uc3QgcGFuZSA9IGF0b20ud29ya3NwYWNlLnBhbmVGb3JJdGVtKGl0ZW0pXG4gIGlmIChwYW5lKSBoYW5kbGVQcm9taXNlKHBhbmUuZGVzdHJveUl0ZW0oaXRlbSkpXG59XG4iXX0=