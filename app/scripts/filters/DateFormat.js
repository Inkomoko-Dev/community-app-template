(function (module) {
    mifosX.filters = _.extend(module, {
        DateFormat: function (dateFilter, localStorageService) {
            return function (input) {
                if (input) {
                    var tDate;
                    if (angular.isArray(input)) {
                        if (input.length >= 6) {
                            tDate = new Date(input[0], input[1] - 1, input[2], input[3] || 0, input[4] || 0, input[5] || 0);
                        } else if (input.length >= 3) {
                            tDate = new Date(input[0], input[1] - 1, input[2]);
                        }
                    } else {
                        tDate = new Date(input);
                    }
                    if (!tDate || isNaN(tDate.getTime())) {
                        return '';
                    }
                    return dateFilter(tDate, localStorageService.getFromLocalStorage('dateformat'));
                }
                return '';
            }
        }
    });
    mifosX.ng.application.filter('DateFormat', ['dateFilter', 'localStorageService', mifosX.filters.DateFormat]).run(function ($log) {
        $log.info("DateFormat filter initialized");
    });
}(mifosX.filters || {}));
