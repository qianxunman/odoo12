"""Monkey patch OpenERPSession.get_context to preserve forced company from session.

This ensures that a company chosen via our controller (stored in session) is
merged into the context returned to the client, so subsequent requests use the
selected company.
"""
import time
from types import SimpleNamespace

from odoo.http import OpenERPSession
from odoo.addons.base.models.ir_rule import IrRule

_original_get_context = OpenERPSession.get_context


def _patched_get_context(self):
    ctx = _original_get_context(self)
    forced = None
    try:
        forced = self.get("force_company") or self.get("company_id") or self.context.get("company_id")
    except Exception:
        forced = None
    if forced:
        ctx = dict(ctx or {})
        ctx["company_id"] = forced
        ctx["force_company"] = forced
        # honor explicit allowed_company_ids if already set in session
        if self.get("allowed_company_ids"):
            ctx["allowed_company_ids"] = self.get("allowed_company_ids")
        elif ctx.get("allowed_company_ids") is None:
            ctx["allowed_company_ids"] = [forced]
        self.context = ctx
    return ctx


OpenERPSession.get_context = _patched_get_context


# ---------------------------------------------------------------------------
# Monkey-patch ir.rule evaluation to honor allowed_company_ids in context.
# This keeps per-tab/per-session selected company isolated from user.company_ids.
# ---------------------------------------------------------------------------
_original_ir_rule_eval_context = IrRule._eval_context


def _patched_ir_rule_eval_context(self):
    base_ctx = self.env.context or {}
    allowed = base_ctx.get("allowed_company_ids")
    if not allowed:
        return _original_ir_rule_eval_context(self)

    user = self.env.user.with_context({})
    allowed_companies = self.env["res.company"].browse(allowed)

    # Lightweight proxy overriding company_ids only.
    def _first_company():
        return allowed_companies[:1] if hasattr(allowed_companies, '__getitem__') else allowed_companies and allowed_companies[0]

    proxy = SimpleNamespace(**{
        "company_ids": allowed_companies,
        "company_id": (allowed_companies and allowed_companies[0]) or False,
    })

    class UserProxy(object):
        def __init__(self, u, override):
            self._u = u
            self._override = override

        def __getattr__(self, name):
            if name in self._override:
                return self._override[name]
            return getattr(self._u, name)

    proxied_user = UserProxy(user, {"company_ids": allowed_companies, "company_id": proxy.company_id})
    return {"user": proxied_user, "time": time}


IrRule._eval_context = _patched_ir_rule_eval_context


# also ensure record rules cache takes allowed_company_ids into account
_original_compute_domain_keys = IrRule._compute_domain_keys


def _patched_compute_domain_keys(self):
    keys = list(_original_compute_domain_keys(self) or [])
    if "allowed_company_ids" not in keys:
        keys.append("allowed_company_ids")
    return keys


IrRule._compute_domain_keys = _patched_compute_domain_keys

