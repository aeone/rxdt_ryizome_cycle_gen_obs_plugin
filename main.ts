import moment from 'moment';
import { App, Editor, FuzzySuggestModal, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Vault } from 'obsidian';

export default class RyizomeCycleGen extends Plugin {
	async onload() {
		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });
		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });
        // Add the new command
        this.addCommand({
            id: 'start-new-ryizome-cycle',
            name: 'Start new Ryizome Cycle',
            callback: () => {
                new RyizomeCycleModal(this.app).open();
            }
        });
	}

	onunload() {

	}
}

function createNewCycle(vault: Vault, cycleName: string, thread: ['new', string] | ['existing', string, string], wrapUp: ()=>void) {
	// Get the vault instance
	// const vault = this.app.vault;

	// Format the current time and create the file name
	const currentTime = moment().format('YYYYMMDDHHmm');
	const fileName = `${currentTime} ${cycleName}.md`;

	// Get the content of the template file
	const templatePath = 'vault/templates/cycle template.md';
	const files = vault.getMarkdownFiles();
	const template = files.filter(file => file.path === templatePath)[0];
	if (!template) {
		new Notice(`RXDT: Could not find template file at ${templatePath}`);
		return;
	}
	vault.cachedRead(template).then(templateContent => {
		// Interpolate into template content: 
		// - created (with current date)
		// - advancing (with link to thread)
		const created = moment().format('YYYY-MM-DD');
		let advancingThreadFilename;
		let advancingThreadName;
		if (thread[0] === 'new') {
			// need to create a new thread
			// qq do this next
		} else {
			// use existing thread
			advancingThreadFilename = thread[1];
			advancingThreadName = thread[2];
		}
		templateContent = templateContent.replace(/{{created-date}}/g, created);
		templateContent = templateContent.replace(/{{thread-filename}}/g, advancingThreadFilename || '(unknown thread filename)');
		templateContent = templateContent.replace(/{{thread-name}}/g, advancingThreadName || '(unknown thread name)');
		// templateContent = templateContent.replace('created: {{date}}', `created: ${created}`);
		// templateContent = templateContent.replace('advancing: []', `advancing: \n  - "[[${advancingThreadFilename}|(${advancingThreadFilename}) ${advancingThreadName}]]"`);
		// templateContent = templateContent + `\n\n---\n# Thread context\n![[${advancingThreadFilename}]]`
		// Create the new markdown file with the template content
		vault.create(`as/c/${fileName}`, templateContent).then((newFile) => {
			this.app.workspace.activeLeaf.openFile(newFile);
			wrapUp();
		});
	});

	// You may want to extend this method to handle the thread input,
	// possibly by using the vault API to read and update thread files in the as/t/ directory.
}

function createNewThread(vault: Vault, app: App, threadName: string, arcfileFilename: string|false, wrapUp: ()=>void) {
	const deviceName = (app as any).internalPlugins.plugins.sync.instance.deviceName;
    
    const yearChar = (parseInt(moment().format('YYYY')) - 2020).toString(36).toUpperCase();
    const monthChar = (parseInt(moment().format('MM'))).toString(36).toUpperCase();
    const dayChars = moment().format('DD');
    const deviceChar = deviceName[0].toUpperCase();

    // Function to generate filename based on file count
    const generateFileName = (fileCount: number) => {
        return `${yearChar}${monthChar}${dayChars}${fileCount.toString()}${deviceChar}.md`;
    }

    // Function to check if a file with the given name already exists in the as/t/ directory
    const fileExists = (fileName: string) => {
        return vault.getMarkdownFiles().some(file => file.path === `as/t/${fileName}`);
    }

    // Determine the correct file count to ensure uniqueness of filename
    let fileCount = 1;
    while (fileExists(generateFileName(fileCount))) {
        fileCount++;
    }

    // Now fileCount has the correct value to ensure filename uniqueness
    const fileName = generateFileName(fileCount);
	// const deviceName = (app as any).internalPlugins.plugins.sync.instance.deviceName;
	// // 1. Calculate the first character representing the current year less 2020
    // const yearChar = (parseInt(moment().format('YYYY')) - 2020).toString(36).toUpperCase();
    // // 2. Calculate the second character representing the current month
    // const monthChar = (parseInt(moment().format('MM'))).toString(36).toUpperCase();
    // // 3. Calculate the third and fourth characters representing the current day of the month
    // const dayChars = moment().format('DD');
    // // 4. Calculate the fifth character representing the number of files created on this machine today plus 1
    // const todayFiles = vault.getMarkdownFiles().filter(file => moment(file.stat.mtime).isSame(moment(), 'day')).length;
    // const fileCountChar = (todayFiles + 1).toString();
    // // 5. Obtain the sixth character representing the first letter of the current device name
    // const deviceChar = deviceName[0].toUpperCase();
    // // Construct the filename
    // const fileName = `${yearChar}${monthChar}${dayChars}${fileCountChar}${deviceChar}.md`;
	// // const currentDay = moment().format('YYYYMMDDHHmm');
	// // const fileName = `${currentDay}${deviceName[0]}.md`;

	// Get the content of the template file
	const templatePath = 'vault/templates/thread template.md';
	const files = vault.getMarkdownFiles();
	const template = files.filter(file => file.path === templatePath)[0];
	if (!template) {
		new Notice(`RXDT: Could not find template file at ${templatePath}`);
		return;
	}
	vault.cachedRead(template).then(templateContent => {
		// Interpolate into template content: 
		// - created (with current date)
		const created = moment().format('YYYY-MM-DD');
		templateContent = templateContent.replace(/{{created-date}}/g, created);
		templateContent = templateContent.replace(/{{thread-name}}/g, threadName);
		templateContent = templateContent.replace(/{{arcfile-filename}}/g, arcfileFilename || '(no arcfile assigned)');
		// Create the new markdown file with the template content
		vault.create(`as/t/${fileName}`, templateContent).then((newFile) => {
			this.app.workspace.activeLeaf.openFile(newFile);
			wrapUp();
		});
	});
}

class RyizomeCycleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        // Create input elements for cycle name and thread
		contentEl.createEl("h1", { text: `Create new cycle` });
        const cycleNameInput = contentEl.createEl('input', { placeholder: 'Cycle Name' });
		contentEl.createEl("hr");
        const threadInput = contentEl.createEl('input', { placeholder: 'Advancing New Thread' });
		const threadDisplay = contentEl.createEl('p', { text: '(thread to advance)' });
		const threadSelectButton = contentEl.createEl('button', { text: 'Or Select Existing Thread' });
		contentEl.createEl("hr");
		let existingThreadFilename = '';
		let existingThreadObjective = '';
		threadInput.addEventListener('input', () => {
			existingThreadFilename = '';
			existingThreadObjective = '';
			threadDisplay.innerText = `New thread with objective: ${threadInput.value}`
		});
		threadSelectButton.addEventListener('click', () => {
			const existingThreads = this.app.vault.getFiles().filter(file => file.path.startsWith('as/t/'));
			const modal = new SelectThreadModal(this.app, existingThreads);
			modal.onChooseItem = (thread: TFile) => {
				existingThreadFilename = thread.basename;
				const threadCache = this.app.metadataCache.getFileCache(thread);
				if (threadCache) {
					const threadFrontmatter = threadCache.frontmatter;
					existingThreadObjective = threadFrontmatter?.['objective'] || '(no objective)';
				} else {
					existingThreadObjective = '(no frontmatter/objective)';
				}
				threadDisplay.innerText = `Existing thread (${existingThreadFilename}): ${existingThreadObjective}`
			}
			modal.open();
		});
        
        // Create a button to submit the input values
        const submitButton = contentEl.createEl('button', { text: 'Create Cycle' });
        submitButton.addEventListener('click', () => {
			const vault = this.app.vault;
			if (existingThreadFilename) {
				createNewCycle(vault, cycleNameInput.value, ['existing', existingThreadFilename, existingThreadObjective], this.close.bind(this));
			} else {
				createNewCycle(vault, cycleNameInput.value, ['new', threadInput.value], this.close.bind(this));
			}
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class SelectThreadModal extends FuzzySuggestModal<TFile> {
	allThreads: TFile[];

	constructor(app: App, allThreads: TFile[]) {
	  super(app);
	  this.allThreads = allThreads;
	}

	getItems(): TFile[] {
	  return this.allThreads;
	}
  
	getItemText(thread: TFile): string {
		// Get "(thread objective from frontmatter) - (thread filename) - (thread status from frontmatter) - (thread created from frontmatter)"
		// e.g. "Complete the cycle creation plugin - 202106072100 Complete the cycle creation plugin.md - complete - 20210607"
		const fileCache = this.app.metadataCache.getFileCache(thread);
		if (!fileCache) {
			return `(no metadata cache for ${thread.basename})`;
		}
		const threadFrontmatter = fileCache.frontmatter;
		if (!threadFrontmatter) {
			return `(no frontmatter for ${thread.basename})`;
		}
		const threadObjective = threadFrontmatter['objective'] || '(no objective)';
		const threadStatus = threadFrontmatter['status'] || '(no status)';
		const threadCreated = threadFrontmatter['created'] || '(no created)';
		return `${threadObjective} - ${thread.basename} - ${threadStatus} - ${threadCreated}`;
	}
  
	onChooseItem(thread: TFile, evt: MouseEvent | KeyboardEvent) {
	  // exfiltrate thread in descendant
	}
}
