import formatValue from "formatValue";
import getAPIDump from "./apiDump";
import { IO_SERVE_URL, OPTIONS } from "config";
import Feedback from "feedback";
import { SecurityType, ApiClass } from "api";

const Lighting = game.GetService("Lighting");
const HttpService = game.GetService("HttpService");

const propNames = new Map<string, Set<string>>();

function getPropNames(className: string) {
	let classPropNames = propNames.get(className);

	if (classPropNames === undefined) {
		propNames.set(
			className,
			(classPropNames =
				new Set(
					getAPIDump()
						?.get(className)
						?.Members.map((m) => m.Name),
				) ?? error("Unable to get indexable names for " + className)),
		);
	}

	return classPropNames;
}

/** Given an object, will return an array of Children, excluding children with duplicate names */
function getUniqueChildren(object: Instance) {
	const takenNames = getPropNames(object.ClassName);
	const shouldParse = new Map<string, Instance>();

	for (const instance of object.GetChildren()) {
		const { Name: name } = instance;
		if (takenNames.has(name)) {
			shouldParse.delete(name);
		} else {
			takenNames.add(name);
			shouldParse.set(name, instance);
		}
	}

	return shouldParse;
}

function getTSVariableName(name: string) {
	return (name.match("^[%a_][%w_]*$")[0] as string) ?? "X";
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
	"instanceof",
]);

function validTSIdentifier(str: string) {
	return !invalidTSBlacklist.has(str) && str.find("^[%a_$][%w_$]*$")[0] !== undefined ? str : `["${str}"]`;
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
	const script = new Instance("Script");
	script.Source = slice;
	script.Name = getValidName(name, parent);
	script.Parent = parent;
	return script;
}

/** Writes output to Script objects inside of Lighting */
function writeToLighting(name: string, source: string) {
	name = name.split("/").pop()!;
	const sourceSize = source.size();
	const topSlice = publishSlice(name, source.sub(1, 20_000 - 1), Lighting);

	if (sourceSize >= 20_000) {
		let i = 20_000;
		for (; i < source.size(); i += 20_000) {
			publishSlice(name, source.sub(i, i + 19_999), topSlice);
		}

		publishSlice(name, source.sub(i), topSlice);

		new Feedback(
			`Generated files in Lighting! Your file was too long to put in a single script, so check ${topSlice.Name}'s children.`,
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
		Body: source,
	});
	new Feedback(`Wrote to file \`${name}\` in io-serve!`);
}

/** Writes output to io-serve */
function patchToIoServe(
	name: string,
	source: string,
	start = `import { EvaluateInstanceTree } from "@rbxts/validate-tree";\n\n`,
) {
	const previousFile = HttpService.RequestAsync({
		Url: `${IO_SERVE_URL}/${name}`,
		Method: "GET",
	});

	if (previousFile.Success && previousFile.Body) {
		source = "\n" + source;
	} else {
		source = start + source;
	}

	HttpService.RequestAsync({
		Url: `${IO_SERVE_URL}/${name}`,
		Method: "PATCH",
		Body: source,
	});

	new Feedback(`Patched file \`${name}\` in io-serve!`);
}

/** Recursively generates trees for given objects */
function generateSubInterface(results: Array<string>, [instanceName, instance]: [string, Instance], depth: number) {
	results.push(`${"\t".rep(depth - 1)}${validTSIdentifier(instanceName)}: ${instance.ClassName}`);
	const children = getUniqueChildren(instance);

	if (!children.isEmpty()) {
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
function generateInterface(instance: Instance, useIoServe: boolean) {
	const results: Array<string> = [createTopLevelInterface(instance), " {\n"];
	for (const child of getUniqueChildren(instance)) generateSubInterface(results, child, 2);
	results.push("}\n");
	(useIoServe ? writeToIoServe : writeToLighting)("types/" + instance.Name + ".d.ts", results.join(""));
	return true;
}

function generateSubRojoInterface(results: Array<string>, [instanceName, instance]: [string, Instance], depth: number) {
	const children = getUniqueChildren(instance);
	results.push("\t".rep(depth - 1));
	results.push(validTSIdentifier(instanceName));
	results.push(": ");

	if (!children.isEmpty()) {
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
function generateRojoInterface(instance: Instance, useIoServe: boolean) {
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
	return true;
}

const defaultObjects = {} as CreatableInstances;

function getDefaultPropertyOfInstanceType<
	T extends keyof CreatableInstances,
	P extends WritablePropertyNames<CreatableInstances[T]>
>(className: T, property: P): CreatableInstances[T][P] {
	let defaultObj = defaultObjects[className];
	if (!defaultObj) {
		const attempt = opcall(() => new Instance(className));
		if (attempt.success) {
			defaultObjects[className] = defaultObj = attempt.value;
		} else {
			error(attempt.error);
		}
	}
	return defaultObj[property];
}

const hasText = (obj: Instance): obj is TextBox | TextLabel | TextButton =>
	obj.IsA("TextBox") || obj.IsA("TextLabel") || obj.IsA("TextBox");

const exclusionConditions: Array<{ condition: (obj: Instance) => boolean; omitProperties: Array<string> }> = [
	{ condition: (obj) => obj.IsA("GuiObject"), omitProperties: ["Transparency"] },
	{
		condition: (obj) => obj.IsA("GuiObject") && obj.BackgroundTransparency === 1,
		omitProperties: ["BackgroundColor3", "BorderColor3", "BorderSizePixel"],
	},
	{ condition: (obj) => obj.IsA("GuiObject") && obj.BorderSizePixel === 0, omitProperties: ["BorderColor3"] },
	{ condition: (obj) => hasText(obj) && obj.TextStrokeTransparency === 1, omitProperties: ["TextStrokeColor3"] },
	{
		condition: (obj) => hasText(obj) && obj.TextTransparency === 1,
		omitProperties: [
			"TextStrokeTransparency",
			"TextStrokeColor3",
			"TextColor3",
			"TextScaled",
			"Font",
			"FontSize",
			"Text",
			"TextTransparency",
			"TextWrapped",
			"TextXAlignment",
			"TextYAlignment",
		],
	},
	{
		condition: (obj) => obj.IsA("BasePart"),
		omitProperties: ["Position", "Rotation", "Orientation", "BrickColor"],
	},
	{ condition: (obj) => obj.IsA("Attachment") || obj.IsA("BasePart"), omitProperties: ["Rotation", "CFrame"] },
	{ condition: (obj) => obj.IsA("MeshPart"), omitProperties: ["MeshId"] },
	{ condition: (obj) => obj.IsA("LuaSourceContainer"), omitProperties: ["Source"] },
];

const ignoredTags = new ReadonlySet(["Deprecated", "NotScriptable", "ReadOnly"]);
const validSecurityTags = new ReadonlySet<SecurityType>(["None", "PluginSecurity"]);

function isDisjointWith(a: Array<unknown>, b: ReadonlySet<unknown>) {
	for (const x of a) {
		if (b.has(x)) return false;
	}

	return true;
}

function getPropertiesToCompile(rbxClass: ApiClass, instance: Instance, omittedProperties = new Set<string>()) {
	for (const { condition, omitProperties } of exclusionConditions) {
		if (condition(instance)) for (const omitProperty of omitProperties) omittedProperties.add(omitProperty);
	}

	return rbxClass.Members.filter(
		(rbxMember) =>
			rbxMember.MemberType === "Property" &&
			!omittedProperties.has(rbxMember.Name) &&
			(!rbxMember.Tags || isDisjointWith(rbxMember.Tags, ignoredTags)) &&
			(typeIs(rbxMember.Security, "string")
				? validSecurityTags.has(rbxMember.Security)
				: validSecurityTags.has(rbxMember.Security.Read) && validSecurityTags.has(rbxMember.Security.Write)) &&
			instance[rbxMember.Name as keyof typeof instance] !==
				getDefaultPropertyOfInstanceType(
					instance.ClassName as keyof CreatableInstances,
					rbxMember.Name as WritablePropertyNames<CreatableInstances[keyof CreatableInstances]>,
				),
	).sort((a, b) => a.Name < b.Name);
}

function instantiateHelper(apiDump: ReadonlyMap<string, ApiClass>, instance: Instance, results: Array<string>) {
	const rbxClass = apiDump.get(instance.ClassName);

	if (rbxClass) {
		const varName = getTSVariableName(instance.Name);
		results.push(`const ${varName} = new Instance("${instance.ClassName}");\n`);

		for (const { Name: prop } of getPropertiesToCompile(rbxClass, instance)) {
			results.push(varName);
			results.push(".");
			results.push(prop);
			results.push(" = ");
			results.push(formatValue(instance[prop as keyof typeof instance]));
			results.push(";\n");
		}

		results.push("\n");
		for (const child of instance.GetChildren()) instantiateHelper(apiDump, child, results);
	}

	return results;
}

/** Generates TS Instantiation Code */
function generateInstantiation(instance: Instance, useIoServe: boolean) {
	const apiDump = getAPIDump();

	if (apiDump) {
		(useIoServe ? patchToIoServe : writeToLighting)(
			"src/" + getTSVariableName(instance.Name) + ".ts",
			instantiateHelper(apiDump, instance, new Array<string>()).join(""),
		);
		return true;
	} else return false;
}

function roactHelper(apiDump: ReadonlyMap<string, ApiClass>, instance: Instance, results: Array<string>, depth = 0) {
	const rbxClass = apiDump.get(instance.ClassName);

	if (rbxClass) {
		const children = instance
			.GetChildren()
			.filter((child) => child.IsA("GuiObject") || child.IsA("UIBase") || child.IsA("LayerCollector"));

		const indent = `\t`.rep(depth);
		results.push(indent);
		results.push(`<`);
		results.push(instance.ClassName.lower());

		const propResults = new Array<string>();
		let propLength = children.size() > 0 ? 1 : 2;

		for (const { Name: prop } of getPropertiesToCompile(rbxClass, instance, new Set(["Parent"]))) {
			let valueStr = formatValue(instance[prop as keyof typeof instance]);
			if (valueStr.find(`^".+"$`)[0] === undefined) valueStr = `{${valueStr}}`;
			propLength += (depth + 1) * 4 + valueStr.size();
			if (prop === "Name") {
				propResults.unshift(`Key=${valueStr}`);
				propLength += 3;
			} else {
				propResults.push(`${prop}=${valueStr}`);
				propLength += prop.size();
			}
		}

		const multiline = propLength > 120;

		if (multiline) {
			results.push(`\n`);
			results.push(propResults.map((line) => indent + "\t" + line).join("\n"));
		} else {
			results.push(` `);
			results.push(propResults.join(" "));
		}

		if (children.size() > 0) {
			results.push(multiline ? `\n${indent}>` : `>`);
			for (const child of children) {
				results.push("\n");
				roactHelper(apiDump, child, results, depth + 1);
			}
			results.push("\n");
			results.push(indent);
			results.push(`</`);
			results.push(instance.ClassName.lower());
			results.push(`>`);
		} else {
			results.push(multiline ? `\n` + indent + `/>` : propResults.size() ? ` />` : `/>`);
		}
	}

	return results;
}

/** Generates TS Instantiation Code */
function generateRoactInstantiation(instance: Instance, useIoServe: boolean) {
	const apiDump = getAPIDump();

	if (apiDump) {
		const fileName = "src/" + getTSVariableName(instance.Name) + ".tsx";
		const source = roactHelper(apiDump, instance, new Array<string>()).join("");

		if (useIoServe) {
			patchToIoServe(fileName, source, `import Roact from "@rbxts/roact";\n\n`);
		} else {
			writeToLighting(fileName, source);
		}
		return true;
	} else return false;
}

export = new ReadonlyMap<OPTIONS, (instance: Instance, useIoServe: boolean) => boolean>([
	["Instantiation code", generateInstantiation],
	["Roact TSX code", generateRoactInstantiation],
	["Rojo-esque tree", generateRojoInterface],
	["TS types", generateInterface],
]);
