"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function handlePromise(promise) {
    if (!promise)
        return;
    promise.catch((error) => {
        console.error(error);
        atom.notifications.addFatalError(error.toString(), {
            detail: error.message,
            stack: error.stack,
            dismissable: true,
        });
    });
}
exports.handlePromise = handlePromise;
const fs_1 = require("fs");
function isFileSync(filePath) {
    if (!fs_1.existsSync(filePath))
        return false;
    return fs_1.lstatSync(filePath).isFile();
}
exports.isFileSync = isFileSync;
function pairUp(arr, option) {
    if (arr.length % 2 !== 0) {
        atom.notifications.addWarning(`Invalid math delimiter configuration${option ? `in ${option}` : ''}`, {
            detail: `Expected even number of elements, but got "${arr.join(', ')}"`,
            dismissable: true,
        });
    }
    return arr.reduce(function (result, _value, index, array) {
        if (index % 2 === 0)
            result.push([array[index], array[index + 1]]);
        return result;
    }, []);
}
exports.pairUp = pairUp;
function isElement(node) {
    return node.nodeType === Node.ELEMENT_NODE;
}
exports.isElement = isElement;
const webview_handler_1 = require("./markdown-preview-view/webview-handler");
const renderer = require("./renderer");
const macros_util_1 = require("./macros-util");
async function copyHtml(text, filePath, renderLaTeX) {
    const view = new webview_handler_1.WebviewHandler(async () => {
        view.init({
            userMacros: macros_util_1.loadUserMacros(),
            mathJaxConfig: Object.assign({}, atomConfig().mathConfig, { latexRenderer: 'SVG' }),
            context: 'copy-html',
        });
        view.setBasePath(filePath);
        const domDocument = await renderer.render({
            text,
            filePath,
            renderLaTeX,
            mode: 'copy',
        });
        const res = await view.update(domDocument.documentElement.outerHTML, renderLaTeX);
        if (res) {
            const html = res.replace(/"file:\/\/[^"#]*/g, '"');
            if (atom.config.get('markdown-preview-plus.richClipboard')) {
                const clipboard = await Promise.resolve().then(() => require('./clipboard'));
                clipboard.write({ text: html, html });
            }
            else {
                atom.clipboard.write(html);
            }
        }
        view.destroy();
    });
    view.element.style.pointerEvents = 'none';
    view.element.style.position = 'absolute';
    view.element.style.width = '0px';
    view.element.style.height = '0px';
    const ws = atom.views.getView(atom.workspace);
    ws.appendChild(view.element);
}
exports.copyHtml = copyHtml;
function atomConfig() {
    return atom.config.get('markdown-preview-plus');
}
exports.atomConfig = atomConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsU0FBZ0IsYUFBYSxDQUFDLE9BQXFCO0lBQ2pELElBQUksQ0FBQyxPQUFPO1FBQUUsT0FBTTtJQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBWSxFQUFFLEVBQUU7UUFDN0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNwQixJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDakQsTUFBTSxFQUFFLEtBQUssQ0FBQyxPQUFPO1lBQ3JCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixXQUFXLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUE7SUFDSixDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUM7QUFWRCxzQ0FVQztBQUNELDJCQUEwQztBQUMxQyxTQUFnQixVQUFVLENBQUMsUUFBZ0I7SUFDekMsSUFBSSxDQUFDLGVBQVUsQ0FBQyxRQUFRLENBQUM7UUFBRSxPQUFPLEtBQUssQ0FBQTtJQUN2QyxPQUFPLGNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtBQUNyQyxDQUFDO0FBSEQsZ0NBR0M7QUFFRCxTQUFnQixNQUFNLENBQUksR0FBUSxFQUFFLE1BQWU7SUFDakQsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDeEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQzNCLHVDQUF1QyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUNyRTtZQUNFLE1BQU0sRUFBRSw4Q0FBOEMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRztZQUN2RSxXQUFXLEVBQUUsSUFBSTtTQUNsQixDQUNG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dCI6WyJleHBvcnQgZnVuY3Rpb24gaGFuZGxlUHJvbWlzZShwcm9taXNlOiBQcm9taXNlPGFueT4pOiB2b2lkIHtcbiAgaWYgKCFwcm9taXNlKSByZXR1cm5cbiAgcHJvbWlzZS5jYXRjaCgoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkRmF0YWxFcnJvcihlcnJvci50b1N0cmluZygpLCB7XG4gICAgICBkZXRhaWw6IGVycm9yLm1lc3NhZ2UsXG4gICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICBkaXNtaXNzYWJsZTogdHJ1ZSxcbiAgICB9KVxuICB9KVxufVxuaW1wb3J0IHsgbHN0YXRTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSAnZnMnXG5leHBvcnQgZnVuY3Rpb24gaXNGaWxlU3luYyhmaWxlUGF0aDogc3RyaW5nKSB7XG4gIGlmICghZXhpc3RzU3luYyhmaWxlUGF0aCkpIHJldHVybiBmYWxzZVxuICByZXR1cm4gbHN0YXRTeW5jKGZpbGVQYXRoKS5pc0ZpbGUoKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFpclVwPFQ+KGFycjogVFtdLCBvcHRpb24/OiBzdHJpbmcpOiBBcnJheTxbVCwgVF0+IHtcbiAgaWYgKGFyci5sZW5ndGggJSAyICE9PSAwKSB7XG4gICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZFdhcm5pbmcoXG4gICAgICBgSW52YWxpZCBtYXRoIGRlbGltaXRlciBjb25maWd1cmF0aW9uJHtvcHRpb24gPyBgaW4gJHtvcHRpb259YCA6ICcnfWAsXG4gICAgICB7XG4gICAgICAgIGRldGFpbDogYEV4cGVjdGVkIGV2ZW4gbnVtYmVyIG9mIGVsZW1lbnRzLCBidXQgZ290IFwiJHthcnIuam9pbignLCAnKX1cImAsXG4gICAgICAgIGRpc21pc3NhYmxlOiB0cnVlLFxuICAgICAgfSxcbiAgICApXG4gIH1cbiAgcmV0dXJuIGFyci5yZWR1Y2U8QXJyYXk8W1QsIFRdPj4oZnVuY3Rpb24ocmVzdWx0LCBfdmFsdWUsIGluZGV4LCBhcnJheSkge1xuICAgIGlmIChpbmRleCAlIDIgPT09IDApIHJlc3VsdC5wdXNoKFthcnJheVtpbmRleF0sIGFycmF5W2luZGV4ICsgMV1dKVxuICAgIHJldHVybiByZXN1bHRcbiAgfSwgW10pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VsZW1lbnQobm9kZTogTm9kZSk6IG5vZGUgaXMgRWxlbWVudCB7XG4gIHJldHVybiBub2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERVxufVxuXG5pbXBvcnQgeyBXZWJ2aWV3SGFuZGxlciB9IGZyb20gJy4vbWFya2Rvd24tcHJldmlldy12aWV3L3dlYnZpZXctaGFuZGxlcidcbmltcG9ydCAqIGFzIHJlbmRlcmVyIGZyb20gJy4vcmVuZGVyZXInXG5pbXBvcnQgeyBsb2FkVXNlck1hY3JvcyB9IGZyb20gJy4vbWFjcm9zLXV0aWwnXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29weUh0bWwoXG4gIHRleHQ6IHN0cmluZyxcbiAgZmlsZVBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgcmVuZGVyTGFUZVg6IGJvb2xlYW4sXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgdmlldyA9IG5ldyBXZWJ2aWV3SGFuZGxlcihhc3luYyAoKSA9PiB7XG4gICAgdmlldy5pbml0KHtcbiAgICAgIHVzZXJNYWNyb3M6IGxvYWRVc2VyTWFjcm9zKCksXG4gICAgICBtYXRoSmF4Q29uZmlnOiB7IC4uLmF0b21Db25maWcoKS5tYXRoQ29uZmlnLCBsYXRleFJlbmRlcmVyOiAnU1ZHJyB9LFxuICAgICAgY29udGV4dDogJ2NvcHktaHRtbCcsXG4gICAgfSlcbiAgICB2aWV3LnNldEJhc2VQYXRoKGZpbGVQYXRoKVxuXG4gICAgY29uc3QgZG9tRG9jdW1lbnQgPSBhd2FpdCByZW5kZXJlci5yZW5kZXIoe1xuICAgICAgdGV4dCxcbiAgICAgIGZpbGVQYXRoLFxuICAgICAgcmVuZGVyTGFUZVgsXG4gICAgICBtb2RlOiAnY29weScsXG4gICAgfSlcbiAgICBjb25zdCByZXMgPSBhd2FpdCB2aWV3LnVwZGF0ZShcbiAgICAgIGRvbURvY3VtZW50LmRvY3VtZW50RWxlbWVudCEub3V0ZXJIVE1MLFxuICAgICAgcmVuZGVyTGFUZVgsXG4gICAgKVxuICAgIGlmIChyZXMpIHtcbiAgICAgIGNvbnN0IGh0bWwgPSByZXMucmVwbGFjZSgvXCJmaWxlOlxcL1xcL1teXCIjXSovZywgJ1wiJylcbiAgICAgIGlmIChhdG9tLmNvbmZpZy5nZXQoJ21hcmtkb3duLXByZXZpZXctcGx1cy5yaWNoQ2xpcGJvYXJkJykpIHtcbiAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gYXdhaXQgaW1wb3J0KCcuL2NsaXBib2FyZCcpXG4gICAgICAgIGNsaXBib2FyZC53cml0ZSh7IHRleHQ6IGh0bWwsIGh0bWwgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF0b20uY2xpcGJvYXJkLndyaXRlKGh0bWwpXG4gICAgICB9XG4gICAgfVxuICAgIHZpZXcuZGVzdHJveSgpXG4gIH0pXG4gIHZpZXcuZWxlbWVudC5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnXG4gIHZpZXcuZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSdcbiAgdmlldy5lbGVtZW50LnN0eWxlLndpZHRoID0gJzBweCdcbiAgdmlldy5lbGVtZW50LnN0eWxlLmhlaWdodCA9ICcwcHgnXG4gIGNvbnN0IHdzID0gYXRvbS52aWV3cy5nZXRWaWV3KGF0b20ud29ya3NwYWNlKVxuICB3cy5hcHBlbmRDaGlsZCh2aWV3LmVsZW1lbnQpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdG9tQ29uZmlnKCkge1xuICByZXR1cm4gYXRvbS5jb25maWcuZ2V0KCdtYXJrZG93bi1wcmV2aWV3LXBsdXMnKVxufVxuIl19