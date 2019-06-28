/// <reference types="@rbxts/types/plugin"/>
import Make from "@rbxts/make";
import { Selection, Lighting } from "@rbxts/services";

const ICON_ID = 0;
const PLUGIN_NAME = "roblox-ts-object-to-tree";
const PLUGIN_DESCRIPTION =
	"A tool for converting instances to their TS tree form. Ignores all instances with name collisions.";

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
			return `type ${name.find("^[%a_][%w_]*$")[0] ? name : "X"} = ${className} &`;
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

/** Recursively generates trees for given objects */
function generateSubInterface(results: Array<string>, instance: Instance, depth: number) {
	const children = getUniqueChildren(instance);

	if (children.size() > 0) {
		results.push(` & {\n`);

		for (const child of children) {
			results.push(`${"\t".rep(depth)}${validTSIdentifier(child.Name)}: ${child.ClassName}`);
			generateSubInterface(results, child, depth + 1);
		}

		results.push(`${"\t".rep(depth - 1)}};\n`);
	} else {
		results.push(";\n");
	}
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

/** Generates an interface for a given instance. Publishes results to Lighting */
function generateInterface(instance: Instance) {
	const results = new Array<string>();
	results.push(createTopLevelInterface(instance));
	results.push(" {\n");

	for (const child of getUniqueChildren(instance)) {
		results.push(`\t${validTSIdentifier(child.Name)}: ${child.ClassName}`);
		generateSubInterface(results, child, 2);
	}

	results.push("}\n");

	const final = results.join("");
	const finalSize = final.size();
	const topSlice = publishSlice(instance.Name, final.slice(0, 20_000), Lighting);

	if (finalSize >= 20_000) {
		let previous = 0;

		for (let i = 20_000; i < final.size(); i += 20_000) {
			publishSlice(instance.Name, final.slice(previous, i), topSlice);
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

plugin
	.CreateToolbar(PLUGIN_NAME)
	.CreateButton(PLUGIN_NAME, PLUGIN_DESCRIPTION, `rbxassetid://${ICON_ID}`)
	.Click.Connect(() => {
		const selection = Selection.Get();

		for (const selected of selection) {
			generateInterface(selected);
		}

		switch (selection.size()) {
			case 0:
				new Feedback(
					"Please select an instance in the explorer to convert to a tree, then click this button again."
				);
				break;
			case 1:
				break;
			default:
				new Feedback("Generated multiple files in Lighting!");
		}
	});

export {};
