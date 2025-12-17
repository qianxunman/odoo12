from odoo import http
from odoo.http import request
from odoo.exceptions import AccessError


class CompanySwitchController(http.Controller):
    @http.route("/company_switch/set", type="json", auth="user")
    def set_company(self, company_id):
        """Persist the selected company in the user's session instead of writing on the user."""
        company = request.env["res.company"].browse(int(company_id)).exists()
        if not company:
            raise AccessError("Invalid company.")
        if company not in request.env.user.company_ids:
            raise AccessError("You cannot access this company.")

        # Update the session context so future requests run with the chosen company.
        ctx = dict(request.session.context or {})
        ctx.update({
            "company_id": company.id,
            "force_company": company.id,
            "allowed_company_ids": [company.id],
        })
        request.session.context = ctx
        request.session["company_id"] = company.id
        request.session["force_company"] = company.id
        request.session["allowed_company_ids"] = [company.id]
        request.session.modified = True
        request.context = ctx  # ensure current request also uses the new company

        return {"company_id": company.id, "company_name": company.name}

