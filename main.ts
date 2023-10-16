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
                new CreateRyizomeCycleModal(this.app).open();
            }
        });
        this.addCommand({
            id: 'start-new-ryizome-thread',
            name: 'Start new Ryizome Thread',
            callback: () => {
                new CreateRyizomeThreadModal(this.app, () => {}).open();
            }
        });
	}

	onunload() {

	}
}

function createNewCycle(vault: Vault, app: App, cycleName: string, thread: ['new', string] | ['existing', string, string], wrapUp: ()=>void) {
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
		function finishCreatingCycle(advancingThreadFilename: string, advancingThreadName: string) {
			templateContent = templateContent.replace(/{{created-date}}/g, created);
			templateContent = templateContent.replace(/{{thread-filename}}/g, advancingThreadFilename || '(unknown thread filename)');
			templateContent = templateContent.replace(/{{thread-name}}/g, advancingThreadName || '(unknown thread name)');
			// templateContent = templateContent.replace('created: {{date}}', `created: ${created}`);
			// templateContent = templateContent.replace('advancing: []', `advancing: \n  - "[[${advancingThreadFilename}|(${advancingThreadFilename}) ${advancingThreadName}]]"`);
			// templateContent = templateContent + `\n\n---\n# Thread context\n![[${advancingThreadFilename}]]`
			// Create the new markdown file with the template content
			vault.create(`as/c/${fileName}`, templateContent).then((newFile) => {
				// app.workspace.activeLeaf.openFile(newFile);
				app.workspace.getLeaf().openFile(newFile);
				wrapUp();
			});
		}
		// Interpolate into template content: 
		// - created (with current date)
		// - advancing (with link to thread)
		const created = moment().format('YYYY-MM-DD');
		let advancingThreadFilename;
		let advancingThreadName;
		if (thread[0] === 'new') {
			// need to create a new thread
			new CreateRyizomeThreadModal(app, finishCreatingCycle).open();
		} else {
			// use existing thread
			advancingThreadFilename = thread[1];
			advancingThreadName = thread[2];
			finishCreatingCycle(advancingThreadFilename, advancingThreadName);
		}
	});

	// You may want to extend this method to handle the thread input,
	// possibly by using the vault API to read and update thread files in the as/t/ directory.
}

function createNewThread(vault: Vault, app: App, threadName: string, arcfileFilename: string|false, wrapUp: ()=>void): {threadName: string, threadFilename: string}|false {
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

	// Get the content of the template file
	const templatePath = 'vault/templates/thread template.md';
	const files = vault.getMarkdownFiles();
	const template = files.filter(file => file.path === templatePath)[0];
	if (!template) {
		new Notice(`RXDT: Could not find template file at ${templatePath}`);
		return false;
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
	return {threadName, threadFilename: fileName};
}

class CreateRyizomeCycleModal extends Modal {
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
			// Choosing existing thread
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
				createNewCycle(vault, this.app, cycleNameInput.value, ['existing', existingThreadFilename, existingThreadObjective], this.close.bind(this));
			} else {
				createNewCycle(vault, this.app, cycleNameInput.value, ['new', threadInput.value], this.close.bind(this));
			}
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
class CreateRyizomeThreadModal extends Modal {
	wrapUp: (threadFilename: string, threadName: string)=>void;
	threadFilename: string;
	threadName: string;
    constructor(app: App, wrapUp: (threadFilename: string, threadName: string)=>void) {
        super(app);
		this.wrapUp = wrapUp || (() => {});
    }

    onOpen() {
        const { contentEl } = this;
        // Create input elements for cycle name and thread
		contentEl.createEl("h1", { text: `Create new thread` });
        const cycleNameInput = contentEl.createEl('input', { placeholder: 'Thread Objective' });
		contentEl.createEl("hr");
        // const arcfileInput = contentEl.createEl('input', { placeholder: 'Advancing New Arcfile' });
		const arcfileDisplay = contentEl.createEl('p', { text: '(arcfile to advance)' });
		const arcfileSelectButton = contentEl.createEl('button', { text: 'Select Existing Arcfile' });
		contentEl.createEl("hr");
		let existingArcfileFilename = '';
		// arcfileInput.addEventListener('input', () => {
		// 	existingArcfileFilename = '';
		// 	arcfileDisplay.innerText = `New arcfile with goal: ${arcfileInput.value}`
		// });
		arcfileSelectButton.addEventListener('click', () => {
			// Choosing existing arcfile
			const existingArcfiles = this.app.vault.getFiles().filter(file => file.path.startsWith('a/'));
			const modal = new SelectArcfileModal(this.app, existingArcfiles);
			modal.onChooseItem = (thread: TFile) => { 
				existingArcfileFilename = thread.basename;
				let existingArcfileGoal = '';
				const arcfileCache = this.app.metadataCache.getFileCache(thread);
				if (arcfileCache) {
					const arcfileFrontmatter = arcfileCache.frontmatter;
					existingArcfileGoal = arcfileFrontmatter?.['goals'] || '';
				} 
				arcfileDisplay.innerText = `Existing arcfile: ${existingArcfileFilename} ${existingArcfileGoal ? '('+existingArcfileGoal+')' : ''}`;
			}
			modal.open();
		});
        
        // Create a button to submit the input values
        const submitButton = contentEl.createEl('button', { text: 'Create Thread' });
        submitButton.addEventListener('click', () => {
			const vault = this.app.vault;
			let result;
			if (existingArcfileFilename) {
				result = createNewThread(vault, this.app, cycleNameInput.value, existingArcfileFilename, this.close.bind(this));
			} else {
				result = createNewThread(vault, this.app, cycleNameInput.value, false, this.close.bind(this));
			}
			if (result) {
				this.threadFilename = result.threadFilename;
				this.threadName = result.threadName;
			}
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
		this.wrapUp(this.threadFilename, this.threadName);
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
export class SelectArcfileModal extends FuzzySuggestModal<TFile> {
	allArcfiles: TFile[];

	constructor(app: App, allThreads: TFile[]) {
	  super(app);
	  this.allArcfiles = allThreads;
	}

	getItems(): TFile[] {
	  return this.allArcfiles;
	}
  
	getItemText(arcfile: TFile): string {
		let arcfileGoals = '';
		const fileCache = this.app.metadataCache.getFileCache(arcfile);
		if (fileCache) {
			const threadFrontmatter = fileCache.frontmatter;
			if (threadFrontmatter) {
				arcfileGoals = threadFrontmatter['goals'] || '';
			}
		}
		return `${arcfile.basename} ${arcfileGoals ? `(${arcfileGoals})` : ''}}`;
	}
  
	onChooseItem(thread: TFile, evt: MouseEvent | KeyboardEvent) {
	  // exfiltrate thread in descendant
	}
}
