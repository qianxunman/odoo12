odoo.define('company_switch_session.SwitchCompanyMenu', function (require) {
"use strict";

var $ = require('jquery');
var SwitchCompanyMenu = require('web.SwitchCompanyMenu');
var session = require('web.session');

// Per-tab identifier so each browser tab can keep its own selected company.
var TAB_KEY = 'odoo.company_switch.tab_id';
var TAB_COMPANY_KEY = 'odoo.company_switch.company_id';
function getTabId() {
    var tabId = null;
    try {
        tabId = window.sessionStorage.getItem(TAB_KEY);
        if (!tabId) {
            tabId = Date.now().toString() + ':' + Math.random().toString(16).slice(2);
            window.sessionStorage.setItem(TAB_KEY, tabId);
        }
    } catch (e) {
        // ignore storage errors
    }
    return tabId || 'default-tab';
}
var TAB_ID = getTabId();

function getStoredCompanyId() {
    try {
        return window.sessionStorage.getItem(TAB_COMPANY_KEY);
    } catch (e) {
        return null;
    }
}

function setStoredCompanyId(companyId) {
    try {
        window.sessionStorage.setItem(TAB_COMPANY_KEY, companyId);
        // Clear old global value to avoid cross-tab leakage.
        window.localStorage.removeItem('odoo.company_switch.company_id');
    } catch (e) {
        // ignore storage errors
    }
}

/**
 * Apply stored company (from localStorage) on first load to mimic Odoo 17 behavior.
 * We compare against session.user_context/company_id to avoid depending on user_companies.
 */
(function applyStoredCompanyOnce() {
    var storedCompanyId = getStoredCompanyId();
    console.log('[company_switch] boot: tab=', TAB_ID, ' storedCompanyId=', storedCompanyId);
    if (!storedCompanyId) {
        return;
    }
    var currentCompanyId = (session.user_context && session.user_context.company_id) || (session.user_companies && session.user_companies.current_company && session.user_companies.current_company[0]);
    console.log('[company_switch] boot: currentCompanyId=', currentCompanyId);
    if (String(storedCompanyId) === String(currentCompanyId || '')) {
        console.log('[company_switch] boot: stored == current, nothing to do');
        return;
    }
    // prevent infinite reload loop: only apply once per page load
    var guard = window.__company_switch_applying;
    if (guard) {
        console.warn('[company_switch] boot: apply guard active, skip to avoid loop');
        return;
    }
    window.__company_switch_applying = true;

    session.rpc('/company_switch/set', {company_id: storedCompanyId}).then(function () {
        console.log('[company_switch] boot: applied stored company', storedCompanyId);
        window.location.reload();
    }).fail(function (err) {
        console.warn('[company_switch] boot: rpc failed', err);
        window.__company_switch_applying = false;
    });
})();

SwitchCompanyMenu.include({
    /**
     * Override default behavior to store the choice in session context instead of writing on the user.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClick: function (ev) {
        ev.preventDefault();
        var companyID = $(ev.currentTarget).data('company-id');
        var companyName = $(ev.currentTarget).text().trim();

        // Per-tab persistence (sessionStorage) so different tabs can have different companies.
        setStoredCompanyId(companyID);
        console.log('[company_switch] click: tab=', TAB_ID, ' set company_id=', companyID, 'name=', companyName);

        session.rpc('/company_switch/set', {company_id: companyID})
            .then(function () {
                console.log('[company_switch] click: rpc ok, refreshing');
                session.user_context.company_id = companyID;
                session.user_context.force_company = companyID;
                session.user_context.allowed_company_ids = [companyID];
                if (session.user_companies) {
                    session.user_companies.current_company = [companyID, companyName];
                }
                window.location.reload();
            }).fail(function (err) {
                console.warn('[company_switch] click: rpc failed', err);
            });
    },
});

/**
 * On boot, if a company_id is stored in localStorage and differs from the
 * current session company, apply it once and reload. We guard with sessionStorage
 * to avoid infinite reload loops.
 */
if (session.user_companies) {
    var storedCompanyId = null;
    try {
        storedCompanyId = window.localStorage.getItem('odoo.company_switch.company_id');
    } catch (e) {
        // ignore storage errors
    }
    var appliedKey = 'odoo.company_switch.applied';
    var currentCompanyId = session.user_companies.current_company && session.user_companies.current_company[0];
    if (storedCompanyId && storedCompanyId !== String(currentCompanyId)) {
        var alreadyApplied = false;
        try {
            alreadyApplied = window.sessionStorage.getItem(appliedKey) === storedCompanyId;
        } catch (e) {
            // ignore
        }
        if (!alreadyApplied) {
            session.rpc('/company_switch/set', {company_id: storedCompanyId}).then(function () {
                try {
                    window.sessionStorage.setItem(appliedKey, storedCompanyId);
                } catch (e) {
                    // ignore
                }
                window.location.reload();
            });
        }
    } else {
        // clean guard when stored matches current so future changes can be applied
        try {
            window.sessionStorage.removeItem(appliedKey);
        } catch (e) {
            // ignore
        }
    }
}

});

