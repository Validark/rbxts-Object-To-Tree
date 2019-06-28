# roblox-ts object-to-tree

You can install this [plugin here](https://www.roblox.com/library/3379119778/rbxts-object-to-tree).

Simply select the instance you want converted into a tree, and click on the plugin to generate its tree (inserted into `Lighting`).

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

###### Note: This plugin in no way guarantees that objects defined in TS this way will exist at run-time. Scripts can rename instances, move them around, or delete them. Don't do those things if you want the definition to be valid.


## Help wanted

If someone would like to make an icon for this plugin, it would be much appreciated!
