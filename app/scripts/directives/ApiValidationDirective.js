(function (module) {
    mifosX.directives = _.extend(module, {
        ApiValidationDirective: function ($compile, $rootScope, $injector) {
            return {
                restrict: 'E',
                scope: {},
                link: function (scope, element) {
                    var template = '<div class="alert alert-danger api-error-banner" role="alert" aria-live="assertive" ng-if="visible">' +
                        '<button type="button" class="close" ng-click="dismiss($event)" aria-label="{{dismissLabel}}">' +
                        '<span aria-hidden="true">&times;</span></button>' +
                        '<div ng-if="statusMessage"><i class="fa fa-exclamation-circle"></i> {{statusMessage}}</div>' +
                        '<div ng-repeat="error in apiErrors track by $index">' +
                        '<i class="fa fa-exclamation-circle"></i> ' +
                        '<span ng-if="error.fieldLabel">{{error.fieldLabel}}: </span>' +
                        '{{error.message}}' +
                        '<span ng-if="error.datatable && error.message.indexOf(error.datatable) === -1"> - {{error.datatable}}</span>' +
                        '</div></div>';
                    scope.apiErrors = [];
                    scope.visible = false;
                    scope.dismissLabel = 'Close';

                    function translateCode(code, params) {
                        try {
                            var $translate = $injector.get('$translate');
                            var translated = $translate.instant(code, params || {});
                            if (!translated || translated === code) {
                                return null;
                            }
                            return translated;
                        } catch (ignore) {
                            return null;
                        }
                    }

                    function readParent(name) {
                        var parent = scope.$parent;
                        if (!parent || parent[name] === undefined || parent[name] === null || parent[name] === '') {
                            return null;
                        }
                        if (name === 'errorDetails' && (!parent.errorDetails || !parent.errorDetails.length)) {
                            return null;
                        }
                        return parent[name];
                    }

                    function ensureInlineStyle() {
                        if (typeof document === 'undefined') {
                            return;
                        }
                        var style = document.getElementById('api-validation-error-style');
                        if (!style) {
                            style = document.createElement('style');
                            style.id = 'api-validation-error-style';
                            document.head.appendChild(style);
                        }
                        style.textContent = 'api-validate{display:block;}' +
                            '.api-error-banner{position:relative;overflow:hidden;padding-right:36px;}' +
                            '.api-error-banner>.close{float:none;position:absolute;top:8px;right:12px;}' +
                            '.api-validation-error{border-color:#a94442 !important;}' +
                            '.api-field-error{color:#a94442;display:block;margin-top:4px;}';
                    }

                    function renderInline(errors) {
                        if (typeof $ === 'undefined') {
                            return;
                        }
                        var signature = JSON.stringify(errors || []);
                        if ($rootScope._apiInlineSignature === signature) {
                            return;
                        }
                        $rootScope._apiInlineSignature = signature;
                        $('.api-field-error').remove();
                        $('.api-validation-error').removeClass('api-validation-error validationerror');
                        if (!errors || !errors.length) {
                            return;
                        }
                        ensureInlineStyle();
                        for (var i = 0; i < errors.length; i++) {
                            var error = errors[i];
                            if (!error.field) {
                                continue;
                            }
                            var $field = $();
                            if (/^[A-Za-z0-9_-]+$/.test(error.field)) {
                                $field = $('#' + error.field);
                                if (!$field.length) {
                                    $field = $('.' + error.field).first();
                                }
                            }
                            if (!$field.length) {
                                continue;
                            }
                            $field.addClass('validationerror api-validation-error');
                            $('<small class="help-block api-field-error" role="alert"></small>')
                                .text(error.message)
                                .insertAfter($field);
                        }
                    }

                    function refresh() {
                        var status = readParent('errorStatus');
                        if (!status) {
                            status = $rootScope.errorStatus;
                        }
                        var details = readParent('errorDetails') || $rootScope.errorDetails;
                        var api = (typeof ApiErrorMessage !== 'undefined') ? ApiErrorMessage : null;
                        scope.apiErrors = api ? api.normalizeErrors(details, translateCode) : [];
                        if (status && typeof status === 'string' && status.indexOf(' ') === -1 && status.indexOf('.') > 0) {
                            scope.statusMessage = translateCode(status) || status;
                        } else {
                            scope.statusMessage = status || null;
                        }
                        scope.visible = !!(scope.statusMessage || scope.apiErrors.length);
                        var closeLabel = translateCode('label.button.close');
                        scope.dismissLabel = closeLabel || 'Close';
                        renderInline(scope.apiErrors);
                    }

                    function clearOwnedErrors(start) {
                        var cursor = start;
                        while (cursor) {
                            if (Object.prototype.hasOwnProperty.call(cursor, 'errorDetails')) {
                                cursor.errorDetails = [];
                            }
                            if (Object.prototype.hasOwnProperty.call(cursor, 'errorStatus')) {
                                cursor.errorStatus = null;
                            }
                            cursor = cursor.$parent;
                        }
                    }

                    function hideBanner() {
                        scope.apiErrors = [];
                        scope.statusMessage = null;
                        scope.visible = false;
                        renderInline([]);
                    }

                    scope.dismiss = function ($event) {
                        if ($event && $event.preventDefault) {
                            $event.preventDefault();
                            $event.stopPropagation();
                        }
                        clearOwnedErrors(scope.$parent);
                        if ($rootScope.dismissUserErrors) {
                            $rootScope.dismissUserErrors();
                        } else {
                            $rootScope.errorStatus = null;
                            $rootScope.errorDetails = [];
                            $rootScope._apiInlineSignature = '';
                        }
                        $rootScope.$broadcast('cbs-dismiss-user-errors');
                    };

                    scope.$on('cbs-dismiss-user-errors', function () {
                        clearOwnedErrors(scope.$parent);
                        hideBanner();
                    });

                    scope.$watch(function () {
                        return JSON.stringify({
                            status: readParent('errorStatus') || $rootScope.errorStatus || null,
                            details: readParent('errorDetails') || $rootScope.errorDetails || []
                        });
                    }, refresh);

                    element.css('display', 'block');
                    ensureInlineStyle();
                    element.html('').append($compile(template)(scope));
                    refresh();
                require: '?ngmodel',
                link: function (scope, elm, attr, ctrl) {
                    var template = '<div uib-alert type="danger" ng-show="errorStatus || errorDetails.length > 0">' +
                        '<label ng-show="errorStatus"><i class="fa fa-exclamation-circle"></i> {{errorStatus}}</label>' +
                        '<div ng-repeat="errorArray in errorDetails">' +
                        '<div ng-repeat="error in errorArray">' +
                            '<label ng-hide="errorStatus">' +
                                '<i class="fa fa-exclamation-circle"></i>&nbsp;' +
                                '<span ng-show="error.field">{{error.field | translate}}: </span>' +
                                '<span ng-if="error.userMessage">{{error.userMessage}}</span>' +
                                '<span ng-if="!error.userMessage">{{error.code | translate:error.args}}</span>' +
                                '<span ng-show="error.datatable"> - {{error.datatable}}</span>' +
                            '</label>' +
                        '</div></div></div>';
                    elm.html('').append($compile(template)(scope));
                }
            };
        }
    });
}(mifosX.directives || {}));

mifosX.ng.application.directive("apiValidate", ['$compile', '$rootScope', '$injector', mifosX.directives.ApiValidationDirective]).run(function ($log) {
    $log.info("ApiValidationDirective initialized");
});
