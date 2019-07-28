// THE FOLLOWING LIBRARY IS INCLUDED BECAUSE THIS HAS NOT BEEN FINALIZED ENOUGH TO BE A LIBRARY
// However, it should be good enough for this particular case.
// @author Validark

import Cue from "@rbxts/cue";
import { Linear } from "@rbxts/easing-functions";
import Tween, { PseudoTween } from "@rbxts/tween";

type GetProperties2<T> = {
	[Key in keyof T]-?: T[Key] extends Cue ? never : (() => any) extends T[Key] ? never : Key
}[keyof T];

type GetBindableToCues<T> = {
	[key in ({ [k in keyof T]-?: T[k] extends Cue ? k : never })[keyof T]]: (T[key] extends Cue<infer R> ? R : never)
};

/**
 * Returns a table wherein an object's writable properties can be specified,
 * while also allowing functions to be passed in which can be bound to a Cue.
 */
type GetPartialObjectWithBindableCueSlots<T> = Partial<Pick<T, GetProperties2<T>> & GetBindableToCues<T>>;

const frames = new Array<Vector2>();
const FRAMES_PER_ANIMATION = 30;
const ANIMATION_TIME = 0.25;
const COLUMNS = 15;
const DIMENSION_X = 36;
const DIMENSION_Y = 36;
const HOVER_FRAMES = 6;
const HOVER_ANIMATION_TIME = 0.1;

const OLD_IMAGES = {
	0: 3336269098,
	2: 3336269399,
	4: 3336269669,
	8: 3336269958
} as const;

const IMAGES = {
	0: 3336269098,
	2: 3336484156,
	4: 3336484351,
	8: 3336484559,
	16: 3336484747
} as const;

type k = keyof typeof IMAGES;

const f231 = IMAGES[0];

for (let i = 0; i < 60; i++) {
	frames[i] = new Vector2((i % COLUMNS) * DIMENSION_X, math.floor(i / COLUMNS) * DIMENSION_Y);
}

let numCheckboxes = 0;

const Canceler: PseudoTween | { Running: false } = { Running: false };

/** A material design Checkbox element. */
class Checkbox {
	private isLightTheme!: boolean;
	private button: ImageButton;
	private check: ImageLabel;
	private currentTween = Canceler;
	private isChecked: boolean | undefined;
	private isHovering = false;
	private hoverFrame = 0;
	private isDisabled = false;

	/** A cue which runs when the Checkbox is Checked. */
	public onChecked: Cue<(isChecked?: boolean) => void> = new Cue();

	constructor(
		settings?: GetPartialObjectWithBindableCueSlots<Checkbox> & {
			parent?: Instance;
			isChecked?: boolean;
			position?: UDim2;
			anchorPoint?: Vector2;
			size?: 24 | 48;
			borderRadius?: keyof typeof IMAGES;
			theme?: "Light" | "Dark";
		}
	) {
		const { onChecked: onChecked } = this;

		const button = new Instance("ImageButton");
		button.BackgroundTransparency = 1;
		button.Name = "Checkbox" + numCheckboxes++;

		const check = new Instance("ImageLabel");
		check.AnchorPoint = new Vector2(0.5, 0.5);
		check.BackgroundTransparency = 1;
		check.ImageRectSize = new Vector2(36, 36);
		check.Position = new UDim2(0.5, 0, 0.5, 0);
		check.Size = new UDim2(0.75, 0, 0.75, 0);
		check.Parent = button;

		this.button = button;
		this.check = check;

		const switchChecked = () => this.setChecked(!this.isChecked);

		const enterHoverState = () => {
			this.isHovering = true;
			if (this.isChecked === false) {
				if (this.currentTween.Running) {
					this.currentTween.Cancel();
				}
				this.currentTween = Tween(
					HOVER_ANIMATION_TIME,
					Linear,
					x => (this.check.ImageRectOffset = frames[(this.hoverFrame = math.floor(x + 0.5))]),
					this.hoverFrame % 7,
					HOVER_FRAMES
				);
			}
		};

		const exitHoverState = () => {
			this.isHovering = false;
			if (this.isChecked === false) {
				if (this.currentTween.Running) {
					this.currentTween.Cancel();
				}

				this.currentTween = Tween(
					HOVER_ANIMATION_TIME,
					Linear,
					x => (check.ImageRectOffset = frames[(this.hoverFrame = math.floor(x + 0.5))]),
					this.hoverFrame % 7,
					0
				);
			}
		};

		button.MouseEnter.Connect(enterHoverState);
		button.MouseLeave.Connect(exitHoverState);
		button.MouseButton1Click.Connect(switchChecked);

		if (settings) {
			const { position, anchorPoint } = settings;

			this.isChecked = settings.isChecked;
			this.setSize(settings.size || 24);
			this.setBorderRadius(settings.borderRadius || 2);
			this.setTheme(settings.theme || "Light");

			if (position) button.Position = position;
			if (anchorPoint) button.AnchorPoint = anchorPoint;

			button.Parent = settings.parent;
			onChecked.bind(settings.onChecked);
			onChecked.go(settings.isChecked);
		} else {
			this.isChecked = false;
			this.setSize(24);
			this.setBorderRadius(2);
			this.setTheme("Light");
		}

		delay(0.5, () => this.setChecked(this.isChecked));
	}

	public getTheme() {
		return this.isLightTheme ? "Light" : "Dark";
	}

	public setTheme(theme: "Light" | "Dark") {
		const isLightTheme = (this.isLightTheme = theme === "Light");

		if (this.isChecked === false) {
			const { check } = this;
			check.ImageColor3 = isLightTheme ? Color3.fromRGB(0, 0, 0) : Color3.fromRGB(255, 255, 255);
			check.ImageTransparency = isLightTheme ? (this.isDisabled ? 0.74 : 0.46) : this.isDisabled ? 0.7 : 0.3;
		}
	}

	public getPosition() {
		return this.button.Position;
	}

	public setPosition(position: UDim2) {
		this.button.Position = position;
	}

	public getSize() {
		return this.button.Size.X.Offset as 24 | 48;
	}

	public setSize(size: 24 | 48) {
		this.button.Size = new UDim2(0, size, 0, size);
	}

	public getBorderRadius() {
		const assetId = tonumber(this.check.Image.slice(13));
		for (const [borderRadius, id] of Object.entries(IMAGES)) if (assetId === id) return borderRadius;
		return 0;
	}

	public setBorderRadius(borderRadius: keyof typeof IMAGES) {
		this.check.Image = `rbxassetid://${IMAGES[borderRadius]}`;
	}

	public getParent() {
		return this.button.Parent;
	}

	public setParent(parent: Instance | undefined) {
		this.button.Parent = parent;
	}

	public getAnchorPoint() {
		return this.button.AnchorPoint;
	}

	public setAnchorPoint(anchorPoint: Vector2) {
		this.button.AnchorPoint = anchorPoint;
	}

	/** Unbinds all Events from this object and prepares it for garbage collection. */
	public destroy() {
		this.onChecked.unbindAll();
		this.button.Destroy();
		this.check.Destroy();
	}

	/** Sets the Checkbox `IsChecked` property and animates to it. Fires the `OnChecked` cue.
	 *
	 * The following table shows the different values which `isChecked` can be and their corresponding appearances:
	 *
	 * |isChecked||||||Checkbox appearance|
	 * |:---:|:-:|:-:|:-:|:-:|:-:|:---:|
	 * |true||||||Checked|
	 * |false||||||Unchecked|
	 * |undefined||||||Indeterminate|
	 *
	 * @param isChecked Whether the Checkbox should be checked
	 */
	public setChecked(isChecked?: boolean) {
		this.isChecked = isChecked;
		this.onChecked.go(isChecked);

		const { check } = this;

		if (isChecked) {
			check.ImageTransparency = 0;
			check.ImageColor3 = Color3.fromRGB(0, 150, 136);
			if (this.currentTween.Running) {
				this.currentTween.Cancel();
			}
			this.currentTween = Tween(
				ANIMATION_TIME,
				Linear,
				x => (check.ImageRectOffset = frames[(this.hoverFrame = math.floor(x + 0.5))]),
				this.hoverFrame < 7 ? this.hoverFrame : 0,
				FRAMES_PER_ANIMATION
			);
		} else {
			check.ImageTransparency = 0.46;
			check.ImageColor3 = Color3.fromRGB(0, 0, 0);
			if (this.currentTween.Running) {
				this.currentTween.Cancel();
			}
			const currentTween = Tween(
				ANIMATION_TIME,
				Linear,
				x => (check.ImageRectOffset = frames[(this.hoverFrame = math.floor(x + 0.5) % 60)]),
				this.hoverFrame,
				60 - (this.isHovering ? 0 : 0)
			);

			// currentTween.FinishCallback = finished => {
			// if (finished) check.ImageRectOffset = frames[(this.hoverFrame = 6)];
			// };

			this.currentTween = currentTween;
		}
	}

	/** Returns whether the Checkbox is Checked.
	 *
	 * The following table shows the different values which `isChecked` can be and their corresponding appearances:
	 *
	 * |isChecked||||||Checkbox appearance|
	 * |:---:|:-:|:-:|:-:|:-:|:-:|:---:|
	 * |true||||||Checked|
	 * |false||||||Unchecked|
	 * |undefined||||||Indeterminate|
	 *
	 */
	public getChecked() {
		return this.isChecked;
	}

	public clone(): Checkbox {
		return new Checkbox({
			isChecked: this.isChecked,
			position: this.button.Position,
			anchorPoint: this.button.AnchorPoint,
			size: this.button.Size.X.Offset as 24 | 48,
			borderRadius: this.getBorderRadius()
		});
	}
}

export = Checkbox;
