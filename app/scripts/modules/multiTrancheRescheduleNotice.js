(function (root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.MultiTrancheRescheduleNotice = api;
})(typeof window !== 'undefined' ? window : global, function () {
    function asDate(value) {
        if (!value) {
            return null;
        }
        if (Object.prototype.toString.call(value) === '[object Date]') {
            return value;
        }
        if (Object.prototype.toString.call(value) === '[object Array]' && value.length >= 3) {
            return new Date(value[0], value[1] - 1, value[2]);
        }
        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    function dayNumber(value) {
        var date = asDate(value);
        if (!date) {
            return null;
        }
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    }

    function amount(value) {
        var number = Number(value);
        return isFinite(number) ? number : 0;
    }

    function assess(loan, rescheduleFromDate) {
        if (!loan || !loan.multiDisburseLoan) {
            return null;
        }
        var details = loan.disbursementDetails || [];
        var disbursedCount = 0;
        var pendingCount = 0;
        var disbursedPrincipal = 0;
        var pendingPrincipal = 0;
        var latest = null;
        var i;
        for (i = 0; i < details.length; i++) {
            var detail = details[i];
            if (!detail) {
                continue;
            }
            var principal = amount(detail.principal);
            if (detail.actualDisbursementDate) {
                disbursedCount++;
                disbursedPrincipal += principal;
                var disbursedOn = dayNumber(detail.actualDisbursementDate);
                if (disbursedOn !== null && (latest === null || disbursedOn > latest)) {
                    latest = disbursedOn;
                }
            } else {
                pendingCount++;
                pendingPrincipal += principal;
            }
        }
        var from = dayNumber(rescheduleFromDate);
        var nothingDisbursed = disbursedCount === 0 && pendingCount > 0;
        return {
            disbursedCount: disbursedCount,
            disbursedPrincipal: disbursedPrincipal,
            pendingCount: pendingCount,
            pendingPrincipal: pendingPrincipal,
            latestDisbursementLabel: latest === null ? '' : new Date(latest).toDateString(),
            includesLaterDisbursement: disbursedCount > 1 && from !== null && latest !== null && from <= latest,
            nothingDisbursed: nothingDisbursed
        };
    }

    function lines(notice, translate) {
        if (!notice || notice.nothingDisbursed) {
            return [];
        }
        var text = typeof translate === 'function' ? translate : function (key) {
            return key;
        };
        var result = [text('label.warning.multitranche.reschedule.disbursed', {
            count: notice.disbursedCount,
            amount: notice.disbursedPrincipal
        })];
        if (notice.disbursedCount > 1) {
            result.push(text('label.warning.multitranche.reschedule.later.disbursed'));
        }
        if (notice.includesLaterDisbursement) {
            result.push(text('label.warning.multitranche.reschedule.later.folded', {
                date: notice.latestDisbursementLabel
            }));
        }
        if (notice.pendingCount > 0) {
            result.push(text('label.warning.multitranche.reschedule.pending', {
                count: notice.pendingCount,
                amount: notice.pendingPrincipal
            }));
        } else {
            result.push(text('label.warning.multitranche.reschedule.future.disbursement'));
        }
        return result;
    }

    return {
        assess: assess,
        lines: lines
    };
});
