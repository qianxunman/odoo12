# Screenshots for List View Field Hidden

## Required Screenshots

For uploading to apps.odoo.com, you need to provide at least 2 screenshots:

### Screenshot 1: Column Chooser Dropdown
**File**: `screenshot1.png`
**Description**: Shows the column chooser dropdown menu open, displaying checkboxes for each field.

**What to capture**:
- A list view (e.g., Sales > Quotations)
- The column chooser icon (slider icon) in the table header
- The dropdown menu open with checkboxes visible
- Some fields checked, some unchecked to show the functionality

**Recommended size**: 1200x800 pixels or larger

### Screenshot 2: Hidden Columns Applied
**File**: `screenshot2.png`
**Description**: Shows a list view with some columns hidden, demonstrating that the preferences are applied.

**What to capture**:
- The same list view as Screenshot 1
- Some columns hidden (not visible in the table)
- The column chooser icon visible
- The table showing only visible columns

**Recommended size**: 1200x800 pixels or larger

## How to Take Screenshots

1. **Install the module** in your Odoo 12 instance
2. **Open a list view** (e.g., Sales > Quotations)
3. **Take Screenshot 1**:
   - Click the slider icon in the table header
   - Make sure the dropdown menu is open
   - Uncheck a few fields (e.g., "Quotation Number", "Date Order")
   - Take a screenshot showing the dropdown with checkboxes
4. **Take Screenshot 2**:
   - Close the dropdown menu
   - Take a screenshot showing the table with hidden columns
   - The hidden columns should not be visible in the table

## Tips for Good Screenshots

- Use a clean, professional-looking Odoo instance
- Make sure the browser window is large enough to show the full table
- Use English language interface if possible
- Show meaningful data (not just empty tables)
- Highlight the key features (dropdown menu, hidden columns)
- Use consistent styling and colors

## File Naming

- `screenshot1.png` - Column chooser dropdown
- `screenshot2.png` - Hidden columns applied

Save these files in the `static/description/` directory of the module.

