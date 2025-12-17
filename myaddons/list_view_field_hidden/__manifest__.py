{
    'name': 'List View Field Hidden',
    'summary': 'Customize list view columns visibility with persistent browser storage',
    'version': '12.0.1.0.0',
    'author': 'qianxunman',
    'website': '',
    'support': 'hb.luojun@outlook.com',
    'license': 'OPL-1',
    'category': 'Tools',
    'price': 10.00,
    'currency': 'USD',
    'depends': ['web'],
    'data': [
        'views/assets.xml',
    ],
    'qweb': [
        'static/src/xml/list_view_field_hidden.xml',
    ],
    'images': [
        'static/description/screenshot1.png',
        'static/description/screenshot2.png',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
    'description': '''
List View Field Hidden
======================

Customize your list view columns with persistent browser storage.

Features:
---------
* Customizable Column Visibility: Show or hide any column in list views
* Persistent Storage: Preferences saved in browser localStorage
* Works Everywhere: Standard list views and one2many fields in form views
* Smart Storage: Stable storage keys prevent localStorage bloat
* Easy to Use: Simple dropdown menu with checkboxes
* No Configuration Required: Works out of the box

Usage:
------
1. Open any list view (e.g., Sales > Quotations)
2. Click the slider icon (⚙️) in the table header
3. Check/uncheck fields to show or hide columns
4. Your preferences are automatically saved and persist across sessions

Technical Details:
-----------------
* Storage key format: odoo12_lvfh:{model}:{view_id}
* Automatically migrates from old storage keys
* Includes cleanup mechanism to prevent localStorage bloat
    ''',
}


