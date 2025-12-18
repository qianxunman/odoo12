{
    "name": "Company Switch Session",
    "summary": "Per‑session / per‑tab company switcher without updating the user record",
    "description": """
Company Switch Session for Odoo 12
==================================

This module lets users switch their working company per browser tab/session
without changing the default company on the user (`res.users.company_id`).

Key points:
- Reuses the standard top-right company selector
- Stores the selected company in the HTTP session and browser storage
- Propagates the company through context (company_id, force_company, allowed_company_ids)
- Makes ORM queries and record rules use the company from the current page
""",
    "version": "12.0.1.0.0",
    "author": "qianxunman",
    "maintainer": "qianxunman",
    "website": "https://apps.odoo.com",
    "category": "Tools",
    "depends": ["web", "base"],
    "data": [
        "views/assets.xml",
    ],
    "qweb": [],
    "license": "OPL-1",
    "installable": True,
    "application": False,
    "price": 10.0,
    "currency": "USD",
}

