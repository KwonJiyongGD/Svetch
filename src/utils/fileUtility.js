import { canvas } from '../store.js';
import axios from 'axios';
import b64ToBlob from "b64-to-blob";
import fileSaver from "file-saver";
const fileUtility = {};


fileUtility.parse = (component, exporting = false) => {
	let canvasStore;
	const unsubscribeCanvas = canvas.subscribe((val) => canvasStore = val);
	unsubscribeCanvas();

	const fileMap = new Map();
	const queue = [component];
	const nameCache = {};
	
	while(queue.length) {
		const storeKey = queue.shift();
		const current = canvasStore[storeKey];
		const name = current.scriptId;

		let fileName = storeKey === 'index' ? storeKey : name;
		let fileText = `<script>IMPORTS</script>\n\n${name === 'main' ? '<main>' : ''}COMPONENTS${name === 'main' ? '</main>': ''}\n\n<style>\n\n</style>`;

		const importMap = new Map();
		const components = [];
		const childNameCache = {};

		current.children.forEach(child => {
			let childName = canvasStore[child].scriptId;
			if(nameCache[name]) nameCache[name]++;
			else nameCache[name] = 1;
			fileName = name + '_' + nameCache[name];
			if (exporting) queue.push(child);
			if (canvasStore[child].children.length) {
				if (childNameCache[childName]) childNameCache[childName]++;
				else childNameCache[childName] = 1;
				childName = childName + '_' + childNameCache[childName];
			}
			childName = fileUtility.formatName(childName);
			if (!importMap.has(childName)) importMap.set(childName,`import ${childName} from '../lib/${childName}.svelte'`);	
			components.push(`<${childName} />`);
		});

		const imports = [];
		importMap.forEach((value) => {
			imports.push(value);
		});
		const importsStr = '\n\t' + imports.join('\n\t') + '\n';
		let componentsStr;
		if (name === 'main') componentsStr = '\n\t' + components.join('\n\t') + '\n';
		else if (!components.length) componentsStr = '<!-- Enter your HTML here -->';
		else componentsStr = components.join('\n');
		fileName = fileUtility.formatName(fileName);

		fileText = fileText
			.replace('IMPORTS', importsStr)
			.replace('COMPONENTS', componentsStr);
		if (!fileMap.has(fileName)) fileMap.set(fileName, {fileText, id: storeKey});
	}
	const files = [];
	fileMap.forEach(({fileText, id}, key) => {
		files.push({name: key, data: fileText, id});
	});
	return files;
}

fileUtility.createFileTree = () => {
	const fileDirectory = {
		name: 'src',
		children: []
	};
	fileDirectory.children.push({name:'index', id: 'index'});
	const files = fileUtility.parse('index', true);
	const lib = {name:'lib', children: []}
	if (files.length > 1) fileDirectory.children.push(lib);
	files.shift();
	const queue = files;
	while (queue.length) {
		const {name, id} = queue.shift();
		lib.children.push({name, id});
	}
	return fileDirectory;
}
fileUtility.sort = files => {
	const sortFiles = (a, b) => {
		if (a.children && !b.children) {
			a.children.sort(sortFiles);
			return -1
		}
		if (b.children && !a.children) {
			b.children.sort(sortFiles);
			return 1
		}
		if (a.name < b.name) return -1;
		if (b.name < a.name) return 1;
		return 0;
	}
	return files.sort(sortFiles);
}

fileUtility.formatName = name => {
	return name.toLowerCase()
		.split(' ')
		.map((s) => s.charAt(0).toUpperCase() + s.substring(1))
		.join('');
}

fileUtility.createFile = async (projectName = 'example-skeleton', ) => {
	
	let exporting = true;
	const filesTemplates = fileUtility.parse('index', exporting);
	const requests = [];
	
	filesTemplates.forEach(template => {
		let {name, data} = template;
		let folder;

		name == 'index'? folder = 'src/routes' : folder = 'src/lib';

		let postContent = {
			name: name,
			text : data,
			folder : folder
		}
		const request = axios.post('/fileCreate', postContent);
		requests.push(request);
	});
	//console.log('about to finish promises')
	await Promise.all(requests);
	//console.log('just finished promises')
	const zipAsBase64 = await axios.get('/zip');
	const blob = b64ToBlob(zipAsBase64.data, "application/zip");
	fileSaver.saveAs(blob, `${projectName}.zip`);
	console.log('test')
	// comment out below if you dont want to delete file
	axios.post('/fileDelete');

}

fileUtility.newFile = async () => {


	let canvasStore = {
		'index' : {
			children : [],
			scriptId : 'main'
		}
	};
	canvas.update(n=> n = canvasStore);

	options.update(n => n = [])
	axios.get('/newProject');

	return
}
 
	
export default fileUtility;