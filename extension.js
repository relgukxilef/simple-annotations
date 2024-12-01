const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    console.error(`Activating`);
    let activeEditor = vscode.window.activeTextEditor;
    let decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 255, 0, 0.3)', // Highlight color
    });
    let annotationWatcher = null;

    function getAnnotationFilePath(filePath) {
        return `${filePath}.annotation.json`;
    }

    function readAnnotations(filePath) {
        const annotationFilePath = getAnnotationFilePath(filePath);
        if (!fs.existsSync(annotationFilePath)) return [];
        try {
            const data = fs.readFileSync(annotationFilePath, 'utf8');
            return JSON.parse(data).annotations || [];
        } catch (error) {
            console.error(`Failed to read annotations: ${error.message}`);
            return [];
        }
    }

    function updateDecorations() {
        if (!activeEditor) return;
        const filePath = activeEditor.document.fileName;
        const annotations = readAnnotations(filePath);

        const decorations = annotations.map((annotation) => {
            const range = new vscode.Range(annotation.line - 1, 0, annotation.line - 1, 1000);
            return { range, hoverMessage: annotation.text };
        });

        activeEditor.setDecorations(decorationType, decorations);
    }

    function watchAnnotations(filePath) {
        if (annotationWatcher) {
            annotationWatcher.close();
            annotationWatcher = null;
        }

        const annotationFilePath = getAnnotationFilePath(filePath);
        if (!fs.existsSync(annotationFilePath)) return;

        annotationWatcher = fs.watch(annotationFilePath, { persistent: true }, () => {
            updateDecorations();
        });
    }

    vscode.window.onDidChangeActiveTextEditor((editor) => {
        activeEditor = editor;
        if (activeEditor) {
            const filePath = activeEditor.document.fileName;
            watchAnnotations(filePath);
            updateDecorations();
        }
    });

    vscode.workspace.onDidSaveTextDocument(() => {
        if (activeEditor) updateDecorations();
    });

    if (activeEditor) {
        const filePath = activeEditor.document.fileName;
        watchAnnotations(filePath);
        updateDecorations();
    }

    context.subscriptions.push({
        dispose: () => {
            if (annotationWatcher) annotationWatcher.close();
        },
    });
}

function deactivate() {
    if (annotationWatcher) annotationWatcher.close();
}

module.exports = {
    activate,
    deactivate,
};
