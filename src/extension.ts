// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	var fs = require('fs');

	let disposable = vscode.commands.registerCommand('csv-translation-helper.addMissingTranslatableStrings', () => {
		let progOptions: vscode.ProgressOptions = { location: vscode.ProgressLocation.Notification, cancellable: true, title: "Scanning for translatable strings..." };

		vscode.window.withProgress(progOptions, async (_progress) => {
			let files = await vscode.workspace.findFiles(`**/*.*`);
			let translatableStrings = new Set();
			for (let file of files) {
				if (vscode.window.activeTextEditor?.document.uri.fsPath === file.fsPath) {
					continue;
				}
				let fileContent = fs.readFileSync(file.fsPath, 'utf8');
				let translatableStringRegex = /"(![A-Z0-9_]*)"/g;
				let translatableStringMatches = fileContent.matchAll(translatableStringRegex);
				if (translatableStringMatches) {
					for (let match of translatableStringMatches) {
						translatableStrings.add(match[1]);
					}
				}
			}

			if (vscode.window.activeTextEditor) {
				let activeFileContent = fs.readFileSync(vscode.window.activeTextEditor.document.uri.fsPath, 'utf8');
				let translatedStringRegex = /(![A-Z0-9_]*)/g;
				let translatedStringMatches = activeFileContent.match(translatedStringRegex);
				if (translatedStringMatches) {
					for (let match of translatedStringMatches) {
						if (translatableStrings.has(match)) {
							translatableStrings.delete(match);
						}
					}
				}
				vscode.window.activeTextEditor.edit((editBuilder) => {
					let curDoc = vscode.window.activeTextEditor?.document;
					if (curDoc) {
						const endOfLine: string = `\n`;
						let textToInsert: string = endOfLine;
						for (let translatableString of translatableStrings) {
							if (typeof (translatableString) === `string`) {
								textToInsert = textToInsert.concat(translatableString).concat(",\"\",\"\"").concat(endOfLine);
							}
						}
						let endOfFilePosition = curDoc.lineAt(curDoc.lineCount - 1).rangeIncludingLineBreak.end;
						editBuilder.insert(endOfFilePosition, textToInsert);
					}
				});
			}
		});

		context.subscriptions.push(disposable);

		console.log('CSV Translation Helper is activated');
	});
}

// this method is called when your extension is deactivated
export function deactivate() { }
