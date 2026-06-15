# Moody Catalog Recipe Links Design

## Goal

Allow Moody to select one recipe from MoodFood's searchable catalog and attach it to a chat response. The user can open that recipe directly in the existing recipe-detail screen, follow the method, and return to the preserved Moody conversation.

## Scope

- Moody may recommend only recipes available in MoodFood's searchable catalog.
- Moody searches the full catalog rather than only the recipes already loaded into the chat context.
- A response may attach at most one recipe: Moody's final recommendation.
- General discussion, alternatives, and cooking-help responses remain text-only.
- Conversation state is preserved only for the current app session.
- The recommendation card has one action: **View recipe**.

## Recommended Approach

Use a structured chat response containing Moody's conversational message and an optional catalog recipe ID.

This is preferred over embedding special links in text or matching recipe titles from prose because the app can validate a stable catalog ID before rendering a destination. It prevents malformed links and avoids ambiguity between similarly named recipes.

## Architecture And Data Flow

1. The user sends a message to Moody.
2. The chat service determines whether selecting a recipe would help, including when the user did not explicitly request a recommendation.
3. When a recommendation is appropriate, the service searches the full searchable catalog using the current message and relevant conversation context.
4. Existing saved diet, allergy, exclusion, and other hard safety rules filter the candidates before Moody can select a recipe.
5. Moody selects one final eligible recipe.
6. The chat service returns Moody's message plus the selected recipe's catalog ID.
7. The app verifies that the ID resolves to an available catalog recipe and that the recipe still satisfies hard safety rules.
8. The app renders a recommendation card beneath the associated Moody response.
9. Selecting **View recipe** closes the chat panel and opens the existing recipe-detail screen directly.

When no eligible recipe exists, Moody returns no recipe ID and explains that no safe match was found. Moody may suggest relaxing non-safety preferences but must not suggest relaxing allergies, diet requirements, or exclusions.

## Chat Experience

Each Moody response can own zero or one recommendation card. A card contains:

- Recipe image
- Recipe title
- Cooking time
- Short recommendation reason
- **View recipe** action

Moody may discuss multiple alternatives in text, but only its final selected recipe receives a card. Replies that answer general questions or provide cooking help do not receive a card unless Moody clearly selects a new final recipe.

## Navigation And Session State

Opening the recommendation navigates directly to the existing recipe-detail screen. The app records that the detail screen was opened from Moody.

Pressing **Back** from that recipe returns to the Moody conversation rather than the screen underneath the original chat panel. The session-preserved conversation restores its messages and prior scroll position.

Conversation history does not persist after the app session ends. This limits storage of potentially sensitive chat content and keeps the initial feature focused.

## Failure Handling

- If the returned recipe ID is invalid, unavailable, or cannot be resolved, show Moody's text response without a broken card.
- If the resolved recipe fails the app's independent hard-safety validation, do not show the card.
- If catalog search is unavailable, Moody explains that recipe recommendations are temporarily unavailable.
- If no safe recipe matches, Moody explains the no-match result and suggests changing only non-safety preferences.
- A recipe removed from the catalog after recommendation must fail gracefully when opened, without navigating to an empty detail screen.

## Testing

Cover:

- Full-catalog search produces one eligible final recommendation.
- Saved diet, allergies, and exclusions are always enforced.
- Conversational constraints affect candidate selection.
- No-match responses contain no recipe card.
- General and cooking-help responses remain text-only.
- Invalid, unavailable, and unsafe returned recipe IDs do not render cards.
- A valid card opens the correct existing recipe-detail screen.
- **Back** returns to the preserved Moody conversation and scroll position.
- Conversation state is cleared when the app session ends.

## Out Of Scope

- Recommending recipes outside MoodFood's searchable catalog
- Multiple recipe cards in one Moody response
- Plain-text deep links or title-based recipe matching
- Quick actions such as Save or Start cooking on the chat card
- Persisting Moody conversations across app sessions
