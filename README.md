# RW List Finder Web

Local dashboard app for unlocking admin upload once, pasting sheet/list data, searching by app name and optional date range, opening lists in a detail panel, and copying lists exactly as they were pasted.

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

Admin logs in once from the menu/sidebar. Upload then accepts only the pasted sheet/list and automatically detects app name and date. Supported date examples include `2026-05-21`, `21-05-2026`, `21/05/26`, and `21.05.2026`. Sheet columns named `App` and `Date` are supported. Results are arranged date wise automatically.

The Finder uses paged results so it stays responsive with thousands of stored lists.
