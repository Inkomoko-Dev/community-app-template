(function (module) {
    mifosX.directives = _.extend(module, {
        ApiValidationDirective: function ($compile, $rootScope, $injector) {
            return {
                restrict: 'E',
                scope: {},
                link: function (scope, element) {
                    var template = '<div class="alert alert-danger" role="alert" aria-live="assertive" ng-show="visible">' +
                        '<button type="button" class="close" ng-click="dismiss()" aria-label="{{dismissLabel}}">' +
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
                        if (typeof document === 'undefined' || document.getElementById('api-validation-error-style')) {
                            return;
                        }
                        var style = document.createElement('style');
                        style.id = 'api-validation-error-style';
                        style.textContent = '.api-validation-error{border-color:#a94442 !important;}' +
                            '.api-field-error{color:#a94442;display:block;margin-top:4px;}';
                        document.head.appendChild(style);
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

                    scope.dismiss = function () {
                        if (scope.$parent) {
                            if (scope.$parent.errorDetails) {
                                scope.$parent.errorDetails = [];
                            }
                            if (scope.$parent.errorStatus) {
                                scope.$parent.errorStatus = null;
                            }
                        }
                        if ($rootScope.dismissUserErrors) {
                            $rootScope.dismissUserErrors();
                        } else {
                            $rootScope.errorStatus = null;
                            $rootScope.errorDetails = [];
                        }
                        refresh();
                    };

                    scope.$watch(function () {
                        return JSON.stringify({
                            status: readParent('errorStatus') || $rootScope.errorStatus || null,
                            details: readParent('errorDetails') || $rootScope.errorDetails || []
                        });
                    }, refresh);

                    element.html('').append($compile(template)(scope));
                    refresh();
                }
            };
        }
    });
}(mifosX.directives || {}));

mifosX.ng.application.directive("apiValidate", ['$compile', '$rootScope', '$injector', mifosX.directives.ApiValidationDirective]).run(function ($log) {
    $log.info("ApiValidationDirective initialized");
});
