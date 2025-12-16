{
    'name': 'List View Field Hidden',
    'summary': 'Allow users to hide/show columns in list views and remember preferences per browser',
    'version': '12.0.1.0.0',
    'author': 'qianxunman',
    'website': '',
    'license': 'OPL-1',
    'category': 'Tools',
    'depends': ['web'],
    'data': [
        'views/assets.xml',
    ],
    'qweb': [
        'static/src/xml/list_view_field_hidden.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}


