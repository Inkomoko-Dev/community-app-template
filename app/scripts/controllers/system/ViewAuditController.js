(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewAuditController: function (scope, resourceFactory, routeParams) {
            scope.details = {};

            function formatDisplayValue(value, field) {
                if (value === null || value === undefined) {
                    return '';
                }
                if (field === 'effectiveFrom' && _.isArray(value) && value.length === 3
                        && value.every(function (part) { return Number.isInteger(part); })) {
                    return value[0] + '-' + ('0' + value[1]).slice(-2) + '-' + ('0' + value[2]).slice(-2);
                }
                if (typeof value === 'object') {
                    return JSON.stringify(value);
                }
                return String(value);
            }

            function valuesDiffer(before, after) {
                if (before === after) {
                    return false;
                }
                if (before === null || before === undefined || after === null || after === undefined) {
                    return before !== after;
                }
                if (typeof before === 'object' || typeof after === 'object') {
                    return JSON.stringify(before) !== JSON.stringify(after);
                }
                return String(before) !== String(after);
            }

            function flattenAuditJson(obj, prefix) {
                var rows = [];
                _.each(obj, function (value, key) {
                    var name = prefix ? prefix + '.' + key : key;
                    if (!prefix && key === 'criteria' && value && typeof value === 'object'
                            && Object.keys(value).every(function (side) { return side === 'before' || side === 'after'; })
                            && ((value.before == null && value.after) || (value.after == null && value.before))) {
                        var snapshot = value.before || value.after;
                        _.each(snapshot, function (fieldValue, field) {
                            var displayValue = formatDisplayValue(fieldValue, field);
                            rows.push({
                                name: name + '.' + field,
                                before: value.before ? displayValue : '',
                                after: value.after ? displayValue : '',
                                isChange: true
                            });
                        });
                    } else if (value && typeof value === 'object' && value.hasOwnProperty('before') && value.hasOwnProperty('after')
                            && Object.keys(value).length === 2) {
                        if (valuesDiffer(value.before, value.after)) {
                            rows.push({
                                name: name,
                                before: formatDisplayValue(value.before, key),
                                after: formatDisplayValue(value.after, key),
                                isChange: true
                            });
                        }
                    } else if (value && typeof value === 'object' && !_.isArray(value)) {
                        rows = rows.concat(flattenAuditJson(value, name));
                    } else {
                        rows.push({
                            name: name,
                            property: formatDisplayValue(value),
                            isChange: false
                        });
                    }
                });
                return rows;
            }

            resourceFactory.auditResource.get({templateResource: routeParams.id}, function (data) {
                scope.details = data;
                scope.commandAsJson = data.commandAsJson;
                var obj = JSON.parse(scope.commandAsJson);
                scope.jsondata = flattenAuditJson(obj);
            });
        }
    });
    mifosX.ng.application.controller('ViewAuditController', ['$scope', 'ResourceFactory', '$routeParams', mifosX.controllers.ViewAuditController]).run(function ($log) {
        $log.info("ViewAuditController initialized");
    });
}(mifosX.controllers || {}));
