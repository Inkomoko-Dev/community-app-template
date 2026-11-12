(function (root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.CreditDecisionRequest = api;
})(typeof window !== 'undefined' ? window : global, function () {
    /*
     * What a credit decision profile does, in code: it chooses WHICH data is sent to the decision engine.
     * Nothing here scores, weighs or decides. The decision engine replies with the decision and the screens
     * only display that reply.
     */
    var POLICIES = ['block', 'null', 'omit'];
    var FIELD_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

    /* Example customers used to preview the request a profile would produce. They are illustrations only. */
    var SAMPLES = [
        {
            id: 0, title: 'Repeat borrower, clean record', note: 'Cycle 4, no arrears, bureau report on file',
            customerId: '000884635', applicationId: 10231, product: 'Business loan - individual',
            values: {
                amount: 40000, term: 12, currency: 'KES', purpose: 'Stock purchase', channel: 'Mobile app', age: 38, tenure: 46,
                sector: 'Retail', kyc: 'VERIFIED', cycles: 4, dpd: 6, late: 1, arrears: 0, activeInt: 0, prev: 'CLOSED', wo: 'No',
                bscore: 688, blist: 'No', bactive: 1, bdate: '2026-10-21', ddDone: 'Yes', ddRes: 'PASSED'
            }
        },
        {
            id: 1, title: 'Late payer, bureau report missing', note: 'The bureau provider did not respond',
            customerId: '000771204', applicationId: 10232, product: 'Business loan - group',
            values: {
                amount: 85000, term: 18, currency: 'KES', purpose: 'Equipment', channel: 'Branch', age: 44, tenure: 20,
                sector: 'Transport', kyc: 'VERIFIED', cycles: 2, dpd: 48, late: 5, arrears: 3200, activeInt: 1, prev: 'CLOSED', wo: 'No',
                ddDone: 'Yes', ddRes: 'PASSED'
            }
        },
        {
            id: 2, title: 'New customer, thin file', note: 'First loan, due diligence completed',
            customerId: '000512987', applicationId: 10233, product: 'Business loan - individual',
            values: {
                amount: 15000, term: 6, currency: 'RWF', purpose: 'Working capital', channel: 'USSD', age: 29, tenure: 2,
                sector: 'Agriculture', kyc: 'VERIFIED', cycles: 0, arrears: 0, activeInt: 0, bscore: 612, blist: 'No', bactive: 2,
                bdate: '2026-11-02', ddDone: 'Yes', ddRes: 'PASSED'
            }
        },
        {
            id: 3, title: 'Listed by the bureau', note: 'Defaulter flag on the bureau report',
            customerId: '000330145', applicationId: 10234, product: 'Business loan - individual',
            values: {
                amount: 60000, term: 12, currency: 'KES', purpose: 'Stock purchase', channel: 'Mobile app', age: 51, tenure: 60,
                sector: 'Retail', kyc: 'VERIFIED', cycles: 3, dpd: 92, late: 7, arrears: 12800, activeInt: 1, prev: 'CLOSED', wo: 'Yes',
                bscore: 431, blist: 'Yes', bactive: 4, bdate: '2026-10-30', ddDone: 'Yes', ddRes: 'PASSED'
            }
        },
        {
            id: 4, title: 'Repeat borrower, minor delays', note: 'Two late payments, bureau score on the low side',
            customerId: '000620318', applicationId: 10235, product: 'Business loan - group',
            values: {
                amount: 50000, term: 12, currency: 'KES', purpose: 'Stock purchase', channel: 'Mobile app', age: 35, tenure: 30,
                sector: 'Food', kyc: 'VERIFIED', cycles: 3, dpd: 35, late: 3, arrears: 0, activeInt: 1, prev: 'CLOSED', wo: 'No',
                bscore: 596, blist: 'No', bactive: 2, bdate: '2026-10-25', ddDone: 'Yes', ddRes: 'PASSED'
            }
        }
    ];

    function isMissing(value) {
        return value === undefined || value === null || value === '';
    }

    function indexByKey(params) {
        var out = {};
        (params || []).forEach(function (p) {
            out[p.key] = p;
        });
        return out;
    }

    function sentCount(params) {
        return (params || []).filter(function (p) {
            return p.enabled;
        }).length;
    }

    /*
     * Build the request exactly as it would be sent for one example customer.
     * held: switched on, value missing, and the profile says to hold the request.
     * nulls: sent as "not available". omitted: left out.
     */
    function build(params, sample, profileLabel) {
        var parameters = {}, held = [], nulls = [], omitted = [];
        (params || []).filter(function (p) {
            return p.enabled;
        }).forEach(function (p) {
            var value = sample.values[p.key];
            if (isMissing(value)) {
                if (p.missingPolicy === 'block') {
                    held.push(p.key);
                } else if (p.missingPolicy === 'null') {
                    parameters[p.fieldName] = null;
                    nulls.push(p.key);
                } else {
                    omitted.push(p.key);
                }
            } else {
                parameters[p.fieldName] = value;
            }
        });
        return {
            held: held, nulls: nulls, omitted: omitted,
            payload: {
                requestId: 'req_' + (sample.applicationId * 7 + (profileLabel || '').length).toString(36),
                applicationId: sample.applicationId,
                customerId: sample.customerId,
                product: sample.product,
                profile: profileLabel,
                parameters: parameters
            }
        };
    }

    /* Problems that stop a version being submitted. Keyed by parameter key, or "params" / "products". */
    function validate(params, productIds) {
        var errors = {}, seen = {}, on = (params || []).filter(function (p) {
            return p.enabled;
        });
        on.forEach(function (p) {
            if (!FIELD_NAME.test(p.fieldName || '')) {
                errors[p.key] = 'invalid';
            } else if (seen[p.fieldName]) {
                errors[p.key] = 'duplicate';
                errors[seen[p.fieldName]] = 'duplicate';
            } else {
                seen[p.fieldName] = p.key;
            }
        });
        var count = Object.keys(errors).length;
        return {
            errors: errors,
            fieldProblems: count,
            noParams: on.length === 0,
            noProducts: !productIds || productIds.length === 0,
            ok: count === 0 && on.length > 0 && !!productIds && productIds.length > 0
        };
    }

    /*
     * What changed between two versions, for the person approving. Structured so the screen can word it in the
     * user's language: {type: add|rem|chg, kind: product|param|field|policy, key, from, to}.
     */
    function diff(before, after) {
        var out = [];
        var prevProducts = before.productIds || [], nextProducts = after.productIds || [];
        nextProducts.filter(function (id) {
            return prevProducts.indexOf(id) < 0;
        }).forEach(function (id) {
            out.push({type: 'add', kind: 'product', key: id});
        });
        prevProducts.filter(function (id) {
            return nextProducts.indexOf(id) < 0;
        }).forEach(function (id) {
            out.push({type: 'rem', kind: 'product', key: id});
        });
        var prev = indexByKey(before.params);
        (after.params || []).forEach(function (pb) {
            var pa = prev[pb.key];
            if (pb.enabled && !(pa && pa.enabled)) {
                out.push({type: 'add', kind: 'param', key: pb.key});
            } else if (!pb.enabled && pa && pa.enabled) {
                out.push({type: 'rem', kind: 'param', key: pb.key});
            } else if (pb.enabled && pa) {
                if (pa.fieldName !== pb.fieldName) {
                    out.push({type: 'chg', kind: 'field', key: pb.key, from: pa.fieldName, to: pb.fieldName});
                }
                if (pa.missingPolicy !== pb.missingPolicy) {
                    out.push({type: 'chg', kind: 'policy', key: pb.key, from: pa.missingPolicy, to: pb.missingPolicy});
                }
            }
        });
        return out;
    }

    /* Products grouped by currency, for the picker. */
    function groupByCurrency(products) {
        var order = [], groups = {};
        (products || []).forEach(function (p) {
            var code = p.currencyCode || '-';
            if (!groups[code]) {
                groups[code] = {currencyCode: code, products: []};
                order.push(code);
            }
            groups[code].products.push(p);
        });
        return order.map(function (code) {
            return groups[code];
        });
    }

    return {
        POLICIES: POLICIES,
        SAMPLES: SAMPLES,
        build: build,
        validate: validate,
        diff: diff,
        sentCount: sentCount,
        groupByCurrency: groupByCurrency
    };
});
