(function (module) {
    mifosX.directives = _.extend(module, {
        ApiValidationDirective: function ($compile) {
            return {
                restrict: 'E',
                require: '?ngmodel',
                link: function (scope, elm, attr, ctrl) {
                    var template = '<div uib-alert type="danger" ng-show="errorStatus || errorDetails.length > 0">' +
                        '<label ng-show="errorStatus"><i class="fa fa-exclamation-circle"></i> {{errorStatus}}</label>' +
                        '<div ng-repeat="errorArray in errorDetails">' +
                        '<div ng-repeat="error in errorArray">' +
                            '<label ng-hide="errorStatus">' +
                                '<i class="fa fa-exclamation-circle"></i>&nbsp;' +
                                '<span ng-show="error.field">{{error.field | translate}}: </span>' +
                                '{{error.code | translate:error.args}}' +
                                '<span ng-show="error.datatable"> - {{error.datatable}}</span>' +
                            '</label>' +
                        '</div></div></div>';
                    elm.html('').append($compile(template)(scope));
                }
            };
        }
    });
}(mifosX.directives || {}));

mifosX.ng.application.directive("apiValidate", ['$compile', mifosX.directives.ApiValidationDirective]).run(function ($log) {
    $log.info("ApiValidationDirective initialized");
});