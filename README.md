# RW List Finder Web

Mobile-first local web app for showing review-name lists directly, searching by app name and optional date range, copying lists, and unlocking a simple admin upload drawer from the menu.

## Run

```powershell
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Other devices on the same Wi-Fi/network can open the LAN address shown by:

```powershell
Invoke-RestMethod http://localhost:3000/api/network
```

Admin upload PIN:

```text
952518
```

Lists are stored on the computer running the server in `data/lists.json`, so other devices do not need to save files.

Admin logs in once from the top menu. Upload accepts only the pasted sheet/list and automatically detects app name and date. Supported date examples include `2026-05-21`, `21-05-2026`, `21/05/26`, and `21.05.2026`. Sheet columns named `App` and `Date` are supported. Results are arranged date wise automatically.

The list screen uses paged summary results so it stays responsive with thousands of stored lists. Full pasted review-name content is loaded only when a user copies a specific list.
