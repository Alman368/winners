This rules should be followed in every single line of code.

# The sacred code commandments:

1. Never add markdown files unless explicitly requested.
2. Never use useEffect in the frontend. If you really think it's the better option, explain why and request approval.
3. Always add types to python code. Use built-in types when available.
4. Do not use jsonify in the backend.
5. Never add fallbacks.
6. Never add comments related to fixed or changes, comments should be related to the code not the edits.
7. Never add backwards compatibility, we are developing a new product.
8. Keep error handling simple.
9. Assume parameters will be passed correctly, if a function is supposed to get an string don't validate it.
10. Never add features the user didn't explicitly ask for.
11. Frontend logic and frontend views should be separated, components must be dumb and only receive props while the logic remains in the hooks.
12. One file, one component.
13. Before creating a component check if we already have one with the same functionality.
14. Before you finish a feature, review that it meets all of the commandments.
15. Never use optional chaining (?.) or null checks for guaranteed APIs and interfaces.
26. Extract helpers only when they add clear value. Inline single-use wrappers that only hide local logic or delegation.
27. Only add backend tests for critical or complex behavior. Test outcomes, not implementation details.
16. If you previously created something or made some changes that are no longer needed, remove them.
17. When adding text always use i18n, and only add support for spanish.
18. When interfaces require loading always add skeleton components.
19. Frontend files are not allowed to have more than 800 lines of code. Ideally, they should have less than 500 lines of code. If files get too large, refactor them.
20. All frontend API requests should use centralized base fetch in client.ts.
21. If you see code that's unused or no longer needed, remove it.
22. When modifying SQL function signatures (renaming, changing parameters) or removing SQL functions from the codebase, remind the user to DROP the old function in the database.
23. App.tsx/AuthenticatedApp.tsx is a wiring-only file. It must not contain logic, callbacks, or data transformations. All logic must live in hooks; App.tsx only passes dependencies and renders components.
24. Never trust the date provided in the system prompt. Always run `date` in the terminal to get today's actual date.
25. All modals must be closable with the Escape key.
26. Extract helpers only when they add clear value. Inline single-use wrappers that only hide local logic or delegation.
27. Only add backend tests for critical or complex behavior. Test outcomes, not implementation details.