(function (module) {
    mifosX.directives = _.extend(module, {
        CkEditorDirective: function () {
            return {
                restrict: 'A',
                require: 'ngModel',
                link: function (scope, elm, attr, ngModel) {

                    if (typeof CKEDITOR === 'undefined' || !CKEDITOR.replace) {
                        ngModel.$render = function () {
                            elm.val(ngModel.$viewValue || '');
                        };
                        elm.on('change blur keyup', function () {
                            scope.$evalAsync(function () {
                                ngModel.$setViewValue(elm.val());
                            });
                        });
                        return;
                    }

                    CKEDITOR.config.versionCheck = false;

                    var ck = CKEDITOR.replace(elm[0], {versionCheck: false});

                    if (!ck) {
                        ngModel.$render = function () {
                            elm.val(ngModel.$viewValue || '');
                        };
                        elm.on('change blur keyup', function () {
                            scope.$evalAsync(function () {
                                ngModel.$setViewValue(elm.val());
                            });
                        });
                        return;
                    }

                    var sync = function () {
                        scope.$evalAsync(function () {
                            ngModel.$setViewValue(ck.getData());
                        });
                    };

                    ck.on('change', sync);
                    ck.on('blur', sync);
                    ck.on('insertElement', function () {
                        setTimeout(sync, 0);
                    });
                    ck.on('insertText', function () {
                        setTimeout(sync, 0);
                    });
                    ck.on('insertHtml', function () {
                        setTimeout(sync, 0);
                    });

                    ngModel.$render = function () {
                        ck.setData(ngModel.$viewValue || '');
                    };

                    scope.$on('$destroy', function () {
                        try {
                            ck.destroy();
                        } catch (e) {
                            ck = null;
                        }
                    });
                }
            };
        }
    });
}(mifosX.directives || {}));

mifosX.ng.application.directive("ckEditor", [mifosX.directives.CkEditorDirective]).run(function ($log) {
    $log.info("CkEditorDirective initialized");
});
