### Feature: Restore clipboard image paste attachments in composer

#### Prerequisites
- Start the app from this repository (`pnpm run dev`).
- Open any thread where the composer is enabled.
- Have an image copied to system clipboard (for example screenshot copy).

#### Steps
1. Focus the composer textarea.
2. Paste clipboard content that contains only an image file payload.
3. Confirm an image chip/preview is added to composer attachments.
4. Copy plain text only and paste into composer.
5. Copy mixed content (plain text + image, if source provides both) and paste once.
6. Copy long plain text (at least 20,000 characters) and paste into composer.
7. Confirm the long text is attached as a `.txt` file instead of being inserted into the textarea.
8. Open Settings and set `Paste as file at (characters)` to 30,000. Commit the field with Enter or by moving focus away.
9. Paste 29,999 characters: confirm they remain inline. Paste exactly 30,000 characters: confirm a `.txt` attachment appears. Repeat with 30,001.
10. Reload and confirm Settings still shows 30,000. Repeat the threshold check in both a new chat and an existing thread.
11. Enter an empty value, zero, a negative number, and a fractional value, committing each: confirm the setting returns to 20,000.
12. Check the setting in light and dark themes.
13. Send the message with the pasted image/text attachment.

#### Expected Results
- Image-only clipboard paste adds an image attachment to composer.
- Plain-text paste below the configured threshold inserts text into the composer without creating an attachment.
- Mixed payload paste below the configured text threshold attaches the image while preserving text paste behavior.
- Long plain-text paste (>= configured threshold (default 20,000 characters)) creates a `.txt` attachment and does not insert raw text into the textarea.
- Sending proceeds with the attached pasted image.

#### Rollback/Cleanup
- Remove test attachments and clear test drafts. Restore the paste setting to 20,000 or its previous value.
