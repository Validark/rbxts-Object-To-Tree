import { ApiClass, ApiDump } from "api";
import Feedback from "feedback";
import { HttpService } from "@rbxts/services";

let apiDump: ReadonlyMap<string, ApiClass> | undefined;

export = function getAPIDump() {
	if (apiDump) {
		return apiDump;
	} else {
		new Feedback("Fetching API data...");
		// alternative "https://anaminus.github.io/rbx/json/api/latest.json"
		const request = opcall(() =>
			HttpService.GetAsync(
				"https://raw.githubusercontent.com/CloneTrooper1019/Roblox-Client-Watch/roblox/API-Dump.json"
			)
		);

		if (request.success) {
			const apiRequest = opcall(() => HttpService.JSONDecode(request.value) as ApiDump);

			if (apiRequest.success) {
				const dumpMap = new Map<string, ApiClass>();

				for (const rbxClass of apiRequest.value.Classes) {
					let superclass = dumpMap.get(rbxClass.Superclass);
					if (superclass) {
						for (const rbxMember of superclass.Members) {
							rbxClass.Members.push(rbxMember);
						}
					}

					rbxClass.Members.sort((a, b) => (a.Name < b.Name ? -1 : 1));
					dumpMap.set(rbxClass.Name, rbxClass);
				}

				return (apiDump = dumpMap);
			} else {
				new Feedback("[FATAL] Failed to decode API data.");
			}
		} else {
			new Feedback("Failed to fetch API data. Please enable HttpService.HttpEnabled.");
		}
	}
};
