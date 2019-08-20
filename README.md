# roblox-ts object-to-tree

You can install this [plugin here](https://www.roblox.com/library/3379119778/rbxts-object-to-tree).

[![](https://user-images.githubusercontent.com/15217173/63229057-a99d0680-c1c1-11e9-90b4-ee973e522a81.png)](https://www.roblox.com/library/3379119778/rbxts-object-to-tree)

Simply select the instance you want converted into a tree, and click on the plugin to generate its tree.

Outputted trees look like so:

```ts
type SpawnLocation = SpawnLocation & {
	Decal: Decal;
	Data: Configuration & {
		NumSpawns: IntValue;
		GiveForceField: BoolValue;
	};
}
```

The plugin also supports overriding services which are browsable in Roblox Studio. For example:

```ts
interface Workspace extends Model {
	Terrain: Terrain;
	Camera: Camera;
	Baseplate: Part & {
		BFC: BoolValue;
	};
	SpawnLocation: SpawnLocation & {
		Decal: Decal;
		Data: Configuration & {
			NumSpawns: IntValue;
			GiveForceField: BoolValue;
		};
	};
}
```

Then, anywhere you access `Workspace`, you can access the defined members!

```ts
const workspace = game.GetService("Workspace");
print(++workspace.SpawnLocation.Data.NumSpawns.Value);
```

To automatically insert these files into your project open up your project and run `npx io-serve`, then click the plugin in studio to generate your files.


###### Note: This plugin in no way guarantees that objects defined in TS this way will exist at run-time. Scripts can rename instances, move them around, or delete them. Don't do those things if you want the definition to be valid.

###### Link to io-serve [here](https://www.npmjs.com/package/io-serve)
