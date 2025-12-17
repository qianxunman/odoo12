{
    "name": "Company Switch Session",
    "summary": "Switch working company per session without updating the user record",
    "description": "Provide a session-scoped company switcher that keeps the user's default company unchanged and drives queries by the company selected in the current page.",
    "version": "12.0.1.0.0",
    "author": "Custom",
    "website": "https://example.com",
    "category": "Tools",
    "depends": ["web", "base"],
    "data": [
        "views/assets.xml",
    ],
    "qweb": [],
    "installable": True,
    "application": False,
}

