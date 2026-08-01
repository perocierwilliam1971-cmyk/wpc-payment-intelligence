WPC PAYMENT INTELLIGENCE™ V7.5 — PATCH 1

PURPOSE
This is a surgical fix to the existing V7 Lite application.
The design, embedded logo, analyzer, hidden-fee intelligence,
savings intelligence, dashboard, and proposal features remain intact.

FIX INCLUDED
- Added forms.html: a small static Netlify form declaration that is easier
  for Netlify to detect during deployment than the 4.6 MB application page.
- Updated the existing lead submission to post the original FormData to
  /forms.html as URL-encoded data.
- Preserved the merchant-leads form name and all original field names.
- Added clearer internal error details in the browser console.

DEPLOY
1. Extract this ZIP.
2. Confirm the extracted folder contains:
   index.html
   forms.html
   netlify.toml
   README.txt
3. Drag the ENTIRE extracted folder into the existing Netlify site's
   manual deployment area.
4. Wait for Published.
5. Test with fake merchant information.
6. In Netlify, open Forms and confirm merchant-leads appears.

SUCCESS TEST
After clicking Continue to Secure Upload:
- The lead should save.
- The intake screen should disappear.
- The existing statement analyzer/upload screen should open.

IMPORTANT
Do not upload the ZIP itself. Extract it first, then drag the full folder.
