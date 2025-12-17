from odoo import models
from odoo.http import request


class Http(models.AbstractModel):
    _inherit = "ir.http"

    def session_info(self):
        """Expose the session-selected company to the web client without altering the user record."""
        info = super(Http, self).session_info()
        if not request or not request.session:
            return info

        company_id = request.session.context.get("force_company") or request.session.context.get("company_id")
        if company_id:
            company = self.env["res.company"].browse(company_id).exists()
            if company:
                info["company_id"] = company.id
                if info.get("user_context") is not None:
                    info["user_context"]["company_id"] = company.id
                    info["user_context"]["force_company"] = company.id
                    info["user_context"]["allowed_company_ids"] = request.session.context.get("allowed_company_ids") or [company.id]
                if info.get("user_companies"):
                    info["user_companies"]["current_company"] = (company.id, company.name)
        return info

