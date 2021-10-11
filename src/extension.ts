// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { match } from 'assert';
import * as vscode from 'vscode';

const TRANSLATABLE_REGEX = /"(![A-Z0-9_]*)"/g;
const TRANSLATED_REGEX = /(![A-Z0-9_]*)/g;

const DIALECT_MAP: { [key: string]: string[] } = {
	'csv': [',', 'quoted'],
	'tsv': ['\t', 'simple'],
	'csv (semicolon)': [';', 'quoted'],
	'csv (pipe)': ['|', 'simple'],
	'csv (tilde)': ['~', 'simple'],
	'csv (caret)': ['^', 'simple'],
	'csv (colon)': [':', 'simple'],
	'csv (double quote)': ['"', 'simple'],
	'csv (equals)': ['=', 'simple'],
	'csv (dot)': ['.', 'simple'],
	'csv (whitespace)': [' ', 'whitespace'],
	'csv (hyphen)': ['-', 'simple']
};

function mapSeperatorToLanguageID(separator: string) {
	for (let languageID in DIALECT_MAP) {
		if (!DIALECT_MAP.hasOwnProperty(languageID)) {
			continue;
		}
		if (DIALECT_MAP[languageID][0] === separator) {
			return languageID;
		}
	}
	return null;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	var fs = require('fs');
	var occurances = new Map<string, [vscode.Uri, number][]>();

	let disposable = vscode.commands.registerCommand('csv-translation-helper.addMissingTranslatableStrings', () => {
		let progOptions: vscode.ProgressOptions = { location: vscode.ProgressLocation.Notification, cancellable: true, title: "Scanning for translatable strings..." };

		vscode.window.withProgress(progOptions, async (_progress) => {
			let files = await vscode.workspace.findFiles(`**/*.*`);
			let translatableStrings = new Set();
			for (let file of files) {
				if (vscode.window.activeTextEditor?.document.uri.fsPath === file.fsPath) {
					continue;
				}
				let fileContent: string = fs.readFileSync(file.fsPath, 'utf8');
				let translatableStringMatches = fileContent.matchAll(TRANSLATABLE_REGEX);
				if (translatableStringMatches) {
					for (let match of translatableStringMatches) {
						translatableStrings.add(match[1]);
						if (match.index) {
							if (occurances.has(match[1])) {
								occurances.get(match[1])?.push([file, match.index]);
							} else {
								occurances.set(match[1], [[file, match.index]]);
							}
						}
					}
				}
			}

			if (vscode.window.activeTextEditor) {
				let activeFileContent = fs.readFileSync(vscode.window.activeTextEditor.document.uri.fsPath, 'utf8');
				let translatedStringMatches = activeFileContent.match(TRANSLATED_REGEX);
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
	});

	let makeHoverInfo = async function (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
		Promise<vscode.Hover | null | undefined> {
		let hoverText: (vscode.MarkdownString | string)[] = [];

		let lnum = position.line;
		let line = document.lineAt(lnum).text;
		let match = line.match(TRANSLATED_REGEX);
		if (match) {
			let translatedString = match[0];
			if (typeof (translatedString) === 'string') {
				var translatedStringOccurances = occurances.get(translatedString);
				if (translatedStringOccurances) {
					for (let translatedStringOccurance of translatedStringOccurances) {
						let fileURI = translatedStringOccurance[0];
						let fileIndex = translatedStringOccurance[1];
						let matchDocument = await vscode.workspace.openTextDocument(fileURI);
						let matchPosition = matchDocument.positionAt(fileIndex);
						let matchLine = matchDocument.lineAt(matchPosition.line);
						let fileName = fileURI.path.substr(fileURI.path.lastIndexOf('/') + 1);
						let hoverLine = new vscode.MarkdownString();
						hoverLine.appendText('['.concat(fileName).concat(`]: `));
						hoverLine.appendCodeblock(matchLine.text);
						hoverText.push(hoverLine);
					}
				}
			}
		}

		if (hoverText.length === 0) {
			hoverText.push('No matches found!');
		}

		return new Promise(resolve => {
			resolve({
				contents: hoverText
			});
		});
	};

	for (let csvDialect in DIALECT_MAP) {
		if (DIALECT_MAP.hasOwnProperty(csvDialect)) {
			let hoverProvider = vscode.languages.registerHoverProvider(csvDialect, {
				provideHover(document, position, token) {
					return makeHoverInfo(document, position, token);
				}
			});
			context.subscriptions.push(hoverProvider);
		}
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }
