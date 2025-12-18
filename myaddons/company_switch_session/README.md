# Company Switch Session

This module improves the multi-company experience in **Odoo 12** by allowing users to switch
their working company **per browser tab/session**, without changing the `res.users.company_id`
value stored in the database.

## Main Features

- **Session-based company switcher**
  - Reuses the standard top-right company selector.
  - The selected company is stored in the HTTP session and browser storage.
  - Each browser tab can use a different company at the same time.

- **No change on user default company**
  - The user record (`res.users.company_id`) is never written when switching company.
  - The effective company used by ORM, default values and record rules comes from the
    session/context (current page) instead of the database default.

- **Safer multi-company access**
  - The current company is propagated through `company_id`, `force_company` and
    `allowed_company_ids` in the context.
  - Record rules that depend on `user.company_id` are evaluated against the selected
    session company to restrict visible data accordingly.

## Usage

1. Install the module `company_switch_session`.
2. Log in as a multi-company user.
3. Use the standard company selector in the top bar to choose a company.
4. Open several browser tabs:
   - In each tab, select a different company.
   - Lists, forms and reports will use the company chosen in that tab without
     touching the user default company in the database.

## Demo Video

You can watch a quick feature demo on YouTube:  
[Company Switch Session Demo](https://youtu.be/Akl2YaZubeQ)

## Compatibility

- Tested on: **Odoo 12.0 Community/Enterprise**
- May require adaptation for other major versions.

## Author & Licensing

- **Author**: qianxunman  
- **Email**: hb.luojun@outlook.com  
- **Price**: 10 USD (apps.odoo.com)  

The module is intended to be published on `apps.odoo.com`. Make sure the license
field in the manifest matches your distribution policy (e.g. `OPL-1` or `LGPL-3`)
before releasing.


