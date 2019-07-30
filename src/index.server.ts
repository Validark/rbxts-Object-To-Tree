/// <reference types="@rbxts/types/plugin"/>
import Make from "@rbxts/make";
import { Selection, Lighting, HttpService } from "@rbxts/services";
import Checkbox from "checkbox";

// TODO: Make it automatically add to `default.project.json` files
// TODO: Make it customizable what name the single-file Rojoesque generator should go to

const ICON_ID = 3561078226; // 3560977211;
const PLUGIN_NAME = "roblox-ts-object-to-tree";
const PLUGIN_DESCRIPTION =
	"A tool for converting instances to their TS tree form. Ignores all instances with name collisions.";

const IO_SERVE_URL = "http://localhost:33333";
const GENERATE_ROJO_SETTING = "generate-rojo";

/** A lightweight feedback system */
class Feedback {
	static currentFeedback?: Feedback;
	feedbackScreen: ScreenGui;

	constructor(text: string) {
		if (Feedback.currentFeedback) {
			Feedback.currentFeedback.feedbackScreen.Destroy();
		}

		const feedbackScreen = Make("ScreenGui", {
			Parent: game.GetService("CoreGui"),
			Name: "FeedbackScreen"
		});

		const feedbackText = Make("TextLabel", {
			AnchorPoint: new Vector2(0.5, 0.5),
			BackgroundColor3: Color3.fromRGB(255, 255, 255),
			BorderSizePixel: 0,
			Position: new UDim2(0.5, 0, 0.5, 0),
			Font: Enum.Font.SourceSans,
			Text: text,
			TextSize: 18,
			Parent: feedbackScreen
		});

		feedbackText.Size = new UDim2(0, feedbackText.TextBounds.X + 36, 0, 50);
		this.feedbackScreen = feedbackScreen;
		Feedback.currentFeedback = this;

		delay(5, () => {
			if (Feedback.currentFeedback === this) {
				feedbackScreen.Destroy();
				Feedback.currentFeedback = undefined;
			}
		});
	}
}

namespace Settings {
	const ScreenGui = new Instance("ScreenGui");
	ScreenGui.Name = "rbxts-Object-to-tree Settings";
	ScreenGui.Enabled = false;

	const Background = new Instance("Frame");
	Background.AnchorPoint = new Vector2(0.5, 0);
	Background.BackgroundColor3 = Color3.fromRGB(255, 255, 255);
	Background.BorderColor3 = Color3.fromRGB(221, 221, 221);
	Background.Name = "Background";
	Background.Position = new UDim2(0.5, 0, 0, 1);
	Background.Size = new UDim2(0, 224, 0, 88);

	const BottomHint = new Instance("TextLabel");
	BottomHint.BackgroundTransparency = 1;
	BottomHint.Font = Enum.Font.SourceSansSemibold;
	BottomHint.Name = "BottomHint";
	BottomHint.Position = new UDim2(0, 8, 0, 0);
	BottomHint.Size = new UDim2(1, -16, 1, -4);
	BottomHint.Text = "Run `npx io-serve` with HTTP requests enabled to automatically place files in your project.";
	BottomHint.TextColor3 = Color3.fromRGB(0, 0, 0);
	BottomHint.TextSize = 11;
	BottomHint.TextTransparency = 0.46;
	BottomHint.TextWrapped = true;
	BottomHint.TextYAlignment = Enum.TextYAlignment.Bottom;
	BottomHint.ZIndex = 2;

	const MidText = new Instance("TextLabel");
	MidText.BackgroundTransparency = 1;
	MidText.Font = Enum.Font.SourceSans;
	MidText.Name = "MidText";
	MidText.Position = new UDim2(0, 8, 0, 0);
	MidText.Size = new UDim2(0, 140, 1, -8);
	MidText.Text = "Generate Rojo-eque tree";
	MidText.TextColor3 = Color3.fromRGB(0, 0, 0);
	MidText.TextSize = 14;
	MidText.TextTransparency = 0.13;
	MidText.TextXAlignment = Enum.TextXAlignment.Left;

	const Title = new Instance("TextLabel");
	Title.BackgroundTransparency = 1;
	Title.Font = Enum.Font.SourceSansBold;
	Title.Name = "Title";
	Title.Size = new UDim2(1, 0, 1, -4);
	Title.Text = "rbxts-Object-to-tree";
	Title.TextColor3 = Color3.fromRGB(0, 0, 0);
	Title.TextSize = 18;
	Title.TextTransparency = 0.13;
	Title.TextWrapped = true;
	Title.TextYAlignment = Enum.TextYAlignment.Top;
	Title.ZIndex = 2;

	const X = new Instance("TextButton");
	X.AnchorPoint = new Vector2(1, 0);
	X.BackgroundColor3 = Color3.fromRGB(232, 17, 35);
	X.BorderColor3 = Color3.fromRGB(76, 76, 76);
	X.Font = Enum.Font.SourceSansBold;
	X.Name = "X";
	X.Position = new UDim2(1, 0, 0, 0);
	X.Size = new UDim2(0, 16, 0, 16);
	X.Text = "X";
	X.TextColor3 = Color3.fromRGB(255, 255, 255);
	X.TextSize = 16;

	X.MouseButton1Click.Connect(() => {
		ScreenGui.Enabled = !ScreenGui.Enabled;
	});

	const Indicator = new Instance("Frame");
	Indicator.BackgroundColor3 = Color3.fromRGB(4, 255, 0);
	Indicator.BorderSizePixel = 0;
	Indicator.Name = "Indicator";
	Indicator.Position = new UDim2(0, -1, 1, 2);
	Indicator.Size = new UDim2(1, 2, 0, 4);
	Indicator.Visible = false;

	const checkbox = new Checkbox({
		anchorPoint: new Vector2(0, 0.5),
		position: new UDim2(1, 0, 0.5, 0),
		size: 24,
		parent: MidText,
		isChecked: plugin.GetSetting(GENERATE_ROJO_SETTING) as boolean,

		onChecked: isChecked => {
			plugin.SetSetting(GENERATE_ROJO_SETTING, isChecked);
		}
	});

	export function shouldExportRojoesque() {
		return checkbox.getChecked();
	}

	export function openSettings() {
		ScreenGui.Enabled = true;
	}

	X.Parent = Background;
	Indicator.Parent = Background;
	Title.Parent = Background;
	MidText.Parent = Background;
	BottomHint.Parent = Background;
	Background.Parent = ScreenGui;
	ScreenGui.Parent = game.GetService("CoreGui");
}

namespace TreeGenerator {
	/** Given an object, will return an array of Children, excluding children with duplicate names */
	function getUniqueChildren(object: Instance) {
		const takenNames = new Set<string>();
		const shouldParse = new Set<string>();

		for (const { Name: name } of object.GetChildren()) {
			if (takenNames.has(name)) {
				shouldParse.delete(name);
			} else {
				takenNames.add(name);
				shouldParse.add(name);
			}
		}

		const children = new Array<Instance>();

		for (const objName of shouldParse)
			children.push(
				(object as Instance & {
					[K: string]: Instance;
				})[objName]
			);

		return children;
	}

	function getTSVariableName(name: string) {
		return name.find("[%a_][%w_]*")[0] ? name : "X";
	}

	/** Handwritten replacement function for properly extending roblox services */
	function createTopLevelInterface({ ClassName: className, Name: name }: Instance) {
		switch (className) {
			case "Workspace":
				return "interface Workspace extends Model";
			case "Terrain":
				return "interface Terrain extends BasePart";
			case "StarterGui":
				return "interface StarterGui extends BasePlayerGui";
			case "StarterCharacterScripts":
				return "interface StarterCharacterScripts extends StarterPlayerScripts";

			case "ReplicatedFirst":
				warn("Instances in ReplicatedFirst are not guaranteed to exist immediately! Beware!");
			case "Lighting":
			case "ReplicatedStorage":
			case "ServerScriptService":
			case "ServerStorage":
			case "StarterPack":
			case "StarterPlayer":
			case "StarterPlayerScripts":
			case "SoundService":
			case "Chat":
			case "TestService":
				return `interface ${className} extends Instance`;
			default:
				return `type ${getTSVariableName(name)} = ${className} &`;
		}
	}

	const invalidTSBlacklist = new Set([
		"do",
		"if",
		"in",
		"for",
		"let",
		"new",
		"try",
		"var",
		"case",
		"else",
		"enum",
		"eval",
		"false",
		"null",
		"this",
		"true",
		"void",
		"with",
		"break",
		"catch",
		"class",
		"const",
		"super",
		"throw",
		"while",
		"yield",
		"delete",
		"export",
		"import",
		"public",
		"return",
		"static",
		"switch",
		"typeof",
		"default",
		"extends",
		"finally",
		"package",
		"private",
		"continue",
		"debugger",
		"function",
		"arguments",
		"interface",
		"protected",
		"implements",
		"instanceof"
	]);

	function validTSIdentifier(str: string) {
		return !invalidTSBlacklist.has(str) && str.find("^[%a_$][%w_$]*$")[0] ? str : `["${str}"]`;
	}

	/** Finds a valid name, given a desiredName. Continually checks desiredName${++num} until one does not exist in Lighting*/
	function getValidName(desiredName: string, parent: Instance) {
		if (parent === Lighting) {
			let i = 1;
			while (parent.FindFirstChild(i === 1 ? desiredName : desiredName + i)) ++i;
			return i === 1 ? desiredName : desiredName + i;
		} else {
			let i = 2;
			while (parent.FindFirstChild(desiredName + i)) ++i;
			return desiredName + i;
		}
	}

	/** Publishes a slice of a string, which should be maximum 19_999 characters */
	function publishSlice(name: string, slice: string, parent: Instance) {
		return Make("Script", {
			Source: slice,
			Name: getValidName(name, parent),
			Parent: parent
		});
	}

	/** Writes output to Script objects inside of Lighting */
	function writeToLighting(name: string, source: string) {
		name = name.split("/").pop()!;
		const sourceSize = source.size();
		const topSlice = publishSlice(name, source.slice(0, 20_000), Lighting);

		if (sourceSize >= 20_000) {
			let previous = 0;

			for (let i = 20_000; i < source.size(); i += 20_000) {
				publishSlice(name, source.slice(previous, i), topSlice);
				previous = i;
			}

			new Feedback(
				`Generated files in Lighting! Your file was too long to put in a single script, so check ${
					topSlice.Name
				}'s children.`
			);
		} else {
			new Feedback(`Generated file \`${topSlice.Name}\` in Lighting!`);
		}
	}

	/** Writes output to io-serve */
	function writeToIoServe(name: string, source: string) {
		HttpService.RequestAsync({
			Url: `${IO_SERVE_URL}/${name}`,
			Method: "PUT",
			Body: source
		});
		new Feedback(`Wrote to file \`${name}\` in io-serve!`);
	}

	/** Writes output to io-serve */
	function patchToIoServe(name: string, source: string) {
		const previousFile = HttpService.RequestAsync({
			Url: `${IO_SERVE_URL}/${name}`,
			Method: "GET"
		});

		if (previousFile.Success && previousFile.Body.size() > 0) {
			source = "\n" + source;
		} else {
			source = `import { EvaluateInstanceTree } from "@rbxts/validate-tree";\n\n` + source;
		}

		HttpService.RequestAsync({
			Url: `${IO_SERVE_URL}/${name}`,
			Method: "PATCH",
			Body: source
		});

		new Feedback(`Patched file \`${name}\` in io-serve!`);
	}

	function varIdentifier(str: string) {
		str.find("");
	}

	/** Recursively generates trees for given objects */
	function generateSubInterface(results: Array<string>, instance: Instance, depth: number) {
		results.push(`${"\t".rep(depth - 1)}${validTSIdentifier(instance.Name)}: ${instance.ClassName}`);
		const children = getUniqueChildren(instance);

		if (children.size() > 0) {
			results.push(` & {\n`);

			for (const child of children) {
				generateSubInterface(results, child, depth + 1);
			}

			results.push("\t".rep(depth - 1));
			results.push("}");
		}
		results.push(";\n");
	}

	/** Generates an interface for a given instance. */
	export function generateInterface(instance: Instance, useIoServe: boolean) {
		const results: Array<string> = [createTopLevelInterface(instance), " {\n"];
		for (const child of getUniqueChildren(instance)) generateSubInterface(results, child, 2);
		results.push("}\n");
		(useIoServe ? writeToIoServe : writeToLighting)("types/" + instance.Name + ".d.ts", results.join(""));
	}

	function generateSubRojoInterface(results: Array<string>, instance: Instance, depth: number) {
		const children = getUniqueChildren(instance);
		results.push("\t".rep(depth - 1));
		results.push(validTSIdentifier(instance.Name));
		results.push(": ");

		if (children.size() > 0) {
			results.push(`{\n`);
			results.push("\t".rep(depth));
			results.push('$className: "');
			results.push(instance.ClassName);
			results.push('",\n');

			for (const child of children) {
				generateSubRojoInterface(results, child, depth + 1);
			}

			results.push("\t".rep(depth - 1));
			results.push("}");
		} else {
			results.push('"');
			results.push(instance.ClassName);
			results.push('"');
		}
		results.push(",\n");
	}

	/** Generates a Rojo-esque definition for a given instance */
	export function generateRojoInterface(instance: Instance, useIoServe: boolean) {
		const varName = getTSVariableName(instance.Name);
		const results: Array<string> = ["export const ", varName, ' = {\n\t$className: "', instance.ClassName, '",\n'];

		for (const child of getUniqueChildren(instance)) {
			generateSubRojoInterface(results, child, 2);
		}

		results.push("} as const;\n\n");
		results.push("export type ");
		results.push(varName);
		results.push(" = EvaluateInstanceTree<typeof ");
		results.push(varName);
		results.push(">;\n");

		(useIoServe ? patchToIoServe : writeToLighting)("src/tree-definitions.ts", results.join(""));
	}
}

/** tests to see if io-serve is available */
function isIoServeAvailable() {
	const result = opcall(() => HttpService.RequestAsync({ Url: IO_SERVE_URL, Method: "HEAD" }));
	return result.success === true && result.value.StatusCode === 200;
}

plugin
	.CreateToolbar(PLUGIN_NAME)
	.CreateButton(PLUGIN_NAME, PLUGIN_DESCRIPTION, `rbxassetid://${ICON_ID}`)
	.Click.Connect(() => {
		const selection = Selection.Get();
		const selectionSize = selection.size();

		if (0 < selectionSize) {
			const useIoServe = isIoServeAvailable();

			for (const selected of selection)
				(Settings.shouldExportRojoesque()
					? TreeGenerator.generateRojoInterface
					: TreeGenerator.generateInterface)(selected, useIoServe);

			if (selectionSize !== 1) {
				new Feedback(`Generated multiple files ${useIoServe ? "to io-serve" : "in Lighting"}!`);
			}
		} else {
			new Feedback(
				"Opened settings. Please select an instance in the explorer to convert to a tree, then click this button again."
			);
			Settings.openSettings();
		}
	});

export {};
