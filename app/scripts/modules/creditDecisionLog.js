(function (root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.CreditDecisionLog = api;
})(typeof window !== 'undefined' ? window : global, function () {
    /*
     * Pure helpers for the decision log page: which filters are active, the query
     * sent to the server, and the numbers shown around the pager.
     */

    var PAGE_SIZES = [10, 25, 50, 100];
    var SORTS = ['date_desc', 'date_asc', 'score_desc', 'score_asc'];
    var OUTCOMES = ['', 'AUTO_APPROVE', 'IC_REVIEW_REQUIRED', 'INELIGIBLE', 'HELD', 'AWAITING', 'NONE'];

    function blank() {
        return {outcome: '', profileId: null, mode: '', search: '', reason: '', riskTier: '', modelVersion: '', from: '', to: '', sort: 'date_desc'};
    }

    function text(value) {
        return value === undefined || value === null ? '' : String(value).trim();
    }

    function day(value) {
        if (!value) {
            return '';
        }
        var d = value instanceof Date ? value : new Date(value);
        if (isNaN(d.getTime())) {
            return '';
        }
        function two(n) {
            return (n < 10 ? '0' : '') + n;
        }
        return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
    }

    // AUTO_APPROVE / IC_REVIEW_REQUIRED / INELIGIBLE / NONE filter the engine's answer; HELD and AWAITING filter how far the request got
    function query(filter, page, pageSize) {
        var f = filter || {};
        var q = {page: Math.max(1, parseInt(page, 10) || 1), pageSize: PAGE_SIZES.indexOf(pageSize) >= 0 ? pageSize : 25};
        var outcome = text(f.outcome);
        if (outcome === 'HELD' || outcome === 'AWAITING') {
            q.status = outcome;
        } else if (outcome) {
            q.decision = outcome;
        }
        if (f.profileId) {
            q.profileId = f.profileId;
        }
        ['mode', 'search', 'reason', 'riskTier', 'modelVersion'].forEach(function (key) {
            if (text(f[key])) {
                q[key] = text(f[key]);
            }
        });
        var from = day(f.from);
        var to = day(f.to);
        if (from) {
            q.from = from;
        }
        if (to) {
            q.to = to;
        }
        if (f.sort && SORTS.indexOf(f.sort) >= 0 && f.sort !== 'date_desc') {
            q.sort = f.sort;
        }
        return q;
    }

    // filters other than the outcome tab, which has its own highlight
    function activeCount(filter) {
        var f = filter || {};
        var n = 0;
        ['profileId', 'mode', 'search', 'reason', 'riskTier', 'modelVersion'].forEach(function (key) {
            if (text(f[key])) {
                n++;
            }
        });
        if (day(f.from) || day(f.to)) {
            n++;
        }
        return n;
    }

    function isFiltered(filter) {
        return activeCount(filter) > 0 || !!text((filter || {}).outcome);
    }

    // "26 - 50 of 137"
    function range(page, pageSize, total) {
        if (!total) {
            return {first: 0, last: 0, total: 0};
        }
        var first = (page - 1) * pageSize + 1;
        return {first: first, last: Math.min(page * pageSize, total), total: total};
    }

    // 1 ... 4 5 [6] 7 8 ... 20, never more than 7 slots, ellipsis as null
    function pages(page, totalPages) {
        var out = [];
        if (totalPages <= 7) {
            for (var i = 1; i <= totalPages; i++) {
                out.push(i);
            }
            return out;
        }
        var start = Math.max(2, Math.min(page - 1, totalPages - 4));
        var end = Math.min(totalPages - 1, Math.max(page + 1, 5));
        out.push(1);
        if (start > 2) {
            out.push(null);
        }
        for (var p = start; p <= end; p++) {
            out.push(p);
        }
        if (end < totalPages - 1) {
            out.push(null);
        }
        out.push(totalPages);
        return out;
    }

    function prettify(textValue) {
        if (!textValue) {
            return '';
        }
        try {
            return JSON.stringify(JSON.parse(textValue), null, 2);
        } catch (e) {
            return textValue;
        }
    }

    /*
     * The exception queue: what is wrong with each application, and what happens next. FAILED means the engine gave no
     * usable reply, HELD that details are missing, STUCK that a send began and never finished.
     */
    function exceptionNext(row) {
        var r = row || {};
        if (r.kind === 'HELD') {
            return {key: 'label.creditdecision.exceptions.next.held', at: null};
        }
        if (r.kind === 'STUCK') {
            return {key: 'label.creditdecision.exceptions.next.stuck', at: null};
        }
        if (r.nextRetryOn) {
            return {key: 'label.creditdecision.exceptions.next.scheduled', at: r.nextRetryOn};
        }
        if (r.alertedOn) {
            return {key: 'label.creditdecision.exceptions.next.alerted', at: r.alertedOn};
        }
        return {key: 'label.creditdecision.exceptions.next.manual', at: null};
    }

    function exceptionDot(row) {
        return row && row.kind === 'FAILED' ? 'nogo' : 'review';
    }

    return {
        exceptionNext: exceptionNext,
        exceptionDot: exceptionDot,
        PAGE_SIZES: PAGE_SIZES,
        SORTS: SORTS,
        OUTCOMES: OUTCOMES,
        blank: blank,
        query: query,
        activeCount: activeCount,
        isFiltered: isFiltered,
        range: range,
        pages: pages,
        prettify: prettify
    };
});
