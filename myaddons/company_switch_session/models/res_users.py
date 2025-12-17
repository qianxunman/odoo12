from odoo import api, models


class ResUsers(models.Model):
    _inherit = "res.users"

    @api.model
    def _get_company(self):
        """Use the session-selected company when provided in context."""
        force_company = self.env.context.get("force_company") or self.env.context.get("company_id")
        if force_company:
            company = self.env["res.company"].browse(force_company).exists()
            if company:
                return company
        return super(ResUsers, self)._get_company()

