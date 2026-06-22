(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewAuditController: function (scope, resourceFactory, routeParams) {
            scope.details = {};

            function formatDisplayValue(value) {
                if (value === null || value === undefined) {
                    return '';
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
                    if (value && typeof value === 'object' && value.hasOwnProperty('before') && value.hasOwnProperty('after')
                            && Object.keys(value).length === 2) {
                        if (valuesDiffer(value.before, value.after)) {
                            rows.push({
                                name: name,
                                before: formatDisplayValue(value.before),
                                after: formatDisplayValue(value.after),
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
