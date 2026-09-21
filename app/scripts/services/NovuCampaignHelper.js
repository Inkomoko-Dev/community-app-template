(function (module) {
    mifosX.services = _.extend(module, {
        NovuCampaignHelper: function () {
            function pad(value) {
                return value < 10 ? '0' + value : '' + value;
            }

            this.parseDate = function (value) {
                if (!value) {
                    return null;
                }
                if (value instanceof Date) {
                    return value;
                }
                if (typeof value === 'string') {
                    var parsed = new Date(value);
                    return isNaN(parsed.getTime()) ? null : parsed;
                }
                if (angular.isArray(value) && value.length >= 3) {
                    return new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0);
                }
                return null;
            };

            this.toIsoLocalDateTime = function (value) {
                var date = value instanceof Date ? value : this.parseDate(value);
                if (!date) {
                    return null;
                }
                return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' +
                    pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
            };

            this.parseJson = function (value) {
                if (!value) {
                    return null;
                }
                if (typeof value === 'object') {
                    return value;
                }
                try {
                    return angular.fromJson(value);
                } catch (e) {
                    return null;
                }
            };

            this.toArray = function (value) {
                if (!value) {
                    return [];
                }
                if (angular.isArray(value)) {
                    return value;
                }
                var items = [];
                angular.forEach(value, function (item, key) {
                    if (key !== '$promise' && key !== '$resolved' && key !== '$cancelRequest') {
                        items.push(item);
                    }
                });
                return items;
            };
        }
    });
    mifosX.ng.services.service('NovuCampaignHelper', [mifosX.services.NovuCampaignHelper]).run(function ($log) {
        $log.info('NovuCampaignHelper initialized');
    });
}(mifosX.services || {}));
