(function (root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.CreditDecisionPolicy = api;
})(typeof window !== 'undefined' ? window : global, function () {
    /*
     * Pure helpers for the policy of a decision profile version: limits, knockout rules, risk cutoffs and scorecard
     * weights, set for everyone, per country (by currency) or per loan product. The server has the last word; these
     * checks only tell the person editing what will be refused before they ask.
     *
     * The edit state is {"GLOBAL|*": {maxDaysPastDue: "30", ...}, "COUNTRY|KES": {...}, "PRODUCT|12": {...}}. A blank
     * value means "not set here", so the setting comes from the wider scope.
     */

    var GLOBAL = 'GLOBAL', COUNTRY = 'COUNTRY', PRODUCT = 'PRODUCT', EVERYONE = '*';
    var WEIGHT_KEYS = ['weightInternalHistory', 'weightBureauHistory', 'weightBusinessFinancials', 'weightDemographics'];
    var MAX_SCORE = 1000;

    function id(scope, scopeKey) {
        return scope + '|' + (scope === GLOBAL ? EVERYONE : scopeKey);
    }

    function blank(value) {
        return value === undefined || value === null || String(value).trim() === '';
    }

    function number(value) {
        return blank(value) ? null : Number(String(value).trim());
    }

    function fromRules(rules) {
        var state = {};
        state[id(GLOBAL, EVERYONE)] = {};
        (rules || []).forEach(function (r) {
            var key = id(r.scope, String(r.scopeKey));
            state[key] = state[key] || {};
            state[key][r.key] = String(r.value);
        });
        return state;
    }

    function parts(scopeId) {
        var at = scopeId.indexOf('|');
        return {scope: scopeId.slice(0, at), scopeKey: scopeId.slice(at + 1)};
    }

    function order(scopeId) {
        var scope = parts(scopeId).scope;
        return scope === GLOBAL ? 0 : scope === COUNTRY ? 1 : 2;
    }

    // The values to send: only what is set, widest scope first, in the order of the catalogue.
    function toRules(state, catalogue) {
        var out = [];
        Object.keys(state || {}).sort(function (a, b) {
            return order(a) - order(b) || (a < b ? -1 : a > b ? 1 : 0);
        }).forEach(function (scopeId) {
            var p = parts(scopeId);
            (catalogue || []).forEach(function (def) {
                var raw = state[scopeId][def.key];
                if (!blank(raw)) {
                    out.push({scope: p.scope, scopeKey: p.scopeKey, key: def.key, value: Number(String(raw).trim())});
                }
            });
        });
        return out;
    }

    function weightSum(values) {
        var sum = 0, set = 0;
        WEIGHT_KEYS.forEach(function (key) {
            if (!blank((values || {})[key])) {
                sum += number(values[key]) || 0;
                set++;
            }
        });
        return {sum: sum, set: set, all: set === WEIGHT_KEYS.length, any: set > 0};
    }

    function defOf(catalogue, key) {
        for (var i = 0; i < (catalogue || []).length; i++) {
            if (catalogue[i].key === key) {
                return catalogue[i];
            }
        }
        return null;
    }

    function setIn(state, scopeId, key) {
        var raw = ((state || {})[scopeId] || {})[key];
        return blank(raw) ? null : number(raw);
    }

    // What a product or country gets for a setting when it does not set its own: its country's, else everyone's.
    function inherited(state, scope, scopeKey, key, currency) {
        if (scope === PRODUCT && currency) {
            var country = setIn(state, id(COUNTRY, String(currency).toUpperCase()), key);
            if (country !== null) {
                return {value: country, from: COUNTRY, scopeKey: String(currency).toUpperCase()};
            }
        }
        if (scope !== GLOBAL) {
            var everyone = setIn(state, id(GLOBAL, EVERYONE), key);
            if (everyone !== null) {
                return {value: everyone, from: GLOBAL, scopeKey: EVERYONE};
            }
        }
        return null;
    }

    function overrideCount(state, scope, scopeKey) {
        var values = (state || {})[id(scope, scopeKey)] || {};
        return Object.keys(values).filter(function (key) {
            return !blank(values[key]);
        }).length;
    }

    function clash(values) {
        var min = values.minLoanAmount, max = values.maxLoanAmount, medium = values.mediumRiskMinScore, low = values.lowRiskMinScore;
        if (min !== null && min !== undefined && max !== null && max !== undefined && min > max) {
            return 'order.amount';
        }
        if (medium !== null && medium !== undefined && low !== null && low !== undefined && medium >= low) {
            return 'order.tier';
        }
        return null;
    }

    function effectiveFor(state, catalogue, productId, currency) {
        var out = {};
        (catalogue || []).forEach(function (def) {
            var own = setIn(state, id(PRODUCT, String(productId)), def.key);
            if (own === null) {
                var inh = inherited(state, PRODUCT, String(productId), def.key, currency);
                own = inh ? inh.value : null;
            }
            out[def.key] = own;
        });
        return out;
    }

    /*
     * errors: {"<scopeId>|<key>": code, "weights|<scopeId>": code, "order|<scopeId>": code, "required|<key>": code, ...}
     * The codes are translated by the page as label.creditdecision.policy.error.<code>.
     */
    function validate(state, catalogue, productIds, currencyOf) {
        var errors = {};
        var sums = {};
        Object.keys(state || {}).forEach(function (scopeId) {
            var p = parts(scopeId);
            var values = state[scopeId];
            var numeric = {};
            (catalogue || []).forEach(function (def) {
                var raw = values[def.key];
                if (blank(raw)) {
                    return;
                }
                var n = Number(String(raw).trim());
                var where = scopeId + '|' + def.key;
                if (isNaN(n)) {
                    errors[where] = 'number';
                } else if (n < 0) {
                    errors[where] = 'negative';
                } else if (def.unit !== 'AMOUNT' && Math.floor(n) !== n) {
                    errors[where] = 'whole';
                } else if (def.unit === 'PERCENT' && n > 100) {
                    errors[where] = 'max100';
                } else if (def.unit === 'SCORE' && n > MAX_SCORE) {
                    errors[where] = 'maxScore';
                } else {
                    numeric[def.key] = n;
                }
            });
            if (p.scope === PRODUCT && (productIds || []).map(String).indexOf(p.scopeKey) < 0 && overrideCount(state, p.scope, p.scopeKey)) {
                errors['product|' + scopeId] = 'product.notcovered';
            }
            var w = weightSum(values);
            sums[scopeId] = w;
            if (w.any && !w.all) {
                errors['weights|' + scopeId] = 'weights.all';
            } else if (w.all && w.sum !== 100) {
                errors['weights|' + scopeId] = 'weights.sum';
            }
            var c = clash(numeric);
            if (c) {
                errors['order|' + scopeId] = c;
            }
        });
        // the knockout rules, cutoffs and weights must be set for everyone
        (catalogue || []).forEach(function (def) {
            if (def.starter !== null && def.starter !== undefined && setIn(state, id(GLOBAL, EVERYONE), def.key) === null &&
                !errors[id(GLOBAL, EVERYONE) + '|' + def.key]) {
                errors['required|' + def.key] = 'required';
            }
        });
        // a product's own and its country's settings must still make sense once they are combined
        (productIds || []).forEach(function (productId) {
            var c = clash(effectiveFor(state, catalogue, productId, currencyOf ? currencyOf(productId) : null));
            if (c && !errors['order|' + id(PRODUCT, String(productId))]) {
                errors['effective|' + productId] = c;
            }
        });
        return {errors: errors, sums: sums, ok: Object.keys(errors).length === 0};
    }

    // What a policy change comes to, for the person approving: one line per setting that was added, removed or changed.
    function diff(before, after) {
        var was = {}, is = {}, lines = [];
        (before || []).forEach(function (r) {
            was[id(r.scope, String(r.scopeKey)) + '|' + r.key] = r;
        });
        (after || []).forEach(function (r) {
            is[id(r.scope, String(r.scopeKey)) + '|' + r.key] = r;
        });
        var seen = {};
        (before || []).concat(after || []).forEach(function (r) {
            var where = id(r.scope, String(r.scopeKey)) + '|' + r.key;
            if (seen[where]) {
                return;
            }
            seen[where] = true;
            var a = was[where], b = is[where];
            if (a && !b) {
                lines.push({type: 'rem', scope: r.scope, scopeKey: String(r.scopeKey), key: r.key, from: String(a.value), to: null});
            } else if (!a && b) {
                lines.push({type: 'add', scope: r.scope, scopeKey: String(r.scopeKey), key: r.key, from: null, to: String(b.value)});
            } else if (Number(a.value) !== Number(b.value)) {
                lines.push({type: 'chg', scope: r.scope, scopeKey: String(r.scopeKey), key: r.key, from: String(a.value), to: String(b.value)});
            }
        });
        return lines;
    }

    return {
        GLOBAL: GLOBAL,
        COUNTRY: COUNTRY,
        PRODUCT: PRODUCT,
        EVERYONE: EVERYONE,
        WEIGHT_KEYS: WEIGHT_KEYS,
        MAX_SCORE: MAX_SCORE,
        id: id,
        parts: parts,
        fromRules: fromRules,
        toRules: toRules,
        weightSum: weightSum,
        inherited: inherited,
        overrideCount: overrideCount,
        defOf: defOf,
        validate: validate,
        diff: diff
    };
});
