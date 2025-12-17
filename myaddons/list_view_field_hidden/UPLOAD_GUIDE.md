# Upload Guide for apps.odoo.com

## Preparation Checklist

Before uploading to apps.odoo.com, make sure you have:

- [x] Module code complete and tested
- [ ] Screenshots taken and saved
- [ ] Module description updated
- [ ] README.md created
- [ ] index.html created

## Screenshots Required

You need at least 2 screenshots saved in `static/description/`:

1. **screenshot1.png** - Column chooser dropdown menu open
2. **screenshot2.png** - List view with hidden columns applied

### How to Take Screenshots

1. Install the module in your Odoo 12 instance
2. Open a list view (e.g., Sales > Quotations)
3. For Screenshot 1:
   - Click the slider icon (⚙️) in the table header
   - Make sure the dropdown menu is open
   - Uncheck a few fields to show the functionality
   - Take a screenshot (1200x800 or larger recommended)
4. For Screenshot 2:
   - Close the dropdown
   - Take a screenshot showing the table with hidden columns
   - The hidden columns should not be visible

Save the screenshots as:
- `static/description/screenshot1.png`
- `static/description/screenshot2.png`

## Upload Steps

1. **Prepare the module**:
   - Ensure all files are in place
   - Test the module thoroughly
   - Take and save screenshots

2. **Create a ZIP file**:
   ```bash
   cd /path/to/myaddons
   zip -r list_view_field_hidden.zip list_view_field_hidden/
   ```
   Or use your preferred method to create a ZIP archive.

3. **Upload to apps.odoo.com**:
   - Log in to apps.odoo.com
   - Go to "Publish an App"
   - Fill in the module information:
     - **Name**: List View Field Hidden
     - **Summary**: Customize list view columns visibility with persistent browser storage
     - **Description**: Copy from README.md or use the description in __manifest__.py
     - **Category**: Tools
     - **Version**: 12.0.1.0.0
     - **License**: OPL-1
     - **Odoo Version**: 12.0
   - Upload the ZIP file
   - Upload screenshots (screenshot1.png and screenshot2.png)
   - Submit for review

## Module Information Summary

- **Name**: List View Field Hidden
- **Summary**: Customize list view columns visibility with persistent browser storage
- **Version**: 12.0.1.0.0
- **Author**: qianxunman
- **Support Email**: hb.luojun@outlook.com
- **Category**: Tools
- **License**: OPL-1
- **Price**: $10.00 USD
- **Dependencies**: web
- **Odoo Version**: 12.0

## Description Text (for apps.odoo.com)

```
Customize your list view columns with persistent browser storage.

Features:
- Customizable Column Visibility: Show or hide any column in list views
- Persistent Storage: Preferences saved in browser localStorage
- Works Everywhere: Standard list views and one2many fields in form views
- Smart Storage: Stable storage keys prevent localStorage bloat
- Easy to Use: Simple dropdown menu with checkboxes
- No Configuration Required: Works out of the box

Usage:
1. Open any list view (e.g., Sales > Quotations)
2. Click the slider icon (⚙️) in the table header
3. Check/uncheck fields to show or hide columns
4. Your preferences are automatically saved and persist across sessions
```

## Tips

- Make sure screenshots are clear and professional
- Test the module on a clean Odoo 12 installation
- Ensure all dependencies are listed correctly
- Write a clear and concise description
- Include keywords that users might search for

## Support

After uploading, be prepared to:
- Respond to user questions
- Fix any reported bugs
- Update the module based on feedback

Good luck with your upload!

