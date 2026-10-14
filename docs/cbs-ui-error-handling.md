# CBS UI error handling

Users must always see why an action failed. A red field border is not an error message.

## One surface

Failures, and warnings that block an action, use `<api-validate>`. The banner reads `$rootScope.errorStatus` and `$rootScope.errorDetails`. A screen that keeps its own `errorStatus` or `errorDetails` on the controller scope is shown the same way.

Success messages stay on the existing success alert. Do not use `window.alert` for errors.

## What the user sees

The banner lists every problem. Where the matching input is on the page, the same sentence also appears under that field, and the field border turns red. If the API parameter name is not an element id, the banner still lists the sentence.

## Wording

1. Show the translation of `userMessageGlobalisationCode` when that key exists in the active language.
2. Otherwise show Fineract `defaultUserMessage`.
3. Otherwise show the English catalogue string.

French is `locale-fr.json`. English remains the fallback when a key has no French entry.

The UI never shows `developerMessage`, raw parameter values, or the response body. Those are written to the browser console.

## How long it stays

The banner stays until the user dismisses it, leaves the screen, or refreshes. Dismiss removes the message and the close button from every banner on the screen. A later request for a different action, including a successful one, does not clear it. Inside a dialog, it stays until dismiss, dialog close, or refresh. Submitting the same action again clears the previous banner before the new result is shown.

## When the server message is missing

| Situation | Message |
|---|---|
| 401 | Your session has expired. Sign in again. |
| 403 with no user message | You do not have permission to do this. Contact your supervisor if you need access. |
| 404 | This record could not be found. Refresh the page. If it is still missing, contact support. |
| 409 with no user message | This record was changed by someone else. Refresh and try again. |
| 500, 502, 504, or a body that is not JSON | Something went wrong on the server. Try again. If it continues, contact support and include the time of this action. |
| No connection (status 0 or -1) | No connection. Check your network and try again. If this continues, contact support. |

400, 403, 404, 409, and 422 responses that include `errors[]` show those user messages instead of the escalation line.

## Accessibility

The banner is an alert with `role="alert"` and `aria-live="assertive"`. The dismiss control has a text label. Color is not the only indicator.
