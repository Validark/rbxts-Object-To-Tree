const TextService = game.GetService("TextService");

const TEXT_SIZE = 18;
const TEXT_FONT = Enum.Font.SourceSans;

/** A lightweight feedback system */
export = class Feedback {
	static currentFeedback?: Feedback;
	feedbackScreen: ScreenGui;

	constructor(text: string) {
		if (Feedback.currentFeedback) {
			Feedback.currentFeedback.feedbackScreen.Destroy();
		}

		const feedbackScreen = new Instance("ScreenGui");
		feedbackScreen.Name = "FeedbackScreen";

		const feedbackText = new Instance("TextLabel");
		feedbackText.AnchorPoint = new Vector2(0.5, 0.5);
		feedbackText.BackgroundColor3 = Color3.fromRGB(255, 255, 255);
		feedbackText.BorderSizePixel = 0;
		feedbackText.Position = new UDim2(0.5, 0, 0.5, 0);
		feedbackText.Font = TEXT_FONT;
		feedbackText.Text = text;
		feedbackText.TextSize = TEXT_SIZE;

		feedbackText.Size = new UDim2(
			0,
			TextService.GetTextSize(text, TEXT_SIZE, TEXT_FONT, new Vector2(math.huge, math.huge)).X + 36,
			0,
			50,
		);
		feedbackText.Parent = feedbackScreen;
		feedbackScreen.Parent = game.GetService("CoreGui");

		this.feedbackScreen = feedbackScreen;
		Feedback.currentFeedback = this;

		delay(5, () => {
			if (Feedback.currentFeedback === this) {
				feedbackScreen.Destroy();
				Feedback.currentFeedback = undefined;
			}
		});
	}
};
