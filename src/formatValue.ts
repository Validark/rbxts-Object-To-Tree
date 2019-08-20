const POSITION_PRECISION = 0.001;
const ORIENTATION_PRECISION = 0.001;

function round(number: number, place: number = 1) {
	return math.floor(number / place + 0.5) * place;
}

/**
 * Returns a string representation of a number that can perfectly reproduce the number with a `tonumber` call
 * @param n the number you wish to have a string representation of
 */
function getSignificantDigits(n: number) {
	let str = tostring(n);

	if (tonumber(str) === n) {
		return str;
	}

	for (let i = 15; i <= 99; i++) {
		str = `%.${i}g`.format(n);

		if (tonumber(str) === n) {
			return str;
		}
	}

	return error("Couldn't reproduce accurate number for " + n);
}

export = function formatValue(value: CheckableTypes[keyof CheckableTypes]): string {
	switch (typeOf(value)) {
		case "Axes":
			return `new Axes(${tostring(value).gsub("(%u)(,?)", "Enum.Axis.%1%2")[0]})`;
		case "BrickColor":
			return `new BrickColor("${(value as BrickColor).Name}")`;
		case "CFrame": {
			// this is admittedly a stupid algorithm.
			// if you have a problem with it, submit a PR
			// https://github.com/Validark/rbxts-Object-To-Tree
			const part = new Instance("Part");
			part.CFrame = value as CFrame;
			const position = part.Position;
			const orientation = part.Orientation;
			part.Destroy();

			return `CFrame.fromOrientation(math.rad(${round(orientation.X, ORIENTATION_PRECISION)}), math.rad(${round(
				orientation.Y,
				ORIENTATION_PRECISION
			)}), math.rad(${round(orientation.Z, ORIENTATION_PRECISION)})) + new Vector3(${round(
				position.X,
				POSITION_PRECISION
			)}, ${round(position.Y, POSITION_PRECISION)}, ${round(position.Z, POSITION_PRECISION)})`;
		}
		case "Color3": {
			const { r, g, b } = value as Color3;
			return `Color3.fromRGB(${round(255 * r)}, ${round(255 * g)}, ${round(255 * b)})`;
		}
		case "ColorSequence":
			return `new ColorSequence([${(value as ColorSequence).Keypoints.map(formatValue).join(", ")}])`;

		case "ColorSequenceKeypoint": {
			const { Time: time, Value: color } = value as ColorSequenceKeypoint;
			return `new ColorSequenceKeypoint(${formatValue(time)}, ${formatValue(color)})`;
		}
		case "DockWidgetPluginGuiInfo": {
			const {
				FloatingXSize: floatingXSize,
				FloatingYSize: floatingYSize,
				MinHeight: minHeight,
				MinWidth: minWidth,
				InitialDockState: initialDockState,
				InitialEnabled: initialEnabled,
				InitialEnabledShouldOverrideRestore: initialEnabledShouldOverrideRestore
			} = value as DockWidgetPluginGuiInfo;

			return `new DockWidgetPluginGuiInfo(${formatValue(
				initialDockState
			)}, ${initialEnabled}, ${initialEnabledShouldOverrideRestore}, ${formatValue(floatingXSize)}, ${formatValue(
				floatingYSize
			)}, ${formatValue(minHeight)}, ${formatValue(minWidth)})`;
		}
		case "Enum":
		case "EnumItem":
		case "Enums":
			return tostring(value);
		case "Faces":
			return `new Faces(${tostring(value).gsub("(%u%l+)(,?)", "Enum.NormalId.%1%2")[0]})`;
		case "Instance":
			return (value as Instance).Name;
		case "NumberRange": {
			const { Min: min, Max: max } = value as NumberRange;
			return `new NumberRange(${formatValue(min)}, ${formatValue(max)})`;
		}
		case "NumberSequence":
			return `new NumberSequence([${(value as NumberSequence).Keypoints.map(formatValue).join(", ")}])`;
		case "NumberSequenceKeypoint": {
			const { Time: time, Value: num, Envelope: envelope } = value as NumberSequenceKeypoint;
			return `new NumberSequenceKeypoint(${formatValue(time)}, ${formatValue(num)}, ${formatValue(envelope)})`;
		}
		case "PathWaypoint": {
			const { Position: pos, Action: action } = value as PathWaypoint;
			return `new PathWaypoint(${pos}, ${action})`;
		}
		case "PhysicalProperties":
			return "PHYSICAL_PROPERTIES";
		case "Rect": {
			const {
				Min: { X: minX, Y: minY },
				Max: { X: maxX, Y: maxY }
			} = value as Rect;

			return `new Rect(${formatValue(minX)}, ${formatValue(minY)}, ${formatValue(maxX)}, ${formatValue(maxY)})`;
		}
		case "Region3": {
			const { Size: size, CFrame: cframe } = value as Region3;
			return `new Region3(${formatValue(cframe.Position.sub(size).mul(0.5))}, ${formatValue(
				cframe.Position.add(size).mul(0.5)
			)})`;
		}
		case "UDim": {
			const { Offset: offset, Scale: scale } = value as UDim;
			return `new UDim(${formatValue(scale)}, ${formatValue(offset)})`;
		}
		case "UDim2": {
			const {
				X: { Offset: offsetX, Scale: scaleX },
				Y: { Offset: offsetY, Scale: scaleY }
			} = value as UDim2;
			return `new UDim2(${formatValue(offsetX)}, ${formatValue(scaleX)}, ${formatValue(offsetY)}, ${formatValue(
				scaleY
			)})`;
		}
		case "Vector2": {
			const { X: x, Y: y } = value as Vector2;
			return `new Vector2(${formatValue(x)}, ${formatValue(y)})`;
		}
		case "Vector3": {
			const { X: x, Y: y, Z: z } = value as Vector3;
			return `new Vector3(${formatValue(x)}, ${formatValue(y)}, ${formatValue(z)})`;
		}
		case "string":
			return (value as string).find("\n", 0, true)[0] === undefined ? `"${value}"` : `\`${value}\``;
		case "number": {
			return tostring(round(value as number, POSITION_PRECISION));
		}
		default:
			return tostring(value);
	}
};
