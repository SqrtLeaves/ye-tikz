import { Plugin, WorkspaceWindow } from 'obsidian';
import { TikzjaxPluginSettings, DEFAULT_SETTINGS, TikzjaxSettingTab } from "./settings";
import { optimize } from "./svgo.browser";

// @ts-ignore
import tikzjaxJs from 'inline:./tikzjax.js';

/** Replacement for \\usepackage{quiver}. TikZJax does not support \\usetikzlibrary{calc} or the full curve style, so we only inject tikz-cd + amssymb and no-op curve/between so exported code does not error. */
const QUIVER_REPLACEMENT = `\\usepackage{tikz-cd}
\\usepackage{amssymb}
% TikZJax-safe: no \\usetikzlibrary; curve/between as no-ops so quiver code runs
\\tikzset{curve/.style={}}
\\tikzset{between/.style n args={2}{}}
\\tikzset{tail reversed/.style={}}
\\tikzset{2tail/.style={}}
\\tikzset{2tail reversed/.style={}}
\\tikzset{no body/.style={}}`;


export default class TikzjaxPlugin extends Plugin {
	settings: TikzjaxPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new TikzjaxSettingTab(this.app, this));

		// TikZJax is loaded lazily per-document when the first tikz block is rendered,
		// so it sees the script tags and can process them (fixes "无法显示图片").


		this.addSyntaxHighlighting();
		
		this.registerTikzCodeBlock();
	}

	onunload() {
		this.unloadTikZJaxAllWindows();
		this.removeSyntaxHighlighting();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	loadTikZJax(doc: Document) {
		if (doc.getElementById("tikzjax")) return;
		const s = doc.createElement("script");
		s.id = "tikzjax";
		s.type = "text/javascript";
		s.innerText = tikzjaxJs;
		doc.body.appendChild(s);
		doc.addEventListener('tikzjax-load-finished', this.postProcessSvg);
	}

	unloadTikZJax(doc: Document) {
		const s = doc.getElementById("tikzjax");
		if (s) s.remove();
		doc.removeEventListener("tikzjax-load-finished", this.postProcessSvg);
	}

	loadTikZJaxAllWindows() {
		for (const window of this.getAllWindows()) {
			this.loadTikZJax(window.document);
		}
	}

	unloadTikZJaxAllWindows() {
		for (const window of this.getAllWindows()) {
			this.unloadTikZJax(window.document);
		}
	}

	getAllWindows() {
		// Via https://discord.com/channels/686053708261228577/840286264964022302/991591350107635753

		const windows = [];
		
		// push the main window's root split to the list
		windows.push(this.app.workspace.rootSplit.win);
		
		// @ts-ignore floatingSplit is undocumented
		const floatingSplit = this.app.workspace.floatingSplit;
		floatingSplit.children.forEach((child: any) => {
			// if this is a window, push it to the list 
			if (child instanceof WorkspaceWindow) {
				windows.push(child.win);
			}
		});

		return windows;
	}


	registerTikzCodeBlock() {
		this.registerMarkdownCodeBlockProcessor("tikz", (source, el, ctx) => {
			// Ensure container has class for SVG styling (display, centering)
			el.addClass("block-language-tikz");
			const script = el.createEl("script");
			script.setAttribute("type", "text/tikz");
			script.setAttribute("data-show-console", "true");
			script.setText(this.tidyTikzSource(source));
			// Load TikZJax in this document when first tikz block is rendered, so it
			// sees our script tags and replaces them with SVG (fixes diagrams not showing).
			const doc = el.ownerDocument;
			this.loadTikZJax(doc);
		});
	}


	addSyntaxHighlighting() {
		// @ts-ignore
		window.CodeMirror.modeInfo.push({name: "Tikz", mime: "text/x-latex", mode: "stex"});
	}

	removeSyntaxHighlighting() {
		// @ts-ignore
		window.CodeMirror.modeInfo = window.CodeMirror.modeInfo.filter(el => el.name != "Tikz");
	}

	tidyTikzSource(tikzSource: string) {

		// Remove non-breaking space characters, otherwise we get errors
		const remove = "&nbsp;";
		tikzSource = tikzSource.replaceAll(remove, "");

		// Replace \usepackage{quiver} with TikZJax-safe tikz-cd + amssymb + no-op styles
		tikzSource = tikzSource.replace(/\\usepackage(\[[^\]]*\])?\{quiver\}/g, QUIVER_REPLACEMENT);

		let lines = tikzSource.split("\n");

		// Trim whitespace that is inserted when pasting in code, otherwise TikZJax complains
		lines = lines.map(line => line.trim());

		// Remove empty lines
		lines = lines.filter(line => line);


		return lines.join("\n");
	}


	colorSVGinDarkMode(svg: string) {
		// Replace the color "black" with currentColor (the current text color)
		// so that diagram axes, etc are visible in dark mode
		// And replace "white" with the background color

		svg = svg.replaceAll(/("#000"|"black")/g, `"currentColor"`)
				.replaceAll(/("#fff"|"white")/g, `"var(--background-primary)"`);

		return svg;
	}


	optimizeSVG(svg: string) {
		// Optimize the SVG using SVGO
		// Fixes misaligned text nodes on mobile

		return optimize(svg, {plugins:
			[
				{
					name: 'preset-default',
					params: {
						overrides: {
							// Don't use the "cleanupIDs" plugin
							// To avoid problems with duplicate IDs ("a", "b", ...)
							// when inlining multiple svgs with IDs
							cleanupIDs: false
						}
					}
				}
			]
		// @ts-ignore
		}).data;
	}


	postProcessSvg = (e: Event) => {

		const svgEl = e.target as HTMLElement;
		let svg = svgEl.outerHTML;

		if (this.settings.invertColorsInDarkMode) {
			svg = this.colorSVGinDarkMode(svg);
		}

		svg = this.optimizeSVG(svg);

		svgEl.outerHTML = svg;
	}
}

