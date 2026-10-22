### Feature: Header Codex usage summary and details

#### Prerequisites
- Run the current feature checkout on `http://127.0.0.1:4173`, or the configured `/codex/` deployment base path.
- Use a Codex account providing rate limits. For deterministic checks, stub `account/rateLimits/read` with 17% used for a 300-minute window and 35% used for a 10080-minute window, plus reset timestamps and plan/credit metadata.
- Test light and dark themes, including 375x812 and 768x1024 viewports.

#### Steps
1. Open an existing conversation. Confirm the header usage control appears beside the terminal/script and Git controls.
2. Confirm the summary reads `5h 83%` and `7d 65%`: these are remaining percentages.
3. Click the control. Check used/remaining values, plan, credits if supplied, exact local reset dates with timezone, and time until reset.
4. Close with Escape; confirm keyboard focus returns to the trigger. Reopen using the keyboard and close by clicking outside.
5. Reload. Confirm the same quota data is shown after the normal shared refresh and that merely opening/closing the dropdown makes no extra rate-limit API requests.
6. Repeat on home, Skills, and Automations routes. Repeat light/dark and responsive checks; the panel and existing header controls must fit the viewport.
7. Exercise 100% used, one missing window, missing reset time, missing quota, and atypical window durations. Confirm exhausted quota shows 0% remaining, unavailable data is explicit, and durations are not mislabeled 5h/7d.
8. Deliver an `account/rateLimits/updated` notification. Confirm the header and open details reflect it through the existing shared state, including if quota becomes unavailable.
9. Test a `/codex/` base-path deployment when integrating with the Apache branch; the new component must not add root-relative fetch calls.

#### Expected Results
- The real header surface shows remaining quota and readable details in both themes.
- No browser-native select, additional quota polling, or independent component fetch is introduced.
- Existing terminal/script and Git controls remain reachable, with no horizontal overflow.
- Missing quota/reset data never appears as fabricated 100% availability.
- The dropdown updates when existing quota state changes and closes with outside click/Escape.

#### Rollback/Cleanup
- Close the dropdown, remove test stubs, clear test drafts, and restore the previous appearance setting.
- No messages need to be sent and no account/provider configuration needs to be changed.
